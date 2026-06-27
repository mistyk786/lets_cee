"""Runtime configuration for the Sloth.ai scoring engine."""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.constants import DEFAULT_OPENAI_MAX_TOKENS, DEFAULT_OPENAI_MODEL


class Settings(BaseSettings):
    """Environment-backed settings for deployment and local development."""

    model_config = SettingsConfigDict(
        env_file=(".env" if os.getenv("SLOTH_SKIP_ENV_FILE") != "1" else None),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    cursor_api_key: str | None = Field(default=None, alias="CURSOR_API_KEY")
    openai_model: str = Field(default=DEFAULT_OPENAI_MODEL, alias="OPENAI_MODEL")
    cursor_model: str | None = Field(default=None, alias="CURSOR_MODEL")
    openai_max_tokens: int = Field(
        default=DEFAULT_OPENAI_MAX_TOKENS,
        alias="OPENAI_MAX_TOKENS",
        ge=256,
        le=8192,
    )

    imap_host: str | None = Field(default=None, alias="IMAP_HOST")
    imap_port: int = Field(default=993, alias="IMAP_PORT")
    imap_user: str | None = Field(default=None, alias="IMAP_USER")
    imap_password: str | None = Field(default=None, alias="IMAP_PASSWORD")
    imap_mailbox: str = Field(default="INBOX", alias="IMAP_MAILBOX")
    imap_max_messages: int = Field(default=80, alias="IMAP_MAX_MESSAGES", ge=10, le=500)

    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    environment: str = Field(default="development", alias="SLOTH_ENV")

    @model_validator(mode="after")
    def _merge_keys_and_imap_password(self) -> Settings:
        if not self.openai_api_key and self.cursor_api_key:
            self.openai_api_key = self.cursor_api_key
        if self.cursor_model and self.cursor_model != DEFAULT_OPENAI_MODEL:
            self.openai_model = self.cursor_model
        if self.imap_password:
            self.imap_password = self.imap_password.replace(" ", "")
        if self.imap_host:
            self.imap_host = self.imap_host.strip()
        if self.imap_user:
            self.imap_user = self.imap_user.strip()
        return self

    @property
    def openai_configured(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def imap_configured(self) -> bool:
        return bool(self.imap_host and self.imap_user and self.imap_password)


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance (safe to call from services)."""
    return Settings()


def reset_settings_cache() -> None:
    """Clear cached settings (use in tests when env vars change)."""
    get_settings.cache_clear()
