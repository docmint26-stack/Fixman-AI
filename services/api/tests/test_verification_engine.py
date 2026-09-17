"""Unit tests for category-specific outcome verification engines."""
from decimal import Decimal

import pytest

from app.services.verification.engine import (
    ApplicationIssueVerifier,
    CodingIssueVerifier,
    ManualOutcomeVerifier,
    NetworkIssueVerifier,
    SystemIssueVerifier,
    get_verifier_for_category,
)


def test_coding_verifier_verifies_with_objective_test_evidence():
    assessment = CodingIssueVerifier().verify("resolved", {}, {"tests_passed": True}, ["test_result"])
    assert assessment.status == "verified"
    assert assessment.strength == "strong"
    assert assessment.confidence >= Decimal("0.9")


def test_coding_verifier_self_report_is_provisional():
    assessment = CodingIssueVerifier().verify("resolved", {}, {}, [])
    assert assessment.status == "partially_verified"
    assert assessment.strength == "weak"


def test_coding_verifier_conflicting_evidence_is_inconclusive():
    assessment = CodingIssueVerifier().verify(
        "resolved", {}, {"error_present": True, "tests_passed": True}, ["test_result"]
    )
    assert assessment.status == "inconclusive"
    assert assessment.method == "conflicting_evidence"


def test_coding_verifier_not_resolved_fails():
    assert CodingIssueVerifier().verify("not_resolved", {}, {}, []).status == "failed"


def test_system_verifier_clean_window_is_verified():
    assessment = SystemIssueVerifier().verify("resolved", {}, {"recurrence_count": 0}, ["diagnostic"])
    assert assessment.status == "verified"


def test_system_verifier_recurrence_is_inconclusive():
    assessment = SystemIssueVerifier().verify("resolved", {}, {"recurrence_count": 3}, ["diagnostic"])
    assert assessment.status == "inconclusive"


def test_application_verifier_matches_expected_output():
    assessment = ApplicationIssueVerifier().verify(
        "resolved", {}, {"expected_output": "42", "actual_output": "42"}, []
    )
    assert assessment.status == "verified"
    assert assessment.method == "formula_result_match"


def test_application_verifier_falls_back_to_self_report():
    assessment = ApplicationIssueVerifier().verify("resolved", {}, {}, [])
    assert assessment.status == "partially_verified"


def test_network_verifier_clean_ping_is_verified():
    assessment = NetworkIssueVerifier().verify(
        "resolved", {}, {"ping_success": True, "packet_loss_percent": 0}, []
    )
    assert assessment.status == "verified"


def test_network_verifier_recurrence_fails():
    assert NetworkIssueVerifier().verify("not_resolved", {}, {}, []).status == "failed"


def test_manual_verifier_is_weak_fallback():
    assessment = ManualOutcomeVerifier().verify("resolved", {}, {}, [])
    assert assessment.status == "partially_verified"
    assert assessment.confidence == Decimal("0.25")


def test_before_error_after_passing_output():
    result = CodingIssueVerifier().verify("resolved", {"error_present": True},
                                          {"tests_passed": True, "error_present": False}, ["output"])
    assert result.status == "verified"


@pytest.mark.parametrize("after", [{"tests_passed": False}, {"build_status": "failed"}])
def test_failed_test_attachment_cannot_verify(after):
    assert CodingIssueVerifier().verify("resolved", {}, after, ["test_result"]).status == "inconclusive"


def test_excel_zero_is_valid_output():
    assert ApplicationIssueVerifier().verify("resolved", {}, {"expected_output": 0, "actual_output": 0}, []).status == "verified"


def test_excel_mismatch_overrides_screenshot():
    result = ApplicationIssueVerifier().verify("resolved", {}, {"expected_output": 42, "actual_output": 7}, ["screenshot"])
    assert result.status == "inconclusive"


def test_network_recurrence_overrides_clean_ping():
    result = NetworkIssueVerifier().verify("resolved", {}, {"ping_success": True, "packet_loss_percent": 0, "recurrence_count": 2}, [])
    assert result.status == "inconclusive"


@pytest.mark.parametrize(("verifier", "types"), [
    (CodingIssueVerifier(), ["test_result", "output"]),
    (SystemIssueVerifier(), ["log"]),
    (ApplicationIssueVerifier(), ["screenshot", "output"]),
])
def test_attachment_type_alone_never_verifies(verifier, types):
    assert verifier.verify("resolved", {}, {}, types).status == "partially_verified"


def test_coding_error_disappears_from_output():
    assert CodingIssueVerifier().verify("resolved", {"error_present": True},
                                       {"stdout": "All checks passed", "error_present": False}, ["output"]).status == "verified"


@pytest.mark.parametrize(
    ("category", "expected"),
    [
        ("Coding Error", CodingIssueVerifier),
        ("Windows / OS", SystemIssueVerifier),
        ("Network & Wi-Fi", NetworkIssueVerifier),
        ("Apps & Productivity", ApplicationIssueVerifier),
        ("Something Else", ManualOutcomeVerifier),
    ],
)
def test_verifier_selection_by_category(category, expected):
    assert isinstance(get_verifier_for_category(category), expected)
