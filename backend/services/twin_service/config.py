"""
BIOS Twin Service Configuration
"""
from backend.shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    PROJECT_NAME: str = "BIOS Digital Twin Scoring Service"
    API_V1_STR: str = "/api/v1/twin"

settings = Settings()
