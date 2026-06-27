"""IMAP email fetcher — works with Gmail, Outlook, iCloud, etc.

Gmail: enable 2FA and create an App Password (Google Account → Security →
App passwords). Use that as ``IMAP_PASSWORD`` — no OAuth required for a hackathon
prototype. Spaces in the displayed app password are stripped in config.

Performance: headers for the most recent ``IMAP_MAX_MESSAGES`` messages are
fetched in a single batched IMAP command and filtered on subject/sender. Full
bodies are only downloaded for the small set of scheduling candidates.
"""

from __future__ import annotations

import email
import imaplib
import logging
import re
from datetime import datetime, timezone
from email.header import decode_header
from email.message import Message
from email.utils import parsedate_to_datetime
from typing import Any

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

# Whole-word scheduling cues (regex word boundaries avoid "recall" → "call").
_SCHEDULING_TERMS = (
    "meeting",
    "meet",
    "sync",
    "schedule",
    "scheduling",
    "calendar",
    "call",
    "availability",
    "available",
    "catch up",
    "catch-up",
    "find time",
    "time to chat",
    "slot",
    "invite",
    "appointment",
    "reschedule",
)
_SCHEDULING_RE = re.compile(
    r"\b(" + "|".join(re.escape(t) for t in _SCHEDULING_TERMS) + r")\b",
    re.IGNORECASE,
)

# Senders that are almost never a real scheduling request from a person.
_AUTOMATED_SENDER_HINTS = (
    "no-reply",
    "noreply",
    "no_reply",
    "donotreply",
    "do-not-reply",
    "notifications@",
    "notification@",
    "accounts.google.com",
    "mailer-daemon",
    "postmaster",
    "newsletter",
)


def imap_configured(settings: Settings | None = None) -> bool:
    active = settings or get_settings()
    return bool(active.imap_host and active.imap_user and active.imap_password)


def _decode_header_value(value: str | None) -> str:
    if not value:
        return ""
    parts: list[str] = []
    for chunk, charset in decode_header(value):
        if isinstance(chunk, bytes):
            parts.append(chunk.decode(charset or "utf-8", errors="replace"))
        else:
            parts.append(chunk)
    return "".join(parts)


