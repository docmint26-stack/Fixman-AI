"""Fix ranking, safety scoring, and statistical success rate enforcement.

Prioritizes verified outcome fixes and official guidance over unverified hypotheses.
Applies risk penalties, flags destructive operations, and prevents deceptive success rate claims.
"""
import re
from typing import Any

from app.core.config import get_settings
from app.services.ai.schemas import RankedFixOutput

DESTRUCTIVE_KEYWORDS = [
    "format c:",
    "rm -rf /",
    "mkfs",
    "dd if=",
    "drop database",
    "delete from profiles",
    "truncate table",
    "disable firewall",
    "chmod 777 -r /",
]


def check_destructive_content(text: str) -> tuple[bool, str | None]:
    """Scans text for destructive or hazardous operations."""
    lower = text.lower()
    for kw in DESTRUCTIVE_KEYWORDS:
        if kw in lower:
            return True, f"Dangerous operation flagged: '{kw}'"
    return False, None


class FixRanker:
    def __init__(self, min_sample: int | None = None):
        self.min_sample = min_sample or get_settings().min_success_rate_sample

    def calculate_success_metrics(
        self,
        success_count: int,
        failure_count: int,
        partial_count: int = 0,
    ) -> tuple[float | None, str]:
        """Calculates verified success rate with strict statistical safety thresholds.

        If sample_size < MIN_SUCCESS_RATE_SAMPLE:
            returns (None, "Not enough verified outcomes yet")
        """
        sample = success_count + failure_count
        if sample < self.min_sample:
            return None, "Not enough verified outcomes yet"

        rate = round(success_count / sample, 2)
        status = f"{int(rate * 100)}% verified success across {sample} outcomes"
        return rate, status

    def score_and_rank_fixes(
        self,
        candidate_fixes: list[dict[str, Any]],
        context_features: dict[str, Any],
    ) -> list[RankedFixOutput]:
        """Ranks candidate fixes according to:

        RankScore = ContextMatch + VerifiedOutcomeStrength + SourceQuality - RiskPenalty - EffortPenalty
        """
        scored_items: list[tuple[float, dict[str, Any]]] = []

        for fix in candidate_fixes:
            source_type = fix.get("source_type", "curated")
            success_count = int(fix.get("success_count", 0))
            failure_count = int(fix.get("failure_count", 0))
            sample_size = success_count + failure_count

            # Statistical rate
            verified_rate, stat_status = self.calculate_success_metrics(success_count, failure_count)

            # Source Quality weight (0.0 to 1.0)
            source_weights = {
                "verified_outcome": 1.0,
                "official_doc": 0.90,
                "curated": 0.80,
                "ai_generated": 0.55,
            }
            source_quality = source_weights.get(source_type, 0.60)

            # Trust label
            if verified_rate is not None and sample_size >= self.min_sample:
                trust_label = "Outcome-Backed Fix"
            elif source_type == "official_doc":
                trust_label = "Official Guidance"
            elif source_type == "curated":
                trust_label = "Curated Fix"
            else:
                trust_label = "AI Suggestion"

            # Context Match (0.0 to 1.0)
            query_terms = set(re.findall(r"[a-z0-9]+", str(context_features.get("problem", "")).lower()))
            fix_terms = set(re.findall(r"[a-z0-9]+", f"{fix.get('title', '')} {fix.get('summary', '')}".lower()))
            lexical_match = len(query_terms & fix_terms) / max(1, len(query_terms))
            category_match = fix.get("category") == context_features.get("category")
            ctx_match = float(fix.get("context_match_score", min(1.0, lexical_match + (0.2 if category_match else 0))))

            # Outcome Strength (0.0 to 1.0)
            if verified_rate is not None:
                outcome_strength = verified_rate
            else:
                outcome_strength = 0.50

            # Penalties for Risk and Effort
            risk_level = fix.get("risk_level", "low").lower()
            risk_penalty = {"low": 0.0, "medium": 0.08, "high": 0.22}.get(risk_level, 0.05)

            effort_level = fix.get("effort_level", "low").lower()
            effort_penalty = {"low": 0.0, "medium": 0.04, "high": 0.10}.get(effort_level, 0.02)

            # Destructive scan
            combined_text = f"{fix.get('title', '')} {fix.get('summary', '')} {' '.join(fix.get('steps', []))}"
            is_destructive, dest_reason = check_destructive_content(combined_text)
            if is_destructive:
                risk_penalty += 0.50

            # Composite Rank Score
            rank_score = (
                0.35 * ctx_match
                + 0.30 * outcome_strength
                + 0.25 * source_quality
                - risk_penalty
                - effort_penalty
            )
            rank_score = round(max(0.05, min(0.99, rank_score)), 2)

            item = {
                "fix_id": fix.get("id"),
                "title": fix.get("title", "Fix"),
                "summary": fix.get("summary", ""),
                "steps": fix.get("steps") or fix.get("instructions") or ["Follow resolution instructions"],
                "risk_level": risk_level if risk_level in ("low", "medium", "high") else "low",
                "effort_level": effort_level if effort_level in ("low", "medium", "high") else "low",
                "source_type": source_type if source_type in ("verified_outcome", "official_doc", "curated", "ai_generated") else "curated",
                "trust_label": trust_label,
                "context_match_score": ctx_match,
                "ai_confidence": float(fix.get("confidence", 0.80)),
                "rank_score": rank_score,
                "explanation": fix.get("why_it_matches") or fix.get("summary", ""),
                "why_it_matches": fix.get("why_it_matches") or "Matches reported context and symptoms",
                "prerequisites": fix.get("prerequisites", []),
                "rollback_steps": fix.get("rollback_steps", ["Revert changes"]),
                "requires_admin": fix.get("requires_root_or_admin", False) or (risk_level == "high"),
                "verified_success_rate": verified_rate,
                "sample_size": sample_size,
                "statistical_status": stat_status,
            }
            scored_items.append((rank_score, item))

        # Sort descending by rank_score
        scored_items.sort(key=lambda x: x[0], reverse=True)

        ranked_outputs: list[RankedFixOutput] = []
        for rank_idx, (_, item_data) in enumerate(scored_items, 1):
            item_data["rank"] = rank_idx
            ranked_outputs.append(RankedFixOutput(**item_data))

        return ranked_outputs
