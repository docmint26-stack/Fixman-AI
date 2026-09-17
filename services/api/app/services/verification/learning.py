"""Outcome Learning Engine — Converts verified outcomes into reusable intelligence.

When an outcome is verified:
1. Normalizes context into an anonymized outcome_intelligence record.
2. Generates vector embedding for future retrieval.
3. Updates fix success/failure aggregates and statistical rates.
4. Idempotently awards solver rewards and reputation.
"""
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.base import now
from app.db.models import (
    Case,
    Fix,
    FixAttempt,
    Outcome,
    OutcomeIntelligence,
    Profile,
    ReputationEvent,
    RewardLedger,
)
from app.services.ai.provider import get_ai_provider
from app.services.retrieval.embeddings import build_case_embedding_text
from app.services.verification.engine import VerificationAssessment, get_verifier_for_category


class OutcomeLearningEngine:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.provider = get_ai_provider()

    async def verify_and_learn(
        self,
        outcome: Outcome,
        evidence_types: list[str],
    ) -> VerificationAssessment:
        """Evaluates outcome evidence, updates case status, records intelligence, and adjusts fix statistics."""
        await self.db.refresh(outcome, with_for_update=True)
        if outcome.verification_status != "pending":
            return VerificationAssessment(outcome.verification_status, outcome.verification_confidence,
                                          outcome.verification_method, "strong" if outcome.verification_status == "verified" else "weak",
                                          outcome.verification_summary or "Previously assessed")
        case = await self.db.get(Case, outcome.case_id)
        attempt = await self.db.get(FixAttempt, outcome.fix_attempt_id)
        fix = await self.db.get(Fix, attempt.fix_id)

        # 1. Execute category-specific verification
        verifier = get_verifier_for_category(case.category)
        assessment = verifier.verify(
            reported_result=outcome.reported_result,
            before_data=outcome.before_data or {},
            after_data=outcome.after_data or {},
            evidence_types=evidence_types,
        )

        # Update outcome record
        outcome.verification_status = assessment.status
        outcome.verification_confidence = assessment.confidence
        outcome.verification_method = assessment.method
        outcome.verification_summary = assessment.summary
        outcome.verified_at = now()

        # Transition case status
        if assessment.status == "verified":
            case.status = "verified"
            case.resolved_at = now()
        elif assessment.status == "partially_verified":
            case.status = "partially_verified"
        else:
            case.status = "failed"

        await self.db.flush()

        # 2. Update Fix aggregates
        results = (await self.db.execute(
            select(Outcome.reported_result, func.count())
            .join(FixAttempt, Outcome.fix_attempt_id == FixAttempt.id)
            .where(FixAttempt.fix_id == fix.id, Outcome.verification_status.in_(["verified", "failed"]))
            .group_by(Outcome.reported_result)
        )).all()

        counts = dict(results)
        fix.success_count = counts.get("resolved", 0)
        fix.failure_count = counts.get("not_resolved", 0)
        fix.partial_count = counts.get("partially_resolved", 0)
        sample = fix.success_count + fix.failure_count

        min_sample = get_settings().min_success_rate_sample
        fix.verified_success_rate = Decimal(str(round(fix.success_count / sample, 4))) if sample >= min_sample else None

        # 3. Create reusable OutcomeIntelligence record if verified or partially verified
        if assessment.status in ("verified", "partially_verified"):
            norm_ctx = {
                "category": case.category,
                "software": case.software_name,
                "os": case.operating_system,
                "version": case.software_version,
            }
            emb_text = build_case_embedding_text(
                title=case.title,
                description=case.description,
                category=case.category,
                environment=case.environment,
            )
            embedding = await self.provider.generate_embedding(emb_text)

            version_range = (case.environment or {}).get("software_version") or case.software_version

            intel = OutcomeIntelligence(
                id=str(uuid4()),
                source_outcome_id=outcome.id,
                fix_id=fix.id,
                normalized_context=norm_ctx,
                category=case.category,
                software=case.software_name,
                os=case.operating_system,
                version_range=version_range,
                error_family=case.subcategory or case.category,
                result=outcome.reported_result,
                verification_strength=assessment.strength,
                confidence=assessment.confidence,
                embedding=embedding,
            )
            self.db.add(intel)

            # 4. Idempotently award off-chain rewards and reputation
            if assessment.status == "verified":
                from sqlalchemy.dialects.postgresql import insert as pg_insert
                from sqlalchemy.dialects.sqlite import insert as sqlite_insert

                insert = pg_insert if self.db.bind.dialect.name == "postgresql" else sqlite_insert
                key = f"verified_outcome:{outcome.id}"

                await self.db.execute(
                    insert(RewardLedger)
                    .values(
                        user_id=outcome.user_id,
                        event_type="verified_outcome",
                        reference_type="outcome",
                        reference_id=outcome.id,
                        amount=8,
                        status="claimable",
                        reason="Verified outcome in FixMind graph",
                        idempotency_key=key,
                        claimable_at=now(),
                    )
                    .on_conflict_do_nothing()
                )

                await self.db.execute(
                    insert(ReputationEvent)
                    .values(
                        user_id=outcome.user_id,
                        event_type="verified_outcome",
                        reference_id=outcome.id,
                        points=20,
                        reason="Verified outcome in FixMind graph",
                        idempotency_key=key,
                    )
                    .on_conflict_do_nothing()
                )

                profile = await self.db.scalar(select(Profile).where(Profile.id == outcome.user_id))
                if profile:
                    profile.reputation_score = (
                        await self.db.scalar(
                            select(func.coalesce(func.sum(ReputationEvent.points), 0)).where(
                                ReputationEvent.user_id == profile.id
                            )
                        )
                        or 0
                    )

        await self.db.flush()
        return assessment
