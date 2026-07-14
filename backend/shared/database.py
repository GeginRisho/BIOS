"""
BIOS Shared Database Factory
==============================
Provides a reusable async SQLAlchemy engine + session factory
so every microservice gets consistent connection behaviour.
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base


def make_engine(database_url: str, echo: bool = False):
    """Create an async SQLAlchemy engine with sane defaults."""
    connect_args = {}
    pool_args = {}
    if "sqlite" in database_url:
        connect_args["check_same_thread"] = False
    else:
        # Production Postgres tuning to avoid stale pools & idle disconnects
        pool_args["pool_size"] = 5
        pool_args["max_overflow"] = 10
        pool_args["pool_recycle"] = 280
        pool_args["pool_pre_ping"] = True
        
    return create_async_engine(
        database_url, 
        echo=echo, 
        connect_args=connect_args,
        **pool_args
    )


def make_session_factory(engine):
    """Return an async session factory bound to the given engine."""
    return async_sessionmaker(bind=engine, expire_on_commit=False)


def make_base():
    """Return a fresh declarative base for ORM models."""
    return declarative_base()


async def get_db_dependency(session_factory):
    """
    FastAPI dependency generator. Usage:
        async def route(db: AsyncSession = Depends(get_db)):
    """
    async def _get_db() -> AsyncSession:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    return _get_db
