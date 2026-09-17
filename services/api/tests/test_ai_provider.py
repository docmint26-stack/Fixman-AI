"""Unit tests for AI provider implementations and factory selection."""
import pytest

from app.core.config import get_settings
from app.core.exceptions import APIError
from app.services.ai.provider import (
    MockAIProvider,
    UnconfiguredAIProvider,
    generate_deterministic_embedding,
    get_ai_provider,
)


@pytest.mark.parametrize(
    ("title", "description", "expected_subcategory"),
    [
        ("Hydration mismatch", "Text content did not match server-rendered HTML", "React / Next.js"),
        ("ModuleNotFoundError", "python import of package fails", "Python Environment"),
        ("Docker port collision", "bind for 0.0.0.0 failed: port is already allocated", "Docker"),
        ("Wi-Fi keeps disconnecting", "wireless driver resets after update", "Wireless Adapter"),
        ("Excel XLOOKUP returns #N/A", "excel formula shows #N/A", "Excel Formulas"),
    ],
)
async def test_mock_provider_domain_matching(title, description, expected_subcategory):
    provider = MockAIProvider()
    analysis, metrics = await provider.analyze_problem(
        title=title,
        description=description,
        category="Coding Error",
        environment={},
        evidence=[],
        grounded_facts=[],
    )
    assert analysis.subcategory == expected_subcategory
    assert analysis.likely_causes
    assert 0.0 <= analysis.confidence <= 1.0
    assert metrics.provider == "mock"


async def test_mock_provider_fallback_analysis_is_hypothesis():
    provider = MockAIProvider()
    analysis, _ = await provider.analyze_problem(
        title="Monitor flickers",
        description="Screen flickers intermittently on cold start",
        category="Hardware & Devices",
        environment={},
        evidence=[],
        grounded_facts=[],
    )
    assert analysis.problem_summary
    assert analysis.likely_causes[0].confidence > 0
    assert analysis.confidence <= 0.75


async def test_mock_embeddings_are_deterministic_and_unit_normalized():
    provider = MockAIProvider()
    first = await provider.generate_embedding("Next.js hydration mismatch")
    second = await provider.generate_embedding("Next.js hydration mismatch")
    other = await provider.generate_embedding("Excel XLOOKUP whitespace")
    assert first == second
    assert first != other
    assert len(first) == 1536
    norm = sum(x * x for x in first) ** 0.5
    assert abs(norm - 1.0) < 0.01


def test_generate_deterministic_embedding_of_empty_text():
    vec = generate_deterministic_embedding("")
    assert len(vec) == 1536
    assert vec[0] == 1.0


async def test_unconfigured_provider_raises_structured_error():
    provider = UnconfiguredAIProvider()
    with pytest.raises(APIError) as excinfo:
        await provider.analyze_problem(
            title="x", description="y", category="z", environment={}, evidence=[], grounded_facts=[]
        )
    assert excinfo.value.code == "AI_PROVIDER_NOT_CONFIGURED"
    assert excinfo.value.status == 422


async def test_unconfigured_embeddings_return_zero_vector():
    vec = await UnconfiguredAIProvider().generate_embedding("anything")
    assert vec == [0.0] * 1536


def test_provider_factory_selects_by_settings(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_provider", "mock")
    assert isinstance(get_ai_provider(settings), MockAIProvider)

    monkeypatch.setattr(settings, "ai_provider", "unconfigured")
    assert isinstance(get_ai_provider(settings), UnconfiguredAIProvider)

    monkeypatch.setattr(settings, "ai_provider", "openai")
    monkeypatch.setattr(settings, "ai_api_key", "")
    assert isinstance(get_ai_provider(settings), UnconfiguredAIProvider)


async def test_mock_verify_outcome_paths():
    provider = MockAIProvider()
    verified, _ = await provider.verify_outcome(
        case_info={"category": "Coding Error"},
        fix_info={},
        before_evidence=[],
        after_evidence=[{"type": "test_result"}],
        reported_result="resolved",
    )
    assert verified.verification_status == "verified"

    provisional, _ = await provider.verify_outcome(
        case_info={}, fix_info={}, before_evidence=[], after_evidence=[], reported_result="resolved"
    )
    assert provisional.verification_status == "partially_verified"

    failed, _ = await provider.verify_outcome(
        case_info={}, fix_info={}, before_evidence=[], after_evidence=[], reported_result="not_resolved"
    )
    assert failed.verification_status == "failed"


async def test_mock_score_contribution_flags_duplicate():
    provider = MockAIProvider()
    score, _ = await provider.score_contribution(
        title="Reset network adapter",
        description="desc",
        steps=["a"],
        category="Network & Wi-Fi",
        existing_fixes=[{"id": "fix-1", "title": "Reset network adapter"}],
    )
    assert score.duplicate_fix_id == "fix-1"
    assert score.duplicate_probability >= 0.6
    assert score.recommendation == "suggest_improvement"
