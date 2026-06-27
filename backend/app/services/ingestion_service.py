"""Email and calendar ingestion without Gmail OAuth.

Sources (priority when ``prefer_live=True``):
  1. Uploaded JSON (``POST /api/ingest/emails``)
  2. IMAP inbox (Gmail/Outlook/iCloud with app password)
  3. Bundled demo dataset
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from app.config import Settings, get_settings
from app.request_context import get_effective_settings
from app.services.dataset_service import load_demo_calendar, load_demo_emails
from app.services.email_normaliser import normalise_threads
from app.services.imap_service import fetch_recent_emails, imap_configured

DataSource = Literal["demo", "imap", "upload"]

_uploaded_emails: list[dict[str, Any]] | None = None
_uploaded_calendar: list[dict[str, Any]] | None = None


def set_uploaded_emails(emails: list[dict[str, Any]]) -> None:
    global _uploaded_emails
    _uploaded_emails = list(emails)


def set_uploaded_calendar(events: list[dict[str, Any]]) -> None:
    global _uploaded_calendar
    _uploaded_calendar = list(events)


def clear_uploads() -> None:
    global _uploaded_emails, _uploaded_calendar
    _uploaded_emails = None
    _uploaded_calendar = None


def _mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return email
    visible = local[:2] if len(local) > 2 else local[:1]
    return f"{visible}***@{domain}"


def ingestion_status(settings: Settings | None = None) -> dict[str, Any]:
    active = settings or get_settings()
    server_imap = imap_configured(active)
    return {
        "cursor_configured": active.cursor_configured,
        "imap_configured": server_imap,
        "demo_inbox_available": server_imap,
        "server_imap_email_masked": (
            _mask_email(active.imap_user) if server_imap and active.imap_user else None
        ),
        "uploaded_emails": bool(_uploaded_emails),
        "uploaded_calendar": bool(_uploaded_calendar),
        "demo_available": True,
        "alternatives_to_gmail_api": [
            "IMAP with an app password (Gmail, Outlook, iCloud, Fastmail, etc.)",
            "POST /api/ingest/emails with exported or pasted email JSON",
            "POST /api/ingest/calendar with an exported .ics file",
            "Bundled demo dataset when nothing else is configured",
        ],
    }


def get_raw_emails(
    *,
    prefer_live: bool = True,
    settings: Settings | None = None,
) -> tuple[list[dict[str, Any]], DataSource]:
    if prefer_live and _uploaded_emails:
        return _uploaded_emails, "upload"

    active = settings or get_effective_settings()
    if prefer_live and imap_configured(active):
        try:
            per_mailbox = max(40, (active.imap_max_messages or 80) // 2)
            fetched = fetch_recent_emails(
                settings=active,
                scheduling_only=False,
                max_messages=per_mailbox,
                direction="received",
            )
            if active.imap_sent_mailbox:
                sent = fetch_recent_emails(
                    settings=active,
                    scheduling_only=False,
                    max_messages=per_mailbox,
                    direction="sent",
                    mailbox=active.imap_sent_mailbox,
                )
                fetched = fetched + sent
            return fetched, "imap"
        except Exception:
            # IMAP configured but failed — do not silently substitute demo data.
            return [], "imap"

    raw = [email.model_dump() for email in load_demo_emails()]
    return raw, "demo"


def get_email_threads(
    *,
    prefer_live: bool = True,
    settings: Settings | None = None,
) -> tuple[list[dict[str, Any]], DataSource]:
    raw, source = get_raw_emails(prefer_live=prefer_live, settings=settings)
    return normalise_threads(raw), source


def get_calendar_events(
    *,
    prefer_live: bool = True,
) -> tuple[list[dict[str, Any]], DataSource]:
    if prefer_live and _uploaded_calendar:
        return _uploaded_calendar, "upload"

    events = [
        {
            "event_id": e.event_id,
            "title": e.title,
            "start_time": e.start_time,
            "end_time": e.end_time,
            "attendees": e.attendees,
        }
        for e in load_demo_calendar()
    ]
    return events, "demo"


def list_recent_emails(
    *,
    limit: int = 10,
    prefer_live: bool = True,
    settings: Settings | None = None,
) -> tuple[list[dict[str, Any]], DataSource]:
    """Return recent messages for the UI (newest first)."""
    raw, source = get_raw_emails(
        prefer_live=prefer_live,
        settings=settings,
    )

    def _sort_key(email: dict[str, Any]) -> str:
        return str(email.get("timestamp", ""))

    sorted_emails = sorted(raw, key=_sort_key, reverse=True)
    items: list[dict[str, Any]] = []
    for email in sorted_emails[: max(1, min(limit, 20))]:
        body = str(email.get("body", "")).replace("\n", " ").strip()
        items.append(
            {
                "subject": str(email.get("subject") or "(no subject)"),
                "sender": str(email.get("sender") or "Unknown sender"),
                "timestamp": str(email.get("timestamp") or ""),
                "preview": body[:140] if body else None,
            }
        )
    return items, source


def parse_ics_events(ics_text: str) -> list[dict[str, Any]]:
    """Minimal ICS parser for exported Google/Apple/Outlook calendars."""
    blocks = ics_text.replace("\r\n", "\n").split("BEGIN:VEVENT")
    events: list[dict[str, Any]] = []

    for index, block in enumerate(blocks[1:], start=1):
        chunk = block.split("END:VEVENT", 1)[0]
        fields: dict[str, str] = {}
        for line in chunk.split("\n"):
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            fields[key.split(";", 1)[0].upper()] = value.strip()

        start = fields.get("DTSTART", "")
        end = fields.get("DTEND", "")
        summary = fields.get("SUMMARY", "Untitled")
        uid = fields.get("UID", f"ics-{index}")

        if not start or not end:
            continue

        events.append(
            {
                "event_id": uid,
                "title": summary,
                "start_time": _ics_to_iso(start),
                "end_time": _ics_to_iso(end),
                "attendees": [],
            }
        )
    return events


def _ics_to_iso(value: str) -> str:
    cleaned = value.strip()
    if len(cleaned) == 8:  # YYYYMMDD
        dt = datetime.strptime(cleaned, "%Y%m%d").replace(tzinfo=timezone.utc)
        return dt.isoformat()
    if "T" in cleaned:
        if cleaned.endswith("Z"):
            cleaned = cleaned[:-1] + "+00:00"
        if len(cleaned) == 15:  # YYYYMMDDTHHMMSS
            dt = datetime.strptime(cleaned, "%Y%m%dT%H%M%S").replace(
                tzinfo=timezone.utc
            )
            return dt.isoformat()
        return datetime.fromisoformat(cleaned).isoformat()
    return cleaned
