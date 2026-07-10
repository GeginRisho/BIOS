"""
BIOS Shared Base Configuration
================================
All microservices inherit from BaseServiceSettings to eliminate
duplicated pydantic_settings boilerplate.
"""
from dotenv import load_dotenv
load_dotenv()

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class BaseServiceSettings(BaseSettings):
    """Enterprise base class for all BIOS service configurations."""

    # ── Runtime mode ──────────────────────────────────────────────────
    BIOS_MOCK_MODE: bool = Field(default=True, validation_alias="BIOS_MOCK_MODE")

    # ── PostgreSQL / SQLite ───────────────────────────────────────────
    POSTGRES_USER: str = Field(default="bios_admin", validation_alias="POSTGRES_USER")
    POSTGRES_PASSWORD: str = Field(default="bios_secure_pwd_2026", validation_alias="POSTGRES_PASSWORD")
    POSTGRES_HOST: str = Field(default="sqlite", validation_alias="POSTGRES_HOST")
    POSTGRES_PORT: str = Field(default="5432", validation_alias="POSTGRES_PORT")
    POSTGRES_DB: str = Field(default="bios_db", validation_alias="POSTGRES_DB")

    # ── Redis ─────────────────────────────────────────────────────────
    REDIS_HOST: str = Field(default="localhost", validation_alias="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, validation_alias="REDIS_PORT")

    # ── JWT Security ──────────────────────────────────────────────────
    JWT_SECRET_KEY: str = Field(
        default="bios_super_secret_signing_key_2026_jwt_token_auth",
        validation_alias="JWT_SECRET_KEY"
    )
    JWT_ALGORITHM: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")

    @property
    def database_url(self) -> str:
        """
        Returns SQLite URL in mock/dev mode, PostgreSQL in production.
        SQLite database is stored in the dedicated database/ folder.
        """
        use_sqlite = (
            self.POSTGRES_HOST == "sqlite"
            or os.environ.get("BIOS_MOCK_MODE", "true").lower() == "true"
            or self.BIOS_MOCK_MODE
        )
        if use_sqlite:
            # Resolve relative to the location of config.py (located in <workspace_root>/backend/shared/config.py)
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            db_dir = os.path.join(base_dir, "database")
            os.makedirs(db_dir, exist_ok=True)
            return f"sqlite+aiosqlite:///{os.path.join(db_dir, f'{self.POSTGRES_DB}.db')}"
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
