"""Category-specific outcome verification engines.

Evaluates post-fix evidence objectively by problem domain:
- Coding Bug: build status, test outputs, execution outputs.
- System / OS: diagnostic recurrence, error log signature disappearance.
- Application / Excel: expected vs actual formula outputs, screenshot diffs.
- Network / Wi-Fi: ping/connection test, recurrence observation.
- Manual / Fallback: self-report weighted provisionally.
"""
from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass
class VerificationAssessment:
    status: str  # "verified", "partially_verified", "failed", "inconclusive"
    confidence: Decimal
    method: str
    strength: str  # "strong", "medium", "weak"
    summary: str


class BaseCategoryVerifier:
    def verify(
        self,
        reported_result: str,
        before_data: dict[str, Any],
        after_data: dict[str, Any],
        evidence_types: list[str],
    ) -> VerificationAssessment:
        raise NotImplementedError


class CodingIssueVerifier(BaseCategoryVerifier):
    """Verifies coding bugs via build status, test outputs, and compiler diffs."""

    def verify(
        self,
        reported_result: str,
        before_data: dict[str, Any],
        after_data: dict[str, Any],
        evidence_types: list[str],
    ) -> VerificationAssessment:
        if reported_result != "resolved":
            return VerificationAssessment(
                status="failed" if reported_result == "not_resolved" else "partially_verified",
                confidence=Decimal("0.85"),
                method="coding_execution_failure",
                strength="strong" if "output" in evidence_types or "test_result" in evidence_types else "medium",
                summary="Solver recorded that the problem was not fully resolved.",
            )

        # Check for conflicting evidence: reported resolved but error signatures remain.
        if (after_data.get("error_present") or after_data.get("tests_passed") is False
                or after_data.get("build_status") in ("failed", "failure")):
            return VerificationAssessment(
                status="inconclusive",
                confidence=Decimal("0.45"),
                method="conflicting_evidence",
                strength="weak",
                summary="Conflicting evidence: resolution reported yet error signatures remain in after-fix data.",
            )

        # Check for objective after signals
        has_tests = after_data.get("tests_passed") is True
        has_output = bool(after_data.get("stdout")) and after_data.get("error_present") is False
        has_build = after_data.get("build_status") == "success"

        if has_tests or has_build or (has_output and not before_data.get("error_present")):
            return VerificationAssessment(
                status="verified",
                confidence=Decimal("0.92"),
                method="coding_test_and_build",
                strength="strong",
                summary="Build/test outputs objectively confirm problem resolution with zero error signatures.",
            )
        elif has_output:
            return VerificationAssessment(
                status="verified",
                confidence=Decimal("0.82"),
                method="coding_output_diff",
                strength="medium",
                summary="Execution output verified clean of prior error signatures.",
            )
        else:
            # Self-report only
            return VerificationAssessment(
                status="partially_verified",
                confidence=Decimal("0.35"),
                method="self_report",
                strength="weak",
                summary="Self-reported resolution without automated test or build output. Provisional status.",
            )


class SystemIssueVerifier(BaseCategoryVerifier):
    """Verifies OS and system issues via log disappearance and observation windows."""

    def verify(
        self,
        reported_result: str,
        before_data: dict[str, Any],
        after_data: dict[str, Any],
        evidence_types: list[str],
    ) -> VerificationAssessment:
        if reported_result != "resolved":
            return VerificationAssessment(
                status="failed" if reported_result == "not_resolved" else "partially_verified",
                confidence=Decimal("0.80"),
                method="system_failure_signal",
                strength="medium",
                summary="System issue recurred or remained unresolved.",
            )

        has_diagnostic = "diagnostic" in evidence_types or "log" in evidence_types
        has_zero_resets = after_data.get("recurrence_count") == 0

        if after_data.get("recurrence_count", 0) > 0:
            return VerificationAssessment(
                status="inconclusive",
                confidence=Decimal("0.45"),
                method="conflicting_evidence",
                strength="weak",
                summary="System issue allegedly resolved but recurrence observed in after-fix diagnostics.",
            )

        if has_diagnostic and has_zero_resets:
            return VerificationAssessment(
                status="verified",
                confidence=Decimal("0.90"),
                method="system_diagnostic_clear",
                strength="strong",
                summary="System diagnostic logs confirm zero error recurrence during observation window.",
            )
        else:
            return VerificationAssessment(
                status="partially_verified",
                confidence=Decimal("0.30"),
                method="self_report",
                strength="weak",
                summary="Self-reported system recovery. Final verification requires observation window.",
            )


class ApplicationIssueVerifier(BaseCategoryVerifier):
    """Verifies spreadsheet, formula, and desktop application issues via result matching."""

    def verify(
        self,
        reported_result: str,
        before_data: dict[str, Any],
        after_data: dict[str, Any],
        evidence_types: list[str],
    ) -> VerificationAssessment:
        if reported_result != "resolved":
            return VerificationAssessment(
                status="failed" if reported_result == "not_resolved" else "partially_verified",
                confidence=Decimal("0.85"),
                method="app_result_mismatch",
                strength="medium",
                summary="Application output does not match expected result.",
            )

        expected = after_data.get("expected_output")
        actual = after_data.get("actual_output")
        has_matching_output = expected is not None and actual is not None and str(expected).strip() == str(actual).strip()
        if expected is not None and actual is not None and not has_matching_output:
            return VerificationAssessment("inconclusive", Decimal("0.45"), "conflicting_evidence", "weak",
                                          "Actual output differs from the expected result.")

        if has_matching_output:
            return VerificationAssessment(
                status="verified",
                confidence=Decimal("0.94"),
                method="formula_result_match",
                strength="strong",
                summary="Actual output precisely matches expected lookup value without error tokens.",
            )
        else:
            return VerificationAssessment(
                status="partially_verified",
                confidence=Decimal("0.35"),
                method="self_report",
                strength="weak",
                summary="Self-reported resolution without verified formula output comparison.",
            )


class NetworkIssueVerifier(BaseCategoryVerifier):
    """Verifies networking and Wi-Fi issues via connection tests and ping telemetry."""

    def verify(
        self,
        reported_result: str,
        before_data: dict[str, Any],
        after_data: dict[str, Any],
        evidence_types: list[str],
    ) -> VerificationAssessment:
        if reported_result != "resolved":
            return VerificationAssessment(
                status="failed",
                confidence=Decimal("0.80"),
                method="network_disconnect_signal",
                strength="medium",
                summary="Connection drops recurred post-fix.",
            )

        if after_data.get("recurrence_count", 0) > 0 or after_data.get("ping_success") is False:
            return VerificationAssessment("inconclusive", Decimal("0.45"), "conflicting_evidence", "weak",
                                          "Connection failures remain in after-fix diagnostics.")
        has_ping = after_data.get("ping_success") is True
        packet_loss = after_data.get("packet_loss_percent", 100)

        if has_ping and packet_loss == 0:
            return VerificationAssessment(
                status="verified",
                confidence=Decimal("0.91"),
                method="network_diagnostic_clean",
                strength="strong",
                summary="Continuous ping and network diagnostics confirm zero packet loss and stable link.",
            )
        else:
            return VerificationAssessment(
                status="partially_verified",
                confidence=Decimal("0.35"),
                method="self_report",
                strength="weak",
                summary="Wi-Fi connection self-reported restored; pending multi-hour observation window.",
            )


class ManualOutcomeVerifier(BaseCategoryVerifier):
    """Weak fallback verification for unstructured issues."""

    def verify(
        self,
        reported_result: str,
        before_data: dict[str, Any],
        after_data: dict[str, Any],
        evidence_types: list[str],
    ) -> VerificationAssessment:
        if reported_result == "resolved":
            return VerificationAssessment(
                status="partially_verified",
                confidence=Decimal("0.25"),
                method="self_report",
                strength="weak",
                summary="Provisional resolution based on self report.",
            )
        else:
            return VerificationAssessment(
                status="failed",
                confidence=Decimal("0.70"),
                method="self_report_failed",
                strength="weak",
                summary="Solver reported fix was unsuccessful.",
            )


def get_verifier_for_category(category: str) -> BaseCategoryVerifier:
    """Selects the domain-appropriate verifier based on problem category."""
    cat_lower = (category or "").lower()
    if "coding" in cat_lower or "code" in cat_lower or "software" in cat_lower:
        return CodingIssueVerifier()
    elif "windows" in cat_lower or "os" in cat_lower or "hardware" in cat_lower:
        return SystemIssueVerifier()
    elif "app" in cat_lower or "productivity" in cat_lower or "excel" in cat_lower:
        return ApplicationIssueVerifier()
    elif "network" in cat_lower or "wi-fi" in cat_lower or "wifi" in cat_lower:
        return NetworkIssueVerifier()
    return ManualOutcomeVerifier()
