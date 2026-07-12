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
