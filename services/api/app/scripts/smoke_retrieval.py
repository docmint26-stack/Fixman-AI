"""Run against a migrated local DB. Use --require-postgres to prohibit fallback."""
import argparse
import asyncio

from sqlalchemy import text

from app.db.session import Session, engine
from app.services.ai.provider import MockAIProvider
from app.services.knowledge.ingestion import KnowledgeIngestor
from app.services.retrieval.knowledge_search import KnowledgeSearch


async def smoke(require_postgres=False):
    if require_postgres and engine.dialect.name != "postgresql":
        raise RuntimeError("Native pgvector smoke requires a PostgreSQL DATABASE_URL")
    async with Session() as db:
        if engine.dialect.name == "postgresql":
            assert await db.scalar(text("SELECT extversion FROM pg_extension WHERE extname='vector'"))
        provider = MockAIProvider()
        count = await KnowledgeIngestor(db, provider).ingest_cold_start_seed()
        await db.commit()
        for query, expected in [("Next.js hydration mismatch", "hydration"),
                                ("Python ModuleNotFoundError", "python")]:
            results = await KnowledgeSearch(db).search(await provider.generate_embedding(query),
                                                      keywords=query.split(), min_similarity=0, limit=3)
            assert results and expected in results[0]["title"].lower(), results
            print(f"{engine.dialect.name}: {query} -> {results[0]['title']}")
        print(f"PASS: {count} curated documents; no fabricated outcome statistics")
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-postgres", action="store_true")
    asyncio.run(smoke(parser.parse_args().require_postgres))
