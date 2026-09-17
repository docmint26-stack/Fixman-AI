"""Knowledge seed script for FixMind AI.

Loads curated official documentation and technical troubleshooting guides
into knowledge_documents and knowledge_chunks with vector embeddings.
"""
import asyncio

from app.db.session import Session
from app.services.knowledge.ingestion import KnowledgeIngestor


async def seed_knowledge_base():
    print("FixMind AI — Seeding Curated Knowledge Base...")
    async with Session() as db:
        ingestor = KnowledgeIngestor(db)
        count = await ingestor.ingest_cold_start_seed()
        await db.commit()
        print(f"Successfully seeded {count} authoritative knowledge documents with vector chunks.")


def main():
    asyncio.run(seed_knowledge_base())


if __name__ == "__main__":
    main()

