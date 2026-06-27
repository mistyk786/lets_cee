"""Runtime configuration for the Sloth.ai scoring engine."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.constants import DEFAULT_OPENAI_MAX_TOKENS, DEFAULT_OPENAI_MODEL


class Settings(BaseSettings):
    """Environment-backed settings for deployment and local development."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_model: str = Field(default=DEFAULT_OPENAI_MODEL, alias="OPENAI_MODEL")
    openai_max_tokens: int = Field(
        default=DEFAULT_OPENAI_MAX_TOKENS,
        alias="OPENAI_MAX_TOKENS",
        ge=256,
        le=8192,
    )
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    environment: str = Field(default="development", alias="SLOTH_ENV")

    @property
    def openai_configured(self) -> bool:
        return bool(self.openai_api_key)


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance (safe to call from services)."""
    return Settings()


def reset_settings_cache() -> None:
    """Clear cached settings (use in tests when env vars change)."""
    get_settings.cache_clear()
