"""
BIOS Search Service Configuration
"""
from backend.shared.config import BaseServiceSettings
from pydantic import Field


class Settings(BaseServiceSettings):
    PROJECT_NAME: str = "BIOS Search & Retrieval Service"
    API_V1_STR: str = "/api/v1/search"
    ELASTICSEARCH_HOST: str = Field(default="http://localhost:9200", validation_alias="ELASTICSEARCH_HOST")
    QDRANT_HOST: str = Field(default="localhost", validation_alias="QDRANT_HOST")
    QDRANT_PORT: int = Field(default=6333, validation_alias="QDRANT_PORT")

settings = Settings()
