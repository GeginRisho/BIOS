"""
BIOS Auth Service Configuration
"""
from backend.shared.config import BaseServiceSettings
from pydantic import Field


class Settings(BaseServiceSettings):
    PROJECT_NAME: str = "BIOS Auth Service"
    API_V1_STR: str = "/api/v1/auth"
    SECRET_KEY: str = Field(default="bios_super_secret_signing_key_2026_jwt_token_auth", validation_alias="JWT_SECRET_KEY")
    ALGORITHM: str = "HS256"
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

settings = Settings()
