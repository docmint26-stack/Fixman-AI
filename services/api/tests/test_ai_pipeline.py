"""End-to-end tests for the FixMind AI diagnosis pipeline (mock provider)."""
import asyncio
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select

from app.api import routes
from app.core.config import get_settings
from app.core.exceptions import APIError
from app.db.models import AIRun, Fix, OutcomeIntelligence
from app.db.session import Session
from app.services.ai.provider import generate_deterministic_embedding

TERMINAL = ("completed", "failed", "unavailable")


async def _wait_for_terminal(client, diagnosis_id: str, attempts: int = 40) -> dict:
    status = None
    for _ in range(attempts):
        resp = await client.get(f"/api/v1/diagnoses/{diagnosis_id}/status")
        assert resp.status_code == 200, resp.text
        status = resp.json()
        if status["status"] in TERMINAL:
            return status
        await asyncio.sleep(0.05)
    return status


async def test_mock_pipeline_completes_with_recommendations_and_audit(api, alice, monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    api.set_identity(alice)
    case = await api.create_case(
        title="Next.js hydration mismatch",
        description="Text content did not match server-rendered HTML on first paint.",
        category="Coding Error",
    )
    evidence = await api.client.post(
        f"/api/v1/cases/{case['id']}/evidence",
        data={"evidence_type": "log", "text_content": "2026-09-17T10:00:00Z ERROR hydration mismatch\npassword=SuperSecret123"},
    )
    assert evidence.status_code == 201, evidence.text

    resp = await api.client.post(f"/api/v1/cases/{case['id']}/diagnose")
    assert resp.status_code == 201, resp.text
    run = resp.json()
    assert run["status"] in ("pending", "completed")

    status = await _wait_for_terminal(api.client, run["id"])
    assert status["status"] == "completed"
    assert status["stage"] == "COMPLETED"
    assert status["stage_percent"] == 100
    assert status["confidence"] is not None and status["confidence"] > 0

    detail = (await api.client.get(f"/api/v1/diagnoses/{run['id']}")).json()
    assert detail["analysis_metadata"]["stage"] == "COMPLETED"
    assert "confidence_breakdown" in detail["analysis_metadata"]
    assert detail["problem_summary"]
    assert detail["analysis_metadata"]["ranking_rationale"]

    recommendations = (await api.client.get(f"/api/v1/diagnoses/{run['id']}/recommendations")).json()
    assert recommendations
    top = recommendations[0]
    assert top["rank"] == 1
    assert top["trust_label"] in ("Outcome-Backed Fix", "Official Guidance", "Curated Fix", "AI Suggestion")
    assert top["statistical_status"] == "Not enough verified outcomes yet"
    assert top["fix"]["title"]
    assert "sample_size" in top
    assert top["why_it_matches"]

    sources = (await api.client.get(f"/api/v1/diagnoses/{run['id']}/sources")).json()
    assert isinstance(sources, list)

    case_detail = (await api.client.get(f"/api/v1/cases/{case['id']}")).json()
    assert case_detail["status"] == "suggested"
    assert case_detail["current_diagnosis_id"] == run["id"]

    async with Session() as db:
        runs = (await db.scalars(select(AIRun).where(AIRun.case_id == case["id"]))).all()
        task_types = {record.task_type for record in runs}
        assert "diagnosis" in task_types
        assert "fix_ranking" in task_types
        assert all(record.status == "completed" for record in runs)
        assert any(record.cost_usd is not None for record in runs)


async def test_pipeline_grounds_on_verified_similar_cases(api, alice, monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    api.set_identity(alice)
    fix_id = str(uuid4())
    async with Session() as db:
        db.add(Fix(
            id=fix_id,
            title="Stabilize hydration state",
            summary="summary",
            instructions=["step"],
            category="Coding Error",
            source_type="curated",
            success_count=7,
            failure_count=0,
        ))
        db.add(OutcomeIntelligence(
            id=str(uuid4()),
            fix_id=fix_id,
            normalized_context={},
            category="Coding Error",
            software="Next.js",
            os="Windows 11",
            error_family="React / Next.js",
            result="resolved",
            verification_strength="strong",
            confidence=Decimal("0.90"),
            embedding=generate_deterministic_embedding("next.js hydration mismatch server-rendered html"),
        ))
        await db.commit()

    case = await api.create_case(
        title="Next.js hydration mismatch",
        description="Text content did not match server-rendered HTML on first paint.",
        category="Coding Error",
        software_name="Next.js",
        operating_system="Windows 11",
    )
    resp = await api.client.post(f"/api/v1/cases/{case['id']}/diagnose")
    run_id = resp.json()["id"]
    await _wait_for_terminal(api.client, run_id)

    run = (await api.client.get(f"/api/v1/diagnoses/{run_id}")).json()
    assert run["similar_case_count"] >= 1
    assert run["analysis_metadata"]["similar_cases_matched"] >= 1


class _FailingProvider:
    async def generate_embedding(self, text: str) -> list[float]:
        return generate_deterministic_embedding(text)

    async def batch_generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        return [generate_deterministic_embedding(text) for text in texts]

    async def analyze_problem(self, **kwargs) -> None:
        raise APIError(502, "AI_PROVIDER_ERROR", "provider exploded during analysis")


async def test_pipeline_provider_failure_records_failed_run_and_audit(api, alice, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_provider", "openai")
    monkeypatch.setattr(settings, "ai_api_key", "test-key")
    monkeypatch.setattr(routes, "get_ai_provider", lambda *args, **kwargs: _FailingProvider())
    api.set_identity(alice)
    case = await api.create_case(category="Coding Error")

    resp = await api.client.post(f"/api/v1/cases/{case['id']}/diagnose")
    assert resp.status_code == 201, resp.text
    run_id = resp.json()["id"]

    status = await _wait_for_terminal(api.client, run_id)
    assert status["status"] == "failed"
    assert status["error"]["code"] == "AI_PROVIDER_ERROR"

    async with Session() as db:
        failed_runs = (await db.scalars(
            select(AIRun).where(AIRun.case_id == case["id"], AIRun.status == "failed")
        )).all()
        assert failed_runs
        assert failed_runs[0].error_code == "AI_PROVIDER_ERROR"

    case_detail = (await api.client.get(f"/api/v1/cases/{case['id']}")).json()
    assert case_detail["status"] == "needs_review"
    recommendations = await api.client.get(f"/api/v1/diagnoses/{run_id}/recommendations")
    assert recommendations.json() == []
