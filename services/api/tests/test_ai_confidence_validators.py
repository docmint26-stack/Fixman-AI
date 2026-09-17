"""Unit tests for AI output validators and composite confidence scoring."""
import json

import pytest

from app.services.ai.confidence import calculate_composite_confidence
from app.services.ai.schemas import ProblemAnalysis
from app.services.ai.validators import repair_json_string, validate_and_parse


def _problem_payload() -> dict:
    return {
        "problem_summary": "Hydration mismatch",
        "category": "Coding Error",
        "likely_causes": [{"title": "Date rendering", "explanation": "locale", "confidence": 0.9}],
        "confidence": 0.8,
    }


def test_validate_and_parse_accepts_direct_json():
    model, repaired, err = validate_and_parse(json.dumps(_problem_payload()), ProblemAnalysis)
    assert model is not None
    assert err is None
    assert repaired is False
    assert model.confidence == 0.8


def test_validate_and_parse_repairs_markdown_fence_and_trailing_comma():
    raw = "```json\n" + json.dumps(_problem_payload())[:-1] + ",}\n```"
    model, repaired, err = validate_and_parse(raw, ProblemAnalysis)
    assert model is not None
    assert err is None
    assert repaired is True


def test_validate_and_parse_rejects_schema_violation():
    model, repaired, err = validate_and_parse('{"category": "only-category"}', ProblemAnalysis)
    assert model is None
    assert err is not None
    assert err.startswith("VALIDATION_FAILED")


def test_validate_and_parse_rejects_empty_output():
    model, repaired, err = validate_and_parse("   ", ProblemAnalysis)
    assert model is None
    assert err == "EMPTY_MODEL_OUTPUT"


def test_repair_json_extracts_object_from_prose():
    raw = 'Sure! Here is the analysis: {"problem_summary": "s"} hope that helps.'
    assert repair_json_string(raw) == '{"problem_summary": "s"}'


def test_composite_confidence_high_band():
    breakdown = calculate_composite_confidence(1.0, 1.0, 1.0, 1.0, 1.0, 1.0)
    assert breakdown.overall == 0.99
    assert breakdown.confidence_label == "High"
    assert breakdown.confidence_model_version == "heuristic_v1"


def test_composite_confidence_medium_band():
    breakdown = calculate_composite_confidence(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
    assert breakdown.confidence_label == "Medium"
    assert 0.45 <= breakdown.overall < 0.75


def test_composite_confidence_clamps_inputs_and_low_band():
    breakdown = calculate_composite_confidence(-5, 2, 0, 0, 0, 0)
    assert breakdown.evidence_completeness == 0.0
    assert breakdown.retrieval_strength == 1.0
    assert breakdown.confidence_label == "Low"
    assert breakdown.overall >= 0.05


@pytest.mark.parametrize("value", [0.0, 0.33, 0.66, 1.0])
def test_composite_confidence_bounds(value):
    breakdown = calculate_composite_confidence(value, value, value, value, value, value)
    assert 0.05 <= breakdown.overall <= 0.99