def _message_body(msg: Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and not part.get_filename():
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace").strip()
        return ""
    payload = msg.get_payload(decode=True)
    if not payload:
        return ""
    charset = msg.get_content_charset() or "utf-8"
    return payload.decode(charset, errors="replace").strip()


def looks_like_scheduling(subject: str, body: str = "") -> bool:
    """True when subject/body contains a whole-word scheduling cue."""
    return bool(_SCHEDULING_RE.search(f"{subject}\n{body}"))


def _is_automated_sender(sender: str) -> bool:
    low = sender.lower()
    return any(hint in low for hint in _AUTOMATED_SENDER_HINTS)


def _to_iso(raw_date: str | None) -> str:
    if not raw_date:
        return datetime.now(timezone.utc).isoformat()
    try:
        dt = parsedate_to_datetime(raw_date)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except (TypeError, ValueError):
        return datetime.now(timezone.utc).isoformat()


def _parse_headers(raw_header: bytes) -> Message:
    return email.message_from_bytes(raw_header)


def fetch_recent_emails(
    *,
    settings: Settings | None = None,
    max_messages: int | None = None,
    scheduling_only: bool = True,
) -> list[dict[str, Any]]:
    """Fetch recent inbox messages and return demo-compatible email dicts.

    Two-phase for speed: one batched header fetch to filter candidates, then a
    single batched body fetch only for the messages we actually keep.
    """
    active = settings or get_settings()
    if not imap_configured(active):
        raise RuntimeError(
            "IMAP is not configured (IMAP_HOST, IMAP_USER, IMAP_PASSWORD)"
        )

    limit = max_messages or active.imap_max_messages
    mailbox = active.imap_mailbox or "INBOX"

    conn = imaplib.IMAP4_SSL(active.imap_host, active.imap_port)
    try:
        conn.login(active.imap_user, active.imap_password)  # type: ignore[arg-type]
        conn.select(mailbox, readonly=True)
        _status, data = conn.search(None, "ALL")
        if not data or not data[0]:
            return []

        ids = data[0].split()
        recent = ids[-limit:] if len(ids) > limit else ids
        if not recent:
            return []

        id_set = b",".join(recent)
        header_fields = "(BODY.PEEK[HEADER.FIELDS (SUBJECT FROM TO DATE MESSAGE-ID)])"
        _status, header_data = conn.fetch(id_set.decode(), header_fields)

        # header_data alternates (b"<id> (...", b"<raw header>") tuples + b")".
        candidates: list[dict[str, Any]] = []
        msg_seq = list(reversed(recent))  # newest first
        headers_by_seq = _pair_fetch_response(header_data, msg_seq)

        keep_seqs: list[bytes] = []
        meta: dict[bytes, dict[str, Any]] = {}
        for seq, raw_header in headers_by_seq.items():
            hdr = _parse_headers(raw_header)
            subject = _decode_header_value(hdr.get("Subject"))
            sender = _decode_header_value(hdr.get("From"))

            if scheduling_only:
                if _is_automated_sender(sender):
                    continue
                if not looks_like_scheduling(subject):
                    # Subject didn't match; body check happens after body fetch.
                    meta[seq] = {
                        "subject": subject,
                        "sender": sender,
                        "recipient": _decode_header_value(hdr.get("To")),
                        "timestamp": _to_iso(hdr.get("Date")),
                        "message_id": _decode_header_value(hdr.get("Message-ID")),
                        "needs_body_check": True,
                    }
                    keep_seqs.append(seq)
                    continue

            meta[seq] = {
                "subject": subject,
                "sender": sender,
                "recipient": _decode_header_value(hdr.get("To")),
                "timestamp": _to_iso(hdr.get("Date")),
                "message_id": _decode_header_value(hdr.get("Message-ID")),
                "needs_body_check": False,
            }
            keep_seqs.append(seq)

        if not keep_seqs:
            return []

        # Phase 2: one batched body fetch for kept messages.
        body_set = b",".join(keep_seqs).decode()
        _status, body_data = conn.fetch(body_set, "(BODY.PEEK[])")
        bodies_by_seq = _pair_fetch_response(body_data, msg_seq)

        for seq in keep_seqs:
            info = meta[seq]
            raw_body = bodies_by_seq.get(seq, b"")
            msg = email.message_from_bytes(raw_body) if raw_body else None
            body = _message_body(msg) if msg else ""

            if scheduling_only and info.get("needs_body_check"):
                if not looks_like_scheduling(info["subject"], body):
                    continue

            candidates.append(
                {
                    "thread_id": info["message_id"] or seq.decode(),
                    "subject": info["subject"],
                    "sender": info["sender"],
                    "recipient": info["recipient"],
                    "timestamp": info["timestamp"],
                    "body": body[:4000],
                }
            )

        return candidates
    finally:
        try:
            conn.logout()
        except imaplib.IMAP4.error:
            logger.debug("IMAP logout failed", exc_info=True)


def _pair_fetch_response(
    fetch_data: list[Any], seq_order: list[bytes]
) -> dict[bytes, bytes]:
    """Map IMAP sequence numbers → raw payload from a batched FETCH response.

    ``fetch_data`` is a list where matched messages appear as tuples
    ``(b"<seq> (BODY[...] {size}", b"<payload>")``. We extract the leading
    sequence number from the descriptor so order/identity is reliable.
    """
    result: dict[bytes, bytes] = {}
    seq_set = set(seq_order)
    for item in fetch_data:
        if not isinstance(item, tuple) or len(item) < 2:
            continue
        descriptor, payload = item[0], item[1]
        if not isinstance(descriptor, (bytes, bytearray)):
            continue
        match = re.match(rb"\s*(\d+)\s", descriptor)
        if not match:
            continue
        seq = match.group(1)
        if seq in seq_set:
            result[seq] = bytes(payload)
    return result
