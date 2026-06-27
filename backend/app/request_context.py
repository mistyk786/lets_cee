"""Request-scoped settings (session IMAP overrides server .env)."""

from __future__ import annotations

from contextvars import ContextVar

from app.config import Settings, get_settings

_effective_settings: ContextVar[Settings | None] = ContextVar(
    "effective_settings", default=None
)


def set_effective_settings(settings: Settings | None) -> None:
    _effective_settings.set(settings)


def get_effective_settings() -> Settings:
    override = _effective_settings.get()
    if override is not None:
        return override
    return get_settings()
