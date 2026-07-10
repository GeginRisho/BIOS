"""
BIOS Kg Service Configuration
"""
from backend.shared.config import BaseServiceSettings
from pydantic import Field


class Settings(BaseServiceSettings):
    PROJECT_NAME: str = "BIOS Knowledge Graph Service"
    API_V1_STR: str = "/api/v1/graph"
    NEO4J_URI: str = Field(default="bolt://localhost:7687", validation_alias="NEO4J_URI")
    NEO4J_USER: str = Field(default="neo4j", validation_alias="NEO4J_USER")
    NEO4J_PASSWORD: str = Field(default="bios_graph_secure_2026", validation_alias="NEO4J_PASSWORD")

settings = Settings()
