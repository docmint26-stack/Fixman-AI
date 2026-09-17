"""Composite confidence scoring and breakdown model.

Implements version 'heuristic_v1', synthesizing evidence completeness,
retrieval strength, context match, source authority, and historical outcome strength.
"""
from app.services.ai.schemas import ConfidenceBreakdown


def calculate_composite_confidence(
    evidence_completeness: float,
    retrieval_strength: float,
    context_match: float,
    source_authority: float,
    historical_outcome_strength: float,
    ai_agreement: float = 0.8,
) -> ConfidenceBreakdown:
    """Calculates composite confidence using the documented heuristic_v1 model.

    Weights:
        - Evidence completeness: 20%
        - Retrieval strength: 15%
        - Context match: 25%
        - Source authority: 20%
        - Historical outcome strength: 15%
        - AI agreement: 5%
    """
    # Clamp all inputs to [0.0, 1.0]
    ev = max(0.0, min(1.0, float(evidence_completeness)))
    ret = max(0.0, min(1.0, float(retrieval_strength)))
    ctx = max(0.0, min(1.0, float(context_match)))
    auth = max(0.0, min(1.0, float(source_authority)))
    out = max(0.0, min(1.0, float(historical_outcome_strength)))
    agr = max(0.0, min(1.0, float(ai_agreement)))

    overall = (
        0.20 * ev
        + 0.15 * ret
        + 0.25 * ctx
        + 0.20 * auth
        + 0.15 * out
        + 0.05 * agr
    )
    overall = round(max(0.05, min(0.99, overall)), 2)

    if overall >= 0.75:
        label = "High"
    elif overall >= 0.45:
        label = "Medium"
    else:
        label = "Low"

    return ConfidenceBreakdown(
        overall=overall,
        evidence_completeness=round(ev, 2),
        retrieval_strength=round(ret, 2),
        context_match=round(ctx, 2),
        source_authority=round(auth, 2),
        historical_outcome_strength=round(out, 2),
        ai_agreement=round(agr, 2),
        confidence_label=label,
        confidence_model_version="heuristic_v1",
    )

