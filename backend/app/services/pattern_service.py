"""Deterministic pattern sniffing before AI workflow extraction."""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Mapping
from typing import Any

from app.services.email_normaliser import normalise_threads

_SUBJECT_PREFIX_RE = re.compile(r"^(re|fwd|fw):\s*", re.IGNORECASE)

_CATEGORY_TERMS: dict[str, tuple[str, ...]] = {
    "scheduling": (
        "meeting",
        "meet",
        "sync",
        "schedule",
        "calendar",
        "call",
        "catch up",
        "find time",
        "slot",
        "invite",
        "reschedule",
        "fortnight",
        "hangout",
    ),
    "follow_up": (
        "follow up",
        "follow-up",
        "checking in",
        "any update",
        "bump",
        "reminder",
        "nudge",
        "status",
    ),
    "approval": (
        "approve",
        "approval",
        "sign off",
        "review",
        "feedback",
        "confirm",
    ),
    "reporting": (
        "report",
        "weekly",
        "monthly",
        "numbers",
        "summary",
        "update deck",
    ),
}


def _base_subject(subject: str) -> str:
    cleaned = subject.strip()
    while True:
        match = _SUBJECT_PREFIX_RE.match(cleaned)
        if not match:
            break
        cleaned = cleaned[match.end() :].strip()
    return cleaned or subject.strip() or "(no subject)"


def _sender_label(sender: str) -> str:
    name = sender.split("<")[0].strip().strip('"')
    return name or sender.split("@")[0] or sender or "Unknown"


def _flatten(raw_emails: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return list(raw_emails)


def _flatten_from_threads(threads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    flat: list[dict[str, Any]] = []
    for thread in threads:
        subject = str(thread.get("subject", ""))
        for msg in thread.get("messages", []):
            flat.append(
                {
                    "thread_id": thread.get("thread_id", ""),
                    "subject": subject,
                    "sender": msg.get("sender", ""),
                    "recipient": msg.get("recipient", ""),
                    "timestamp": msg.get("timestamp", ""),
                    "body": msg.get("body", ""),
                    "direction": msg.get("direction", "received"),
                }
            )
    return flat


def detect_email_patterns(
    *,
    raw_emails: list[dict[str, Any]] | None = None,
    email_threads: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Find concrete repetition signals to ground AI analysis."""
    if raw_emails:
        messages = _flatten(raw_emails)
    elif email_threads:
        messages = _flatten_from_threads(email_threads)
    else:
        return {"highlights": [], "subject_clusters": [], "top_senders": []}

    if not messages:
        return {"highlights": [], "subject_clusters": [], "top_senders": []}

    subject_counts: Counter[str] = Counter()
    sender_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()
    phrase_counts: Counter[str] = Counter()

    for msg in messages:
        subject = _base_subject(str(msg.get("subject", "")))
        body = str(msg.get("body", "")).lower()
        sender = _sender_label(str(msg.get("sender", "")))
        direction = str(msg.get("direction", "received"))

        subject_counts[subject] += 1
        sender_counts[sender] += 1

        haystack = f"{subject}\n{body}"
        for category, terms in _CATEGORY_TERMS.items():
            if any(term in haystack for term in terms):
                category_counts[category] += 1

        if direction == "sent" and len(body) > 20:
            snippet = " ".join(body.split())[:80]
            phrase_counts[snippet] += 1

    subject_clusters = [
        {"subject": subj, "count": count}
        for subj, count in subject_counts.most_common(8)
        if count >= 2
    ]
    top_senders = [
        {"sender": sender, "count": count}
        for sender, count in sender_counts.most_common(6)
        if count >= 2
    ]

    highlights: list[str] = []
    for cluster in subject_clusters[:5]:
        highlights.append(
            f"{cluster['count']} emails share the subject “{cluster['subject']}”"
        )
    for sender in top_senders[:3]:
        highlights.append(
            f"{sender['count']} messages from {sender['sender']}"
        )
    for category, count in category_counts.most_common(3):
        if count >= 2:
            highlights.append(
                f"{count} {category.replace('_', '-')} related messages"
            )
    for phrase, count in phrase_counts.most_common(2):
        if count >= 2:
            highlights.append(
                f"You sent a similar reply {count} times: “{phrase}…”"
            )

    strongest_category = category_counts.most_common(1)
    suggested_category = strongest_category[0][0] if strongest_category else None
    estimated_occurrences = max(
        (c["count"] for c in subject_clusters),
        default=max((s["count"] for s in top_senders), default=0),
    )

    return {
        "highlights": highlights[:10],
        "subject_clusters": subject_clusters,
        "top_senders": top_senders,
        "category_signals": dict(category_counts),
        "suggested_category": suggested_category,
        "estimated_occurrences": estimated_occurrences,
        "message_count": len(messages),
        "received_count": sum(
            1 for m in messages if m.get("direction", "received") != "sent"
        ),
        "sent_count": sum(1 for m in messages if m.get("direction") == "sent"),
    }


def enrich_workflow_summary(
    summary: str,
    patterns: dict[str, Any],
) -> str:
    highlights = patterns.get("highlights") or []
    if not highlights:
        return summary
    evidence = "; ".join(highlights[:3])
    if summary and evidence.lower() not in summary.lower():
        return f"{summary} Evidence from your mail: {evidence}."
    if not summary:
        return f"Evidence from your mail: {evidence}."
    return summary


def patterns_from_raw(raw_emails: list[dict[str, Any]]) -> dict[str, Any]:
    threads = normalise_threads(raw_emails)
    return detect_email_patterns(email_threads=threads)
