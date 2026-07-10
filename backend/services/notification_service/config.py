"""
BIOS Notification Service Configuration
"""
from backend.shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    PROJECT_NAME: str = "BIOS Live Notification Service"
    API_V1_STR: str = "/api/v1/notifications"

settings = Settings()
