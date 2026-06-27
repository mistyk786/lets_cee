"""Email ingestion — live IMAP inbox or bundled demo dataset."""

from __future__ import annotations

import time
from typing import Any, Literal

from app.config import Settings, get_settings
from app.services.dataset_service import load_demo_calendar, load_demo_emails
from app.services.email_normaliser import normalise_threads
from app.services.imap_service import fetch_recent_emails_safe, imap_configured

DataSource = Literal["demo", "imap"]

_last_source: DataSource = "demo"
_last_error: str | None = None
_cached_emails: list[dict[str, Any]] | None = None
_cached_at: float = 0.0
_CACHE_TTL_SECONDS = 180


def get_last_ingestion_meta() -> dict[str, Any]:
    return {"data_source": _last_source, "last_error": _last_error}


def ingestion_status(settings: Settings | None = None) -> dict[str, Any]:
    active = settings or get_settings()
    return {
        "cursor_configured": active.openai_configured,
        "imap_configured": imap_configured(active),
        "uploaded_emails": False,
        "uploaded_calendar": False,
        "demo_available": True,
        "live_email_only": imap_configured(active),
        "data_source": _last_source,
        "last_error": _last_error,
    }


def _store_cache(emails: list[dict[str, Any]], source: DataSource) -> None:
    global _cached_emails, _cached_at, _last_source, _last_error
    _cached_emails = emails
    _cached_at = time.monotonic()
    _last_source = source
    _last_error = None


def get_raw_emails(
    *,
    prefer_live: bool = True,
    settings: Settings | None = None,
    scheduling_only: bool = True,
    max_messages: int | None = None,
    use_cache: bool = True,
    headers_only: bool = False,
) -> tuple[list[dict[str, Any]], DataSource]:
    global _last_source, _last_error, _cached_emails, _cached_at

    active = settings or get_settings()

    if (
        use_cache
        and _cached_emails is not None
        and time.monotonic() - _cached_at < _CACHE_TTL_SECONDS
    ):
        return _cached_emails, _last_source

    if prefer_live and imap_configured(active):
        emails, err = fetch_recent_emails_safe(
            settings=active,
            max_messages=max_messages,
            scheduling_only=scheduling_only,
            headers_only=headers_only,
        )
        _last_error = err
        if emails:
            _store_cache(emails, "imap")
            return emails, "imap"
        if err:
            raise RuntimeError(f"Could not read live inbox: {err}")
        raise RuntimeError(
            "No emails matched in your inbox."
            + (
                " Try widening the scan or check that scheduling-related messages exist."
                if scheduling_only
                else ""
            )
        )

    raw = [email.model_dump() for email in load_demo_emails()]
    _last_source = "demo"
    _last_error = None
    return raw, "demo"


def get_email_threads(
    *,
    prefer_live: bool = True,
    settings: Settings | None = None,
    scheduling_only: bool = False,
    max_messages: int | None = 25,
    headers_only: bool = True,
    use_cache: bool = True,
) -> tuple[list[dict[str, Any]], DataSource]:
    raw, source = get_raw_emails(
        prefer_live=prefer_live,
        settings=settings,
        scheduling_only=scheduling_only,
        max_messages=max_messages,
        headers_only=headers_only,
        use_cache=use_cache,
    )
    return normalise_threads(raw), source


def get_calendar_events() -> list[dict[str, Any]]:
    return [
        {
            "event_id": e.event_id,
            "title": e.title,
            "start_time": e.start_time,
            "end_time": e.end_time,
            "attendees": e.attendees,
        }
        for e in load_demo_calendar()
    ]
