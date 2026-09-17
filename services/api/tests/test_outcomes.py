from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import func, select

from app.db.models import Fix, Notification, Profile, ReputationEvent, RewardLedger
from app.db.session import Session
from app.services.workflows import OBSERVATION_WINDOW, accept_outcome


async def test_submit_outcome(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario()
    outcome = case["outcome"]
    assert outcome["reported_result"] == "resolved"
    assert outcome["verification_status"] == "pending"
    assert outcome["verification_method"] == "self_report"
    assert float(outcome["verification_confidence"]) == 0.2
    assert "Trusted verification is pending" in outcome["verification_summary"]
    start = datetime.fromisoformat(outcome["observation_started_at"])
    end = datetime.fromisoformat(outcome["observation_ends_at"])
    assert OBSERVATION_WINDOW - timedelta(seconds=2) <= end - start <= OBSERVATION_WINDOW + timedelta(seconds=2)
    detail = (await api.client.get(f"/api/v1/cases/{case['case']['id']}")).json()
    assert detail["status"] == "monitoring"
    assert len(detail["outcomes"]) == 1
    listing = (await api.client.get(f"/api/v1/cases/{case['case']['id']}/outcomes")).json()
    assert listing["total"] == 1


async def test_submit_outcome_validates_result(api, alice):
    api.set_identity(alice)
    case = await api.prepare_suggested(diagnose=False)
    resp = await api.client.post(f"/api/v1/cases/{case['case']['id']}/attempts", json={"fix_id": case["fix_id"]})
    attempt_id = resp.json()["id"]
    bad = await api.client.post(f"/api/v1/attempts/{attempt_id}/outcomes", json={"reported_result": "maybe"})
    assert bad.status_code == 422


async def test_duplicate_outcome_same_result_is_idempotent(api, alice):
    api.set_identity(alice)
    first = await api.make_scenario()
    case_id = first["case"]["id"]
    attempt_id = first["attempt_id"]
    again = await api.client.post(f"/api/v1/attempts/{attempt_id}/outcomes", json={"reported_result": "resolved"})
    assert again.json()["id"] == first["outcome"]["id"]
    assert (await api.client.get(f"/api/v1/cases/{case_id}/outcomes")).json()["total"] == 1


async def test_duplicate_outcome_different_result_conflicts(api, alice):
    api.set_identity(alice)
    first = await api.make_scenario()
    again = await api.client.post(f"/api/v1/attempts/{first['attempt_id']}/outcomes", json={"reported_result": "not_resolved"})
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "OUTCOME_EXISTS"


async def test_outcome_evidence_while_pending(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario()
    resp = await api.client.post(f"/api/v1/outcomes/{case['outcome']['id']}/evidence", data={"evidence_type": "log", "text_content": "reconnecting every 60s"})
    assert resp.status_code == 201, resp.text
    assert resp.json()["outcome_id"] == case["outcome"]["id"]


async def test_outcome_evidence_isolation(api, alice, bob):
    api.set_identity(alice)
    case = await api.make_scenario()
    api.set_identity(bob)
    resp = await api.client.post(f"/api/v1/outcomes/{case['outcome']['id']}/evidence", data={"evidence_type": "log", "text_content": "nope"})
    assert resp.status_code == 404


async def test_accept_outcome_happy_path_rewards(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario()
    async with Session() as db:
        outcome = await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
        assert outcome.verification_status == "verified"
        rewards = (await db.scalars(select(RewardLedger))).all()
        assert len(rewards) == 1
        assert rewards[0].amount == Decimal("8")
        assert rewards[0].status == "claimable"
        assert rewards[0].idempotency_key == f"verified_outcome:{case['outcome']['id']}"
        reputation = (await db.scalars(select(ReputationEvent))).all()
        assert len(reputation) == 1
        assert reputation[0].points == 20
        profile = await db.get(Profile, alice.id)
        assert profile.reputation_score == 20
        assert profile.reputation_level == "New Solver"
        fix = await db.get(Fix, case["fix_id"])
        assert fix.success_count == 1
        assert fix.failure_count == 0
        assert fix.verified_success_rate is None
        titles = (await db.scalars(select(Notification.title))).all()
        assert "Reward unlocked" in titles
        assert "Outcome reviewed" in titles
    detail = (await api.client.get(f"/api/v1/cases/{case['case']['id']}")).json()
    assert detail["status"] == "verified"
    assert detail["resolved_at"] is not None
    assert len(detail["rewards"]) == 1


async def test_accept_outcome_is_idempotent(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario()
    async with Session() as db:
        await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
    async with Session() as db:
        await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
        assert await db.scalar(select(func.count()).select_from(RewardLedger)) == 1
        assert await db.scalar(select(func.count()).select_from(ReputationEvent)) == 1
        profile = await db.get(Profile, alice.id)
        assert profile.reputation_score == 20
        fix = await db.get(Fix, case["fix_id"])
        assert fix.success_count == 1


async def test_accept_outcome_partial_no_reward(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario(reported_result="partially_resolved")
    async with Session() as db:
        outcome = await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
        assert outcome.verification_status == "partially_verified"
        assert await db.scalar(select(func.count()).select_from(RewardLedger)) == 0
        assert await db.scalar(select(func.count()).select_from(ReputationEvent)) == 0
        fix = await db.get(Fix, case["fix_id"])
        assert fix.partial_count == 1
    detail = (await api.client.get(f"/api/v1/cases/{case['case']['id']}")).json()
    assert detail["status"] == "partially_verified"


async def test_accept_outcome_not_resolved(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario(reported_result="not_resolved")
    async with Session() as db:
        await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
        assert await db.scalar(select(func.count()).select_from(RewardLedger)) == 0
        fix = await db.get(Fix, case["fix_id"])
        assert fix.failure_count == 1
    detail = (await api.client.get(f"/api/v1/cases/{case['case']['id']}")).json()
    assert detail["status"] == "failed"


async def test_outcome_evidence_rejected_after_review(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario()
    async with Session() as db:
        await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
    resp = await api.client.post(f"/api/v1/outcomes/{case['outcome']['id']}/evidence", data={"evidence_type": "log", "text_content": "late evidence"})
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "REVIEW_COMPLETE"


async def test_accept_outcome_missing(api, alice):
    async with Session() as db:
        from app.core.exceptions import APIError

        try:
            await accept_outcome(db, str(uuid4()))
            assert False, "expected APIError"
        except APIError as exc:
            assert exc.status == 404


async def test_monitoring_cannot_apply_another_fix(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario()
    resp = await api.client.post(f"/api/v1/cases/{case['case']['id']}/attempts", json={"fix_id": case["fix_id"]})
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "INVALID_TRANSITION"