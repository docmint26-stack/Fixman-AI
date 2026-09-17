"""Anti-abuse, duplicate fix detection, and contribution scoring for Puvexa AI.

Prevents gaming, sybil fix submissions, duplicate token farming, and copy-paste abuse.
"""
import hashlib
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Contribution, Fix, Outcome
from app.services.ai.provider import get_ai_provider
from app.services.ai.schemas import ContributionScore
from app.services.retrieval.embeddings import cosine_similarity


class ContributionAntiAbuseEngine:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.provider = get_ai_provider()

    async def check_duplicate_fix(
        self,
        title: str,
        category: str,
        threshold: float = 0.70,
    ) -> tuple[bool, str | None, float]:
        """Detects if a submitted fix is a semantic duplicate of an existing fix."""
        query_emb = await self.provider.generate_embedding(f"{category}: {title}")
        candidate_fixes = (await self.db.scalars(
            select(Fix).where(Fix.category == category)
        )).all()

        best_match_id = None
        highest_sim = 0.0

        for fix in candidate_fixes:
            fix_emb = await self.provider.generate_embedding(f"{fix.category}: {fix.title}")
            sim = cosine_similarity(query_emb, fix_emb)
            if sim > highest_sim:
                highest_sim = sim
                best_match_id = fix.id

        is_dup = highest_sim >= threshold
        return is_dup, best_match_id if is_dup else None, round(highest_sim, 2)

    async def detect_user_gaming_patterns(
        self,
        user_id: str,
        content_hash: str,
        exclude_id: str | None = None,
    ) -> tuple[float, list[str]]:
        """Detects rapid repeated submissions, identical hash reuse, and suspicious burst volume."""
        flags: list[str] = []
        fraud_risk = 0.05

        # 1. Check if user already submitted identical content hash
        recent_count = await self.db.scalar(
            select(func.count()).select_from(Contribution).where(
                Contribution.user_id == user_id,
                Contribution.created_at >= datetime.now(UTC) - timedelta(hours=1),
            )
        )
        if recent_count and recent_count > 10:
            flags.append("High submission velocity detected")
            fraud_risk += 0.25

        submissions = (await self.db.scalars(select(Contribution).where(Contribution.user_id == user_id))).all()
        for submission in submissions:
            if submission.id == exclude_id:
                continue
            summary = submission.evidence_summary or {}
            combined = f"{submission.title}\n{submission.description}\n{' '.join(summary.get('steps', []))}"
            previous_hash = hashlib.sha256(combined.encode("utf-8")).hexdigest()
            if content_hash in (previous_hash, summary.get("content_hash")):
                flags.append("Duplicate contribution or evidence content hash")
                fraud_risk += 0.45
                break

        weak_reports = await self.db.scalar(select(func.count()).select_from(Outcome).where(
            Outcome.user_id == user_id, Outcome.reported_result == "resolved",
            Outcome.verification_confidence < 0.5,
            Outcome.created_at >= datetime.now(UTC) - timedelta(days=1),
        ))
        if weak_reports and weak_reports >= 5:
            flags.append("Repeated low-evidence worked reports require review")
            fraud_risk += 0.45

        return round(min(1.0, fraud_risk), 2), flags

    async def analyze_contribution(
        self,
        user_id: str,
        title: str,
        description: str,
        steps: list[str],
        category: str,
        exclude_id: str | None = None,
    ) -> ContributionScore:
        """Scores contribution value, novelty, duplicate probability, and fraud risk."""
        # 1. Duplicate check
        is_dup, dup_id, dup_prob = await self.check_duplicate_fix(title, category)

        # 2. Content hashing and velocity check
        combined = f"{title}\n{description}\n{' '.join(steps)}"
        content_hash = hashlib.sha256(combined.encode("utf-8")).hexdigest()
        fraud_risk, fraud_flags = await self.detect_user_gaming_patterns(user_id, content_hash, exclude_id)

        if is_dup:
            fraud_flags.append(f"High similarity ({int(dup_prob * 100)}%) to existing fix {dup_id}")

        # Quality scoring
        step_count = len(steps)
        evidence_quality = 0.90 if step_count >= 3 and len(description) > 80 else 0.55
        utility = 0.85 if not is_dup else 0.40
        novelty = round(max(0.1, 1.0 - dup_prob), 2)
        overall = round((novelty * 0.35 + evidence_quality * 0.35 + utility * 0.30) * (1.0 - fraud_risk * 0.5), 2)

        if fraud_risk >= 0.50:
            recommendation = "needs_manual_review"
        elif dup_prob >= 0.80:
            recommendation = "suggest_improvement"
        else:
            recommendation = "accept"

        return ContributionScore(
            novelty=novelty,
            evidence_quality=evidence_quality,
            verification_strength=0.75,
            utility=utility,
            fraud_risk=fraud_risk,
            duplicate_probability=dup_prob,
            overall_value=overall,
            duplicate_fix_id=dup_id,
            duplicate_summary=f"Matches existing fix {dup_id}" if dup_id else None,
            flags=fraud_flags,
            recommendation=recommendation,
            model_version="contrib_v1",
        )
