"""Strict Pydantic schemas for all AI inputs, intermediate structures, and outputs.

Ensures no raw free-form model output is trusted or persisted without strict validation.
"""
from typing import Any, Literal

from pydantic import BaseModel, Field


# Multimodal Normalized Evidence Item (Section 7)
class EvidenceItem(BaseModel):
    id: str
    type: Literal["screenshot", "log", "code", "output", "text", "diagnostic"]
    source: str
    text: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0
    extracted_entities: list[str] = Field(default_factory=list)
    sensitive_content_flags: list[str] = Field(default_factory=list)


# Screenshot Analysis (Section 8)
class ImageAnalysis(BaseModel):
    app_or_framework: str = Field(description="Visible application or framework, e.g. Next.js, React, Windows")
    error_family: str = Field(description="Normalized error family, e.g. hydration mismatch, BSOD, DNS lookup failure")
    visible_message: str = Field(description="Exact or near-exact visible error text")
    error_code: str | None = Field(default=None, description="Visible error code or status, e.g. 500, 0x80070005")
    ui_state: str = Field(description="Current visual state, e.g. error modal, terminal overlay, blank screen")
    environment_context: dict[str, str] = Field(default_factory=dict)
    confidence: float = Field(ge=0.0, le=1.0)


# Likely Cause (Section 6, 22)
class LikelyCause(BaseModel):
    title: str
    explanation: str
    confidence: float = Field(ge=0.0, le=1.0)
    supporting_evidence: list[str] = Field(default_factory=list)


# Problem Analysis (Section 6, 22, 23)
class ProblemAnalysis(BaseModel):
    problem_summary: str
    category: str
    subcategory: str | None = None
    environment_summary: str = ""
    observed_symptoms: list[str] = Field(default_factory=list)
    likely_causes: list[LikelyCause] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)
    search_queries: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)


# Candidate Fix (Section 6, 26, 27)
class CandidateFix(BaseModel):
    id: str | None = None
    title: str
    summary: str
    steps: list[str]
    risk_level: Literal["low", "medium", "high"] = "low"
    effort_level: Literal["low", "medium", "high"] = "low"
    prerequisites: list[str] = Field(default_factory=list)
    rollback_steps: list[str] = Field(default_factory=list)
    is_reversible: bool = True
    requires_root_or_admin: bool = False
    why_it_matches: str
    source_type: Literal["verified_outcome", "official_doc", "curated", "ai_generated"] = "curated"
    confidence: float = Field(ge=0.0, le=1.0)


# Ranked Fix Output (Section 28)
class RankedFixOutput(BaseModel):
    fix_id: str | None = None
    rank: int
    title: str
    summary: str
    steps: list[str]
    risk_level: Literal["low", "medium", "high"]
    effort_level: Literal["low", "medium", "high"]
    source_type: Literal["verified_outcome", "official_doc", "curated", "ai_generated"]
    trust_label: str  # "Outcome-Backed Fix", "Official Guidance", "Curated Fix", "AI Suggestion"
    context_match_score: float = Field(ge=0.0, le=1.0)
    ai_confidence: float = Field(ge=0.0, le=1.0)
    rank_score: float = Field(ge=0.0, le=1.0)
    explanation: str
    why_it_matches: str
    prerequisites: list[str] = Field(default_factory=list)
    rollback_steps: list[str] = Field(default_factory=list)
    requires_admin: bool = False
    verified_success_rate: float | None = None
    sample_size: int = 0
    statistical_status: str = "Insufficient sample"  # e.g. "82% verified success across 41 outcomes" or "Insufficient sample"


# Fix Ranking Result (Section 28)
class FixRankingResult(BaseModel):
    ranked_fixes: list[RankedFixOutput]
    ranking_rationale: str
    similar_cases_considered: int = 0
    top_root_cause_addressed: str = ""


# Composite Confidence Breakdown (Section 31, 32)
class ConfidenceBreakdown(BaseModel):
    overall: float = Field(ge=0.0, le=1.0)
    evidence_completeness: float = Field(ge=0.0, le=1.0)
    retrieval_strength: float = Field(ge=0.0, le=1.0)
    context_match: float = Field(ge=0.0, le=1.0)
    source_authority: float = Field(ge=0.0, le=1.0)
    historical_outcome_strength: float = Field(ge=0.0, le=1.0)
    ai_agreement: float = Field(ge=0.0, le=1.0)
    confidence_label: Literal["High", "Medium", "Low"] = "Medium"
    confidence_model_version: str = "heuristic_v1"


# Outcome Verification Analysis (Section 36-42)
class VerificationAnalysis(BaseModel):
    verification_status: Literal["verified", "partially_verified", "failed", "inconclusive", "pending"]
    verification_method: str  # e.g. "coding_test_diff", "system_recurrent_check", "application_output_diff", "network_diagnostic", "self_report"
    verification_confidence: float = Field(ge=0.0, le=1.0)
    summary: str
    evidence_quality: Literal["strong", "medium", "weak"]
    reproducible_signals: list[str] = Field(default_factory=list)
    conflicting_signals: list[str] = Field(default_factory=list)
    observation_hours_needed: int = 0


# Contribution Scoring (Section 46, 47, 48)
class ContributionScore(BaseModel):
    novelty: float = Field(ge=0.0, le=1.0)
    evidence_quality: float = Field(ge=0.0, le=1.0)
    verification_strength: float = Field(ge=0.0, le=1.0)
    utility: float = Field(ge=0.0, le=1.0)
    fraud_risk: float = Field(ge=0.0, le=1.0)
    duplicate_probability: float = Field(ge=0.0, le=1.0)
    overall_value: float = Field(ge=0.0, le=1.0)
    duplicate_fix_id: str | None = None
    duplicate_summary: str | None = None
    flags: list[str] = Field(default_factory=list)
    recommendation: Literal["accept", "suggest_improvement", "needs_manual_review", "reject"] = "accept"
    model_version: str = "contrib_v1"


# Grounded Facts Context (Section 33 - Hallucination Control)
class GroundedFact(BaseModel):
    source_type: str
    source_id: str
    title: str
    content_snippet: str
    verified_successes: int = 0
    verified_failures: int = 0
    authority_weight: float = 1.0


class GroundedContext(BaseModel):
    facts: list[GroundedFact] = Field(default_factory=list)
    similar_case_outcomes: list[dict[str, Any]] = Field(default_factory=list)

