"""
BIOS Crawler Service Configuration
"""
from backend.shared.config import BaseServiceSettings
from pydantic import Field


class Settings(BaseServiceSettings):
    PROJECT_NAME: str = "BIOS Crawler Service"
    API_V1_STR: str = "/api/v1/crawler"
    MONGO_USER: str = Field(default="bios_mongo", validation_alias="MONGO_USER")
    MONGO_PASSWORD: str = Field(default="bios_mongo_secure_2026", validation_alias="MONGO_PASSWORD")
    MONGO_HOST: str = Field(default="localhost", validation_alias="MONGO_HOST")
    MONGO_PORT: str = Field(default="27017", validation_alias="MONGO_PORT")
    MONGO_DB: str = Field(default="bios_raw_db", validation_alias="MONGO_DB")
    USER_AGENT: str = Field(default="BIOS-Crawler/1.0", validation_alias="CRAWLER_USER_AGENT")
    KAFKA_BOOTSTRAP_SERVERS: str = Field(default="localhost:9092", validation_alias="KAFKA_BOOTSTRAP_SERVERS")

    @property
    def mongo_uri(self) -> str:
        return f"mongodb://{self.MONGO_USER}:{self.MONGO_PASSWORD}@{self.MONGO_HOST}:{self.MONGO_PORT}/{self.MONGO_DB}"

settings = Settings()

