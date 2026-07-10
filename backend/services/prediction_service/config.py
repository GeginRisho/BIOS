"""
BIOS Prediction Service Configuration
"""
from backend.shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    PROJECT_NAME: str = "BIOS Predictive Analytics Service"
    API_V1_STR: str = "/api/v1/predictions"

settings = Settings()
