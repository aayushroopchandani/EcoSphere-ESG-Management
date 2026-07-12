import json
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        enable_decoding=False,
        extra="ignore",
    )

    app_name: str = "EcoSphere API"
    api_prefix: str = "/api"

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "ecosphere"

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    clerk_jwks_url: str | None = None
    clerk_issuer: str | None = None
    clerk_authorized_parties: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )

    openai_api_key: str | None = None
    openai_base_url: str | None = None
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o-mini"

    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    governance_llm_model: str = "google/gemini-2.5-flash-lite"

    qdrant_url: str | None = None
    qdrant_api_key: str | None = None
    qdrant_host: str | None = None
    qdrant_port: int = 6333
    qdrant_path: str | None = "qdrant_storage"
    governance_qdrant_collection: str = "governance_policy_chunks"

    governance_rag_chunk_size: int = 1200
    governance_rag_chunk_overlap: int = 180
    governance_rag_top_k: int = 8

    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None

    @field_validator("cors_origins", "clerk_authorized_parties", mode="before")
    @classmethod
    def parse_string_list(cls, value: Any) -> Any:
        if isinstance(value, str):
            stripped = value.strip()

            if stripped.startswith("["):
                return json.loads(stripped)

            return [item.strip() for item in stripped.split(",") if item.strip()]

        return value


settings = Settings()
