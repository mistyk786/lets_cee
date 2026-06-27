"""Email thread normalisation.

Groups the flat demo email list into ordered threads keyed by ``thread_id`` so
downstream workflow detection sees one structured conversation per thread.
Pure Python: accepts an already-parsed list, no disk reads, no network.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import datetime, timezone
from typing import Any


def _parse_ts(value: str) -> datetime:
    try:
        dt = datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return datetime.min.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _base_subject(subject: str) -> str:
    """Strip leading ``Re:`` prefixes to recover the original subject."""
    cleaned = subject.strip()
    while cleaned[:3].lower() == "re:":
        cleaned = cleaned[3:].strip()
    return cleaned


def normalise_threads(
    raw_emails: Iterable[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    """Group a flat list of emails into ordered threads.

    Each thread is ``{thread_id, subject, message_count, participants,
    messages}`` where ``messages`` are ordered oldest-first and each contains
    ``sender``, ``recipient``, ``timestamp`` and ``body``.
    """
    grouped: dict[str, list[Mapping[str, Any]]] = {}
    order: list[str] = []
    for email in raw_emails:
        thread_id = email.get("thread_id", "")
        if thread_id not in grouped:
            grouped[thread_id] = []
            order.append(thread_id)
        grouped[thread_id].append(email)

    threads: list[dict[str, Any]] = []
    for thread_id in order:
        messages = sorted(
            grouped[thread_id], key=lambda e: _parse_ts(e.get("timestamp", ""))
        )

        participants: list[str] = []
        for msg in messages:
            for who in (msg.get("sender", ""), msg.get("recipient", "")):
                if who and who not in participants:
                    participants.append(who)

        subject = _base_subject(messages[0].get("subject", "")) if messages else ""

        threads.append(
            {
                "thread_id": thread_id,
                "subject": subject,
                "message_count": len(messages),
                "participants": participants,
                "messages": [
                    {
                        "sender": m.get("sender", ""),
                        "recipient": m.get("recipient", ""),
                        "timestamp": m.get("timestamp", ""),
                        "body": m.get("body", ""),
                    }
                    for m in messages
                ],
            }
        )

    return threads
