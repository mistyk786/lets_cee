"""Request-scoped inbox identity and IMAP settings."""

from __future__ import annotations

from contextvars import ContextVar

from app.config import Settings, get_settings

_effective_settings: ContextVar[Settings | None] = ContextVar(
    "effective_settings", default=None
)
_inbox_context_key: ContextVar[str] = ContextVar("inbox_context_key", default="demo")


def set_effective_settings(settings: Settings | None) -> None:
    _effective_settings.set(settings)


def get_effective_settings() -> Settings:
    override = _effective_settings.get()
    if override is not None:
        return override
    return get_settings()


def set_inbox_context_key(key: str) -> None:
    _inbox_context_key.set(key)


def get_inbox_context_key() -> str:
    return _inbox_context_key.get()


def capture_request_context() -> tuple[str, Settings | None]:
    """Snapshot context for background threads (async inbox scan)."""
    key = get_inbox_context_key()
    settings = _effective_settings.get()
    if settings is not None:
        return key, settings.model_copy()
    return key, None


def apply_request_context(key: str, settings: Settings | None) -> None:
    set_inbox_context_key(key)
    set_effective_settings(settings)
