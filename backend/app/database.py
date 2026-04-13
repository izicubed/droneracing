from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.base import Base
from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Re-export Base so existing imports still work
__all__ = ["Base", "engine", "AsyncSessionLocal", "get_db"]


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
