"""Knowledge ingestion and semantic chunking service.

Normalizes, deduplicates, and chunks technical documentation into
knowledge_documents and knowledge_chunks with vector embeddings.
"""
import hashlib
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import KnowledgeChunk, KnowledgeDocument
from app.services.ai.provider import AIProvider, get_ai_provider


def compute_content_hash(text: str) -> str:
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


class KnowledgeIngestor:
    def __init__(self, db: AsyncSession, provider: AIProvider | None = None):
        self.db = db
        self.provider = provider or get_ai_provider()

    async def ingest_document(
        self,
        title: str,
        category: str,
        content: str,
        source_name: str,
        source_type: str = "curated",
        source_url: str | None = None,
        trust_level: str = "curated",
        chunks: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> KnowledgeDocument:
        """Ingests a document and its semantic chunks, generating vector embeddings."""
        content_hash = compute_content_hash(content)

        # Check for existing document
        existing = await self.db.scalar(
            select(KnowledgeDocument).where(KnowledgeDocument.content_hash == content_hash)
        )
        if existing:
            return existing

        doc = KnowledgeDocument(
            id=str(uuid4()),
            title=title,
            category=category,
            content=content,
            content_hash=content_hash,
            source_name=source_name,
            source_type=source_type,
            source_url=source_url,
            trust_level=trust_level,
        )
        self.db.add(doc)
        await self.db.flush()

        # Generate semantic chunks if not provided
        chunk_texts = chunks or [p.strip() for p in content.split("\n\n") if p.strip()]
        if not chunk_texts:
            chunk_texts = [content]

        # Batch generate embeddings
        embeddings = await self.provider.batch_generate_embeddings(chunk_texts)

        for idx, (text, emb) in enumerate(zip(chunk_texts, embeddings)):
            chunk = KnowledgeChunk(
                id=str(uuid4()),
                document_id=doc.id,
                chunk_index=idx,
                content=text,
                embedding=emb,
                metadata_json=metadata or {"title": title, "category": category},
            )
            self.db.add(chunk)

        await self.db.flush()
        return doc

    async def ingest_cold_start_seed(self) -> int:
        """Loads the curated cold_start fixtures into the database."""
        from app.services.knowledge.cold_start import COLD_START_KNOWLEDGE

        count = 0
        for item in COLD_START_KNOWLEDGE:
            await self.ingest_document(
                title=item["title"],
                category=item["category"],
                content=item["content"],
                source_name=item["source_name"],
                source_type=item["source_type"],
                source_url=item.get("source_url"),
                trust_level=item.get("trust_level", "official"),
                chunks=item.get("chunks"),
            )
            count += 1
        return count

