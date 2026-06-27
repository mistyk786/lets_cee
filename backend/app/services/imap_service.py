"""IMAP inbox fetcher — Gmail, Outlook, iCloud, etc."""

from __future__ import annotations

import email
import imaplib
import logging
import re
from email.header import decode_header
from email.utils import parsedate_to_datetime
from typing import Any

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

_SCHEDULING_TERMS = (
    "meeting",
    "schedule",
    "calendar",
    "invite",
    "sync",
    "call",
    "catch up",
    "availability",
    "reschedule",
    "event",
    "registration",
    "hackathon",
    "workshop",
)


def imap_configured(settings: Settings | None = None) -> bool:
    active = settings or get_settings()
    return active.imap_configured


def _decode_header_value(value: str | None) -> str:
    if not value:
        return ""
    parts = decode_header(value)
    out: list[str] = []
    for chunk, enc in parts:
        if isinstance(chunk, bytes):
            out.append(chunk.decode(enc or "utf-8", errors="replace"))
        else:
            out.append(chunk)
    return "".join(out).strip()


def _to_iso(date_header: str | None) -> str:
    if not date_header:
        return ""
    try:
        return parsedate_to_datetime(date_header).isoformat()
    except (TypeError, ValueError):
        return date_header


def looks_like_scheduling(subject: str, body: str = "") -> bool:
    hay = f"{subject} {body}".lower()
    return any(term in hay for term in _SCHEDULING_TERMS)


def _body_text(msg: email.message.Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    return payload.decode(part.get_content_charset() or "utf-8", errors="replace")
        return ""
    payload = msg.get_payload(decode=True)
    if not payload:
        return ""
    return payload.decode(msg.get_content_charset() or "utf-8", errors="replace")


def _thread_id(msg: email.message.Message, subject: str) -> str:
    ref = _decode_header_value(msg.get("Message-ID"))
    if ref:
        return ref.strip("<>")
    base = re.sub(r"^re:\s*", "", subject.lower()).strip()
    return f"thread-{hash(base) & 0xFFFFFFFF:08x}"


def fetch_recent_emails(
    *,
    settings: Settings | None = None,
    max_messages: int | None = None,
    scheduling_only: bool = True,
    headers_only: bool = False,
) -> list[dict[str, Any]]:
    """Fetch recent inbox messages as demo-compatible email dicts."""
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            return _fetch_recent_emails_once(
                settings=settings,
                max_messages=max_messages,
                scheduling_only=scheduling_only,
                headers_only=headers_only,
            )
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("IMAP fetch attempt %d failed: %s", attempt + 1, exc)
    raise last_error or RuntimeError("IMAP fetch failed")


def _parse_fetch_items(msg_data: list) -> list[bytes]:
    payloads: list[bytes] = []
    for item in msg_data:
        if not isinstance(item, tuple) or len(item) < 2:
            continue
        raw = item[1]
        if isinstance(raw, (bytes, bytearray)):
            payloads.append(bytes(raw))
    return payloads


def _fetch_recent_emails_once(
    *,
    settings: Settings | None = None,
    max_messages: int | None = None,
    scheduling_only: bool = True,
    headers_only: bool = False,
) -> list[dict[str, Any]]:
    """Fetch recent inbox messages as demo-compatible email dicts."""
    active = settings or get_settings()
    if not imap_configured(active):
        raise RuntimeError(
            "IMAP is not configured (IMAP_HOST, IMAP_USER, IMAP_PASSWORD)"
        )

    limit = max_messages or active.imap_max_messages
    mailbox = active.imap_mailbox or "INBOX"
    host = (active.imap_host or "").strip()
    if not host:
        raise RuntimeError("IMAP_HOST is empty")

    conn = imaplib.IMAP4_SSL(host, active.imap_port, timeout=45)
    fetch_part = (
        "(BODY.PEEK[HEADER.FIELDS (SUBJECT FROM TO DATE MESSAGE-ID)])"
        if headers_only
        else "(BODY.PEEK[])"
    )
    try:
        conn.login(active.imap_user, active.imap_password)  # type: ignore[arg-type]
        conn.select(mailbox, readonly=True)
        _status, data = conn.search(None, "ALL")
        if not data or not data[0]:
            return []

        ids = data[0].split()
        recent = ids[-limit:] if len(ids) > limit else ids
        results: list[dict[str, Any]] = []

        id_set = b",".join(recent)
        _status, msg_data = conn.fetch(id_set, fetch_part)
        for raw in _parse_fetch_items(msg_data or []):
            msg = email.message_from_bytes(raw)
            subject = _decode_header_value(msg.get("Subject"))
            sender = _decode_header_value(msg.get("From"))
            recipient = _decode_header_value(msg.get("To"))
            body = "" if headers_only else _body_text(msg)[:4000]
            if scheduling_only and not looks_like_scheduling(subject, body):
                continue
            results.append(
                {
                    "thread_id": _thread_id(msg, subject),
                    "subject": subject,
                    "sender": sender,
                    "recipient": recipient,
                    "timestamp": _to_iso(msg.get("Date")),
                    "body": body,
                }
            )
        results.sort(
            key=lambda e: e.get("timestamp") or "",
            reverse=True,
        )
        return results
    finally:
        try:
            conn.logout()
        except imaplib.IMAP4.error:
            logger.debug("IMAP logout failed", exc_info=True)


def fetch_recent_emails_safe(
    *,
    settings: Settings | None = None,
    max_messages: int | None = None,
    scheduling_only: bool = True,
    headers_only: bool = False,
) -> tuple[list[dict[str, Any]], str | None]:
    """Fetch emails; returns (emails, error_message)."""
    try:
        return (
            fetch_recent_emails(
                settings=settings,
                max_messages=max_messages,
                scheduling_only=scheduling_only,
                headers_only=headers_only,
            ),
            None,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("IMAP fetch failed: %s", exc)
        return [], str(exc)
