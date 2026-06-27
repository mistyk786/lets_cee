"""Runtime configuration for the Sloth.ai scoring engine."""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.constants import (
    DEFAULT_CURSOR_MODEL,
    DEFAULT_CURSOR_POLL_INTERVAL_SECONDS,
    DEFAULT_CURSOR_TIMEOUT_SECONDS,
    DEFAULT_INBOX_POLL_INTERVAL_SECONDS,
)


class Settings(BaseSettings):
    """Environment-backed settings for deployment and local development."""

    model_config = SettingsConfigDict(
        env_file=(".env" if os.getenv("SLOTH_SKIP_ENV_FILE") != "1" else None),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    cursor_api_key: str | None = Field(default=None, alias="CURSOR_API_KEY")
    # Legacy alias — older docs used OPENAI_API_KEY; still accepted.
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    cursor_model: str = Field(default=DEFAULT_CURSOR_MODEL, alias="CURSOR_MODEL")
    cursor_timeout_seconds: int = Field(
        default=DEFAULT_CURSOR_TIMEOUT_SECONDS,
        alias="CURSOR_TIMEOUT_SECONDS",
        ge=30,
        le=600,
    )
    cursor_poll_interval_seconds: float = Field(
        default=DEFAULT_CURSOR_POLL_INTERVAL_SECONDS,
        alias="CURSOR_POLL_INTERVAL_SECONDS",
        ge=0.5,
        le=30.0,
    )

    imap_host: str | None = Field(default=None, alias="IMAP_HOST")
    imap_port: int = Field(default=993, alias="IMAP_PORT")
    imap_user: str | None = Field(default=None, alias="IMAP_USER")
    imap_password: str | None = Field(default=None, alias="IMAP_PASSWORD")
    imap_mailbox: str = Field(default="INBOX", alias="IMAP_MAILBOX")
    imap_max_messages: int = Field(default=80, alias="IMAP_MAX_MESSAGES", ge=10, le=500)

    inbox_poll_enabled: bool = Field(default=True, alias="INBOX_POLL_ENABLED")
    inbox_poll_interval_seconds: int = Field(
        default=DEFAULT_INBOX_POLL_INTERVAL_SECONDS,
        alias="INBOX_POLL_INTERVAL_SECONDS",
        ge=30,
        le=3600,
    )

    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    environment: str = Field(default="development", alias="SLOTH_ENV")

    @model_validator(mode="after")
    def _merge_legacy_api_key(self) -> Settings:
        if not self.cursor_api_key and self.openai_api_key:
            self.cursor_api_key = self.openai_api_key
        # Gmail shows app passwords as "abcd efgh ijkl mnop"; IMAP wants no spaces.
        if self.imap_password:
            self.imap_password = self.imap_password.replace(" ", "")
        return self

    @property
    def cursor_configured(self) -> bool:
        return bool(self.cursor_api_key)

    @property
    def openai_configured(self) -> bool:
        """Backward-compatible alias for ``cursor_configured``."""
        return self.cursor_configured


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance (safe to call from services)."""
    return Settings()


def reset_settings_cache() -> None:
    """Clear cached settings (use in tests when env vars change)."""
    get_settings.cache_clear()
