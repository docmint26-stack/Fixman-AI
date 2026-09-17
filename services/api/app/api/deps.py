from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Identity, get_identity
from app.db.models import Profile, UserSettings
from app.db.session import get_db


async def get_current_user(identity: Identity = Depends(get_identity), db: AsyncSession = Depends(get_db)):
    profile = await db.scalar(select(Profile).where(Profile.auth_user_id == identity.id))
    if profile is None:
        # Supabase UUID is also the application profile ID; never accept it from request bodies.
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        from sqlalchemy.dialects.sqlite import insert as sqlite_insert
        insert = pg_insert if db.bind.dialect.name == "postgresql" else sqlite_insert
        await db.execute(insert(Profile).values(id=identity.id, auth_user_id=identity.id, display_name=identity.display_name).on_conflict_do_nothing())
        await db.execute(insert(UserSettings).values(user_id=identity.id).on_conflict_do_nothing())
        profile = await db.scalar(select(Profile).where(Profile.auth_user_id == identity.id))
    return profile
