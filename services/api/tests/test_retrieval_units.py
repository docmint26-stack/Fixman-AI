"""Unit tests for retrieval, ranking, and privacy-preserving embedding utilities."""
from decimal import Decimal
from uuid import uuid4

import pytest

from app.db.models import Fix, KnowledgeChunk, KnowledgeDocument, OutcomeIntelligence
from app.db.session import Session
from app.services.ai.orchestrator import normalize_source_type
from app.services.ai.provider import generate_deterministic_embedding
from app.services.retrieval.embeddings import (
    build_case_embedding_text,
    cosine_similarity,
    sanitize_embedding_input,
)
from app.services.retrieval.knowledge_search import KnowledgeSearch
from app.services.retrieval.reranker import FixRanker, check_destructive_content
from app.services.retrieval.similar_cases import SimilarCaseRetriever


def test_cosine_similarity_bounds_and_mismatch():
    vector = generate_deterministic_embedding("hydration mismatch")
    assert cosine_similarity(vector, vector) == pytest.approx(1.0, abs=1e-6)
    assert cosine_similarity(vector, [0.0] * 1536) == 0.0
    assert cosine_similarity(vector, [1.0, 2.0]) == 0.0
    assert cosine_similarity([], vector) == 0.0


def test_cosine_accepts_native_pgvector_array():
    from pgvector.sqlalchemy import Vector
    from sqlalchemy.dialects.postgresql import dialect
    vector = Vector(3).result_processor(dialect(), None)("[1,0,0]")
    assert cosine_similarity(vector, vector) == pytest.approx(1.0)


def test_sanitize_embedding_input_removes_paths_and_secrets():
    raw = r"Error at C:\Users\alice\secret-project\app.py password=hunter2secret"
    sanitized = sanitize_embedding_input(raw)
    assert r"C:\Users\alice" not in sanitized
    assert "hunter2secret" not in sanitized
    assert "[PATH]" in sanitized


def test_build_case_embedding_text_includes_signatures():
    text = build_case_embedding_text(
        title="Crash on start",
        description="App exits immediately",
        category="Coding Error",
        environment={"os": "Windows 11", "software": "Next.js"},
        error_signatures=["TypeError: x is undefined"],
    )
    assert "CATEGORY: Coding Error" in text
    assert "Windows 11" in text
    assert "TypeError" in text


def test_source_type_normalization_maps_platform_vocabulary():
    assert normalize_source_type("official") == "official_doc"
    assert normalize_source_type("community_verified") == "verified_outcome"
    assert normalize_source_type("internal") == "curated"
    assert normalize_source_type("AI_GENERATED") == "ai_generated"
    assert normalize_source_type(None) == "curated"


def test_check_destructive_content_flags_hazardous_operations():
    flagged, reason = check_destructive_content("Run rm -rf / to clean up")
    assert flagged is True
    assert reason is not None
    safe, reason2 = check_destructive_content("Restart the network service")
    assert safe is False
    assert reason2 is None


def test_fix_ranker_enforces_minimum_sample_threshold():
    ranker = FixRanker(min_sample=5)
    rate, status = ranker.calculate_success_metrics(success_count=2, failure_count=1)
    assert rate is None
    assert "Not enough" in status

    rate2, status2 = ranker.calculate_success_metrics(success_count=5, failure_count=0)
    assert rate2 == 1.0
    assert "5 outcomes" in status2


def test_fix_ranker_trust_labels_and_risk_penalties():
    ranker = FixRanker(min_sample=5)
    candidates = [
        {"id": "a", "title": "Official reset", "summary": "", "steps": [], "source_type": "official_doc", "risk_level": "low", "effort_level": "low", "success_count": 0, "failure_count": 0},
        {"id": "b", "title": "Proven fix", "summary": "", "steps": [], "source_type": "curated", "risk_level": "low", "effort_level": "low", "success_count": 8, "failure_count": 1},
        {"id": "c", "title": "Run rm -rf /", "summary": "", "steps": [], "source_type": "ai_generated", "risk_level": "high", "effort_level": "high", "success_count": 0, "failure_count": 0},
    ]
    ranked = ranker.score_and_rank_fixes(candidates, context_features={})
    labels = {item.fix_id: item.trust_label for item in ranked}
    assert labels["b"] == "Outcome-Backed Fix"
    assert labels["a"] == "Official Guidance"
    assert labels["c"] == "AI Suggestion"
    assert ranked[0].fix_id == "b"
    assert all(item.rank_score > 0 for item in ranked)
    assert {item.rank for item in ranked} == {1, 2, 3}


async def test_knowledge_search_ranks_matching_chunks(migrated_db):
    async with Session() as db:
        doc = KnowledgeDocument(
            id=str(uuid4()),
            source_type="official",
            source_name="Next.js Docs",
            title="Hydration mismatch",
            category="Coding Error",
            content="Stabilize client state to avoid hydration mismatch.",
            content_hash=uuid4().hex,
        )
        db.add(doc)
        await db.flush()
        db.add(KnowledgeChunk(id=str(uuid4()), document_id=doc.id, content="Use stable values during SSR and hydration.", embedding=generate_deterministic_embedding("next.js hydration mismatch ssr")))
        db.add(KnowledgeChunk(id=str(uuid4()), document_id=doc.id, content="Entirely unrelated accounting guidance.", embedding=generate_deterministic_embedding("payroll ledger reconciliation")))
        await db.commit()

    async with Session() as db:
        results = await KnowledgeSearch(db).search(
            query_embedding=generate_deterministic_embedding("next.js hydration mismatch ssr"),
            category="Coding Error",
            keywords=["hydration"],
            limit=5,
        )
    assert results
    assert "hydration" in results[0]["content"].lower()
    assert all(result["document_id"] for result in results)


async def test_similar_case_retriever_hybrid_scoring(migrated_db):
    fix_id = str(uuid4())
    async with Session() as db:
        db.add(Fix(
            id=fix_id,
            title="Stabilize hydration state",
            summary="summary",
            instructions=["step"],
            category="Coding Error",
            source_type="curated",
            success_count=6,
            failure_count=0,
        ))
        db.add(OutcomeIntelligence(
            id=str(uuid4()),
            fix_id=fix_id,
            normalized_context={},
            category="Coding Error",
            software="Next.js",
            os="Windows 11",
            error_family="React / Next.js",
            result="resolved",
            verification_strength="strong",
            confidence=Decimal("0.90"),
            embedding=generate_deterministic_embedding("next.js hydration mismatch ssr"),
        ))
        await db.commit()

    async with Session() as db:
        results = await SimilarCaseRetriever(db).find_similar_cases(
            query_embedding=generate_deterministic_embedding("next.js hydration mismatch ssr"),
            category="Coding Error",
            software="Next.js",
            os_name="Windows 11",
            error_family="React / Next.js",
        )
    assert results
    assert results[0]["fix_title"] == "Stabilize hydration state"
    assert results[0]["verified_count"] == 6
    assert results[0]["similarity_score"] > 0
