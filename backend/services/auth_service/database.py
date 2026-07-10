import logging
from backend.services.auth_service.config import settings
from backend.shared.database import make_engine, make_session_factory, get_db_dependency
from backend.shared.models import Base

logger = logging.getLogger(__name__)

engine = make_engine(settings.database_url)
SessionLocal = make_session_factory(engine)

# Dependency generator function
async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {str(e)}")
            raise
        finally:
            await session.close()

