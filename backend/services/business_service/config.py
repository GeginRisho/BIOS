"""
BIOS Business Service Configuration
"""
from backend.shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    PROJECT_NAME: str = "BIOS Business Directory Service"
    API_V1_STR: str = "/api/v1/businesses"

settings = Settings()
