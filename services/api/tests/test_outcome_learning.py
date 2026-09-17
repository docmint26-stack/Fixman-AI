from sqlalchemy import func, select

from app.core.config import get_settings
from app.db.models import Case, Fix, OutcomeIntelligence
from app.db.session import Session
from app.services.retrieval.similar_cases import SimilarCaseRetriever


async def test_hydration_outcome_learns_and_is_idempotent(api, alice, monkeypatch):
    api.set_identity(alice)
    scenario = await api.make_scenario(diagnose=False, before_data={"error_present": True},
                                       after_data={"tests_passed": True, "error_present": False})
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    async with Session() as db:
        case = await db.get(Case, scenario["case"]["id"])
        case.title = "Next.js hydration mismatch"
        case.description = "Client timestamp differs from server HTML"
        case.software_name = "Next.js"
        case.software_version = "16"
        fix = await db.get(Fix, scenario["fix_id"])
        fix.title = "Client-only timestamp rendering"
        await db.commit()
    for _ in range(2):
        response = await api.client.post(f"/api/v1/attempts/{scenario['attempt_id']}/verify")
        assert response.status_code == 200, response.text
        assert response.json()["assessment"]["status"] == "verified"
        assert response.json()["assessment"]["method"] == "coding_test_and_build"
    async with Session() as db:
        assert await db.scalar(select(func.count()).select_from(OutcomeIntelligence)) == 1
        intel = await db.scalar(select(OutcomeIntelligence))
        assert intel.version_range == "16"
        assert intel.embedding and intel.normalized_context["software"] == "Next.js"
        matches = await SimilarCaseRetriever(db).find_similar_cases(intel.embedding, "Coding Error", software="Next.js")
        assert matches


async def test_self_report_never_counts_as_verified_success(api, alice, monkeypatch):
    api.set_identity(alice)
    scenario = await api.make_scenario(diagnose=False)
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    response = await api.client.post(f"/api/v1/attempts/{scenario['attempt_id']}/verify")
    assert response.json()["assessment"]["status"] == "partially_verified"
    async with Session() as db:
        fix = await db.get(Fix, scenario["fix_id"])
        assert fix.success_count == 0
        assert fix.verified_success_rate is None
