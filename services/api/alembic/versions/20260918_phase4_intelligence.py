"""Phase 4 Real FixMind AI Intelligence Engine schema.

Adds pgvector extension, knowledge base tables, embeddings, outcome intelligence,
diagnosis sources provenance, and AI runs tracking.
"""
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "20260918_phase4_intelligence"
down_revision = "20260917_rls"
branch_labels = None
depends_on = None

json_type = sa.JSON().with_variant(JSONB(), "postgresql")


def vector_col(dim=1536):
    return sa.JSON().with_variant(Vector(dim), "postgresql")


def upgrade():
    bind = op.get_bind()
    is_pg = bind.dialect.name == "postgresql"

    if is_pg:
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 1. knowledge_documents
    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.Uuid(as_uuid=False), primary_key=True),
        sa.Column("source_type", sa.String(255), nullable=False, server_default="curated"),
        sa.Column("source_name", sa.String(255), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("category", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("trust_level", sa.String(50), nullable=False, server_default="curated"),
        sa.Column("version", sa.String(50), nullable=False, server_default="1.0"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 2. knowledge_chunks
    op.create_table(
        "knowledge_chunks",
        sa.Column("id", sa.Uuid(as_uuid=False), primary_key=True),
        sa.Column("document_id", sa.Uuid(as_uuid=False), sa.ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", vector_col(1536), nullable=True),
        sa.Column("metadata", json_type, nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_knowledge_chunks_doc", "knowledge_chunks", ["document_id"])

    # 3. case_embeddings
    op.create_table(
        "case_embeddings",
        sa.Column("id", sa.Uuid(as_uuid=False), primary_key=True),
        sa.Column("case_id", sa.Uuid(as_uuid=False), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("embedding", vector_col(1536), nullable=True),
        sa.Column("embedding_model", sa.String(255), nullable=False, server_default="text-embedding-3-small"),
        sa.Column("embedding_version", sa.String(50), nullable=False, server_default="v1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_case_embeddings_case", "case_embeddings", ["case_id"])

    # 4. fix_embeddings
    op.create_table(
        "fix_embeddings",
        sa.Column("id", sa.Uuid(as_uuid=False), primary_key=True),
        sa.Column("fix_id", sa.Uuid(as_uuid=False), sa.ForeignKey("fixes.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("embedding", vector_col(1536), nullable=True),
        sa.Column("embedding_model", sa.String(255), nullable=False, server_default="text-embedding-3-small"),
        sa.Column("embedding_version", sa.String(50), nullable=False, server_default="v1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_fix_embeddings_fix", "fix_embeddings", ["fix_id"])

    # 5. outcome_intelligence
    op.create_table(
        "outcome_intelligence",
        sa.Column("id", sa.Uuid(as_uuid=False), primary_key=True),
        sa.Column("source_outcome_id", sa.Uuid(as_uuid=False), sa.ForeignKey("outcomes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("fix_id", sa.Uuid(as_uuid=False), sa.ForeignKey("fixes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("normalized_context", json_type, nullable=False, server_default="{}"),
        sa.Column("category", sa.String(255), nullable=False),
        sa.Column("software", sa.String(255), nullable=True),
        sa.Column("version_range", sa.String(255), nullable=True),
        sa.Column("os", sa.String(255), nullable=True),
        sa.Column("error_family", sa.String(255), nullable=False),
        sa.Column("result", sa.String(255), nullable=False),
        sa.Column("verification_strength", sa.String(255), nullable=False, server_default="medium"),
        sa.Column("confidence", sa.Numeric(18, 6), nullable=False, server_default="0.5"),
        sa.Column("embedding", vector_col(1536), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_outcome_intelligence_fix", "outcome_intelligence", ["fix_id"])
    op.create_index("ix_outcome_intelligence_cat_err", "outcome_intelligence", ["category", "error_family"])

    # 6. diagnosis_sources
    op.create_table(
        "diagnosis_sources",
        sa.Column("id", sa.Uuid(as_uuid=False), primary_key=True),
        sa.Column("diagnosis_id", sa.Uuid(as_uuid=False), sa.ForeignKey("diagnosis_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_type", sa.String(255), nullable=False),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column("relevance_score", sa.Numeric(18, 6), nullable=True),
        sa.Column("usage_type", sa.String(255), nullable=False, server_default="context"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_diagnosis_sources_diag", "diagnosis_sources", ["diagnosis_id"])

    # 7. ai_runs
    op.create_table(
        "ai_runs",
        sa.Column("id", sa.Uuid(as_uuid=False), primary_key=True),
        sa.Column("user_id", sa.Uuid(as_uuid=False), sa.ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("case_id", sa.Uuid(as_uuid=False), sa.ForeignKey("cases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("task_type", sa.String(255), nullable=False),
        sa.Column("provider", sa.String(255), nullable=False),
        sa.Column("model", sa.String(255), nullable=False),
        sa.Column("prompt_version", sa.String(255), nullable=False, server_default="1.0"),
        sa.Column("input_token_count", sa.Integer(), nullable=True),
        sa.Column("output_token_count", sa.Integer(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("cost_usd", sa.Numeric(18, 6), nullable=True),
        sa.Column("status", sa.String(255), nullable=False, server_default="completed"),
        sa.Column("error_code", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ai_runs_user_task", "ai_runs", ["user_id", "task_type"])

    # RLS policies on PostgreSQL
    if is_pg:
        tables = [
            "knowledge_documents",
            "knowledge_chunks",
            "case_embeddings",
            "fix_embeddings",
            "outcome_intelligence",
            "diagnosis_sources",
            "ai_runs",
        ]
        for table in tables:
            op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
            op.execute(f"""DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
            EXECUTE 'REVOKE ALL ON {table} FROM anon, authenticated'; END IF; END $$;""")


def downgrade():
    op.drop_table("ai_runs")
    op.drop_table("diagnosis_sources")
    op.drop_table("outcome_intelligence")
    op.drop_table("fix_embeddings")
    op.drop_table("case_embeddings")
    op.drop_table("knowledge_chunks")
    op.drop_table("knowledge_documents")

