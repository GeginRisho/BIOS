"""
BIOS Agent Service Configuration
"""
from backend.shared.config import BaseServiceSettings
from pydantic import Field


class Settings(BaseServiceSettings):
    PROJECT_NAME: str = "BIOS AI Agent Coordinator Service"
    API_V1_STR: str = "/api/v1/agents"
    LLM_PROVIDER: str = Field(default="mock", validation_alias="LLM_PROVIDER")
    OPENAI_API_KEY: str = Field(default="sk-mock-key-for-local-validation-only-12345", validation_alias="OPENAI_API_KEY")
    OLLAMA_HOST: str = Field(default="http://localhost:11434", validation_alias="OLLAMA_HOST")
    CRAWLER_SERVICE_URL: str = Field(default="http://localhost:8005", validation_alias="CRAWLER_SERVICE_URL")
    KG_SERVICE_URL: str = Field(default="http://localhost:8003", validation_alias="KG_SERVICE_URL")
    TWIN_SERVICE_URL: str = Field(default="http://localhost:8004", validation_alias="TWIN_SERVICE_URL")

settings = Settings()
