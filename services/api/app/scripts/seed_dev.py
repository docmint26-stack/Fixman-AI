import asyncio
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select

from app.core.config import get_settings
from app.db.models import Fix
from app.db.session import Session

SEEDS = [
    ("React hydration mismatch", "Coding Error", ["Render a stable placeholder on the server.", "Set browser-dependent values in useEffect after mount.", "Run hydration tests and compare console output."]),
    ("Python ModuleNotFoundError", "Coding Error", ["Confirm the active Python interpreter and virtual environment.", "Install the required dependency in that environment.", "Re-run the failing import and tests."]),
    ("Docker port conflict", "Coding Error", ["Identify the process using the port.", "Choose an unused host port in your Docker mapping.", "Restart the container and test its endpoint."]),
    ("Windows Wi-Fi driver regression", "Network & Wi-Fi", ["Record the adapter model and current driver version.", "Use the manufacturer's supported driver rollback procedure.", "Reconnect and monitor connectivity; keep recovery access available."]),
    ("Excel XLOOKUP mismatch", "Apps & Productivity", ["Check text versus numeric types in lookup columns.", "Normalize leading and trailing whitespace.", "Test exact match on a known value."]),
    ("Git merge conflict", "Coding Error", ["Commit or back up your work.", "Review both sides of each conflict and remove conflict markers.", "Run tests before completing the merge."]),
]


async def seed():
    if get_settings().app_env != "development":
        raise RuntimeError("Development seeds are disabled outside development.")
    async with Session() as db, db.begin():
        for title, category, steps in SEEDS:
            identifier = str(uuid5(NAMESPACE_URL, "puvexa:curated:" + title))
            if not await db.scalar(select(Fix).where(Fix.id == identifier)):
                db.add(Fix(id=identifier, title=title, summary="Curated development guidance. No verified outcome statistics yet.", category=category, instructions=steps))
    print("Six curated fixes available. No users, passwords, rewards, or success statistics seeded.")


if __name__ == "__main__":
    asyncio.run(seed())
