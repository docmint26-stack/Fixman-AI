"""Unit tests for anti-abuse, duplicate detection, and contribution scoring."""
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.core.config import get_settings
from app.db.models import Contribution, Fix, Profile
from app.db.session import Session
from app.services.verification.anti_abuse import ContributionAntiAbuseEngine


async def test_low_velocity_user_has_low_fraud_risk(migrated_db):
    async with Session() as db:
        engine = ContributionAntiAbuseEngine(db)
        risk, flags = await engine.detect_user_gaming_patterns(str(uuid4()), "hash")
    assert risk == 0.05
    assert flags == []


async def test_high_submission_velocity_is_flagged(migrated_db, monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    user_id = str(uuid4())
    async with Session() as db:
        db.add(Profile(id=user_id, auth_user_id=str(uuid4())))
        await db.flush()
        for index in range(11):
            db.add(Contribution(user_id=user_id, title=f"Submitted fix {index}", description="details"))
        await db.commit()

    async with Session() as db:
        engine = ContributionAntiAbuseEngine(db)
        risk, flags = await engine.detect_user_gaming_patterns(user_id, "hash")
    assert risk >= 0.30
    assert flags


async def test_analyze_contribution_detects_semantic_duplicate(migrated_db, monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    async with Session() as db:
        db.add(Fix(
            id=str(uuid4()),
            title="Reset network adapter",
            summary="summary",
            instructions=["step"],
            category="Network & Wi-Fi",
            source_type="curated",
        ))
        await db.commit()

    async with Session() as db:
        engine = ContributionAntiAbuseEngine(db)
        score = await engine.analyze_contribution(
            user_id=str(uuid4()),
            title="Reset network adapter",
            description="Rephrased duplicate of an existing fix with the same steps.",
            steps=["step one", "step two", "step three"],
            category="Network & Wi-Fi",
        )
    assert score.duplicate_fix_id is not None
    assert score.duplicate_probability >= 0.7
    assert score.recommendation == "suggest_improvement"
    assert score.flags


async def test_analyze_contribution_accepts_novel_fix(migrated_db, monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    async with Session() as db:
        engine = ContributionAntiAbuseEngine(db)
        score = await engine.analyze_contribution(
            user_id=str(uuid4()),
            title="Revoke stale OAuth refresh tokens after secret rotation",
            description="A distinct, detailed procedure with verifiable steps for a rare mailbox issue.",
            steps=["Open the identity provider console", "Rotate the signing secret", "Revoke issued refresh tokens"],
            category="Security",
        )
    assert score.recommendation == "accept"
    assert 0.0 <= score.overall_value <= 1.0
    assert score.model_version == "contrib_v1"


async def test_duplicate_hash_requires_review_without_banning(api, alice, monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    api.set_identity(alice)
    case = await api.create_case()
    async with Session() as db:
        profile = await db.get(Profile, case["user_id"])
        role = profile.role
        db.add(Contribution(user_id=profile.id, title="Earlier", description="Evidence",
                            evidence_summary={"content_hash": "same-evidence"}))
        await db.commit()
        risk, flags = await ContributionAntiAbuseEngine(db).detect_user_gaming_patterns(profile.id, "same-evidence")
        assert risk >= 0.5
        assert any("hash" in flag for flag in flags)
        assert profile.role == role


async def test_old_submissions_are_not_velocity(migrated_db, monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    async with Session() as db:
        user = Profile(id=str(uuid4()), auth_user_id=str(uuid4()))
        db.add(user)
        await db.flush()
        for i in range(12):
            db.add(Contribution(user_id=user.id, title=str(i), description="old",
                                created_at=datetime.now(UTC) - timedelta(days=30)))
        await db.commit()
        risk, flags = await ContributionAntiAbuseEngine(db).detect_user_gaming_patterns(user.id, "new")
        assert risk == 0.05
        assert flags == []


async def test_repeated_content_is_review_required(migrated_db, monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    async with Session() as db:
        user = Profile(id=str(uuid4()), auth_user_id=str(uuid4()))
        db.add(user)
        await db.flush()
        db.add(Contribution(user_id=user.id, title="Unique fix", description="Repeated procedure",
                            evidence_summary={"steps": ["Inspect", "Repair", "Test"]}))
        await db.commit()
        score = await ContributionAntiAbuseEngine(db).analyze_contribution(
            user.id, "Unique fix", "Repeated procedure", ["Inspect", "Repair", "Test"], "Security")
        assert score.recommendation == "needs_manual_review"


async def test_low_evidence_worked_reports_are_flagged(api, alice, monkeypatch):
    api.set_identity(alice)
    for _ in range(5):
        scenario = await api.make_scenario(diagnose=False)
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    async with Session() as db:
        risk, flags = await ContributionAntiAbuseEngine(db).detect_user_gaming_patterns(scenario["case"]["user_id"], "new")
        assert risk >= 0.5
        assert any("low-evidence" in flag for flag in flags)


async def test_slightly_reworded_fix_is_duplicate(migrated_db, monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")
    async with Session() as db:
        fix = Fix(title="Reset network adapter", summary="Reset adapter", instructions=["Restart adapter"], category="Network & Wi-Fi")
        db.add(fix)
        await db.commit()
        duplicate, identifier, similarity = await ContributionAntiAbuseEngine(db).check_duplicate_fix(
            "Reset network adapter safely", "Network & Wi-Fi")
        assert duplicate and identifier == fix.id
        assert similarity >= 0.7
