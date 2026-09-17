import pytest

from app.core.config import get_settings
from app.core.exceptions import APIError
from app.db.models import Case
from app.services.workflows import reputation_level, transition, verifier_for


def test_transition_valid_path():
    case = Case(status="submitted")
    transition(case, "analyzing")
    assert case.status == "analyzing"


def test_transition_rejects_invalid():
    case = Case(status="submitted")
    with pytest.raises(APIError) as exc:
        transition(case, "verified")
    assert exc.value.status == 409
    assert exc.value.code == "INVALID_TRANSITION"


def test_transition_leaves_unknown_status():
    case = Case(status="mystery")
    with pytest.raises(APIError):
        transition(case, "submitted")


def test_verifier_selection():
    assert verifier_for("Coding Error").evaluate(["test_result"])[0] == "test_result"
    assert verifier_for("Windows / OS").evaluate(["log"])[0] == "system_log"
    assert verifier_for("Network & Wi-Fi").evaluate(["diagnostic"])[0] == "diagnostic"
    assert verifier_for("Apps & Productivity").evaluate(["after_image"])[0] == "screenshot_compare"
    assert verifier_for("Hardware & Devices").evaluate([])[0] == "self_report"


def test_verifier_confidence_is_modest():
    method, confidence = verifier_for("Windows / OS").evaluate(["log"])
    assert method == "system_log"
    assert float(confidence) == 0.35
    _, low = verifier_for("Hardware & Devices").evaluate([])
    assert float(low) == 0.20


def test_reputation_level_thresholds():
    assert reputation_level(0) == "New Solver"
    assert reputation_level(150) == "Contributor"
    assert reputation_level(750) == "Trusted Solver"
    assert reputation_level(2500) == "Expert Solver"
    assert reputation_level(6000) == "Master Contributor"


def test_web3_claim_honestly_unavailable():
    from app.services.workflows import OffChainRewardProvider

    with pytest.raises(APIError) as exc:
        import asyncio

        asyncio.run(OffChainRewardProvider().prepare_claim({}))
    assert exc.value.status == 409
    assert exc.value.code == "WEB3_UNAVAILABLE"
    assert "will be enabled after wallet verification" in exc.value.message


def test_auth_not_configured_settings(monkeypatch):
    monkeypatch.setattr(get_settings(), "supabase_url", "")
    assert get_settings().issuer == "/auth/v1"


def test_issuer_from_supabase_url(monkeypatch):
    monkeypatch.setattr(get_settings(), "supabase_url", "https://proj.supabase.co")
    assert get_settings().issuer == "https://proj.supabase.co/auth/v1"