"""Shared pytest fixtures.

Isolation env vars are set at import time (before any ``app`` module is
imported) because some modules construct settings at import — e.g.
``analysis_service._engine = SlothEngine()`` calls ``get_settings()`` eagerly.
If we only set these inside a fixture, that import would read the developer's
real ``.env`` (live Cursor key + IMAP creds) and tests would hit the network.
"""

from __future__ import annotations

import os

os.environ.setdefault("SLOTH_SKIP_ENV_FILE", "1")
os.environ["SLOTH_SKIP_ENV_FILE"] = "1"
os.environ["INBOX_POLL_ENABLED"] = "false"
os.environ["CURSOR_API_KEY"] = ""
os.environ["OPENAI_API_KEY"] = ""
for _imap_var in ("IMAP_HOST", "IMAP_USER", "IMAP_PASSWORD"):
    os.environ.pop(_imap_var, None)

import pytest

from app.config import reset_settings_cache


@pytest.fixture(autouse=True)
def _isolate_settings_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep each test on inline config only (no .env, no live services)."""
    monkeypatch.setenv("SLOTH_SKIP_ENV_FILE", "1")
    monkeypatch.setenv("INBOX_POLL_ENABLED", "false")
    monkeypatch.setenv("CURSOR_API_KEY", "")
    monkeypatch.setenv("OPENAI_API_KEY", "")
    reset_settings_cache()
    yield
    reset_settings_cache()
