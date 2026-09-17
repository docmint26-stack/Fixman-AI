from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings

engine = create_async_engine(get_settings().database_url, pool_pre_ping=True)
if engine.dialect.name == "sqlite":
    @event.listens_for(engine.sync_engine, "connect")
    def sqlite_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

Session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    async with Session() as session, session.begin():
        yield session
