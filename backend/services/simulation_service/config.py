"""
BIOS Simulation Service Configuration
"""
from backend.shared.config import BaseServiceSettings


class Settings(BaseServiceSettings):
    PROJECT_NAME: str = "BIOS Earth Commerce Simulator Service"
    API_V1_STR: str = "/api/v1/simulations"

settings = Settings()
