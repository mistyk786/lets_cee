"""NLP-generated email replies for scheduling automation."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.config import Settings, get_settings
from app.models import TimeSlot
from app.schemas import AutomationRule
from app.services.cursor_service import complete_json_prompt

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are Sloth, a careful email assistant helping reply to scheduling requests.

Given an incoming email and available calendar slots, write a natural reply the user can send.

Return ONLY a JSON object with this shape:
{
  "draft_reply": "plain-text email body with newlines"
}

Rules:
- Acknowledge what the sender actually asked for (reference their subject or request).
- Weave in the proposed times naturally; use human-readable dates/times.
- Keep it warm, professional, and under 160 words.
- Do not invent meeting times that are not in proposed_slots.
- If proposed_slots is empty, politely ask for alternative dates.
- End with a simple sign-off (e.g. Best,).
- Do not include a Subject line — body only."""


def _sender_name(sender: str) -> str:
    name = sender.split("<")[0].strip().strip('"')
    return name or sender.split("@")[0] or "there"


def _format_slot(slot: TimeSlot) -> str:
    try:
        start = datetime.fromisoformat(slot.start_time)
        end = datetime.fromisoformat(slot.end_time)
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        return (
            f"{start.strftime('%A %d %b %Y, %H:%M')}–"
            f"{end.strftime('%H:%M')} UTC"
        )
    except (TypeError, ValueError):
        return f"{slot.start_time} to {slot.end_time}"


def _template_reply(sender: str, slots: list[TimeSlot]) -> str:
    """Deterministic fallback when Cursor is unavailable."""
    greeting = f"Hi {_sender_name(sender).split()[0]},"
    if not slots:
        return (
            f"{greeting}\n\n"
            "Thanks for reaching out. I couldn't find availability in the "
            "requested window — could you share a few alternative dates?\n\n"
            "Best,"
        )
    lines = [
        greeting,
        "",
        "Thanks for your message. Here are a few times that work for me:",
    ]
    lines.extend(f"- {_format_slot(slot)}" for slot in slots)
    lines.extend(
        [
            "",
            "Let me know which suits you and I'll send an invite.",
            "",
            "Best,",
        ]
    )
    return "\n".join(lines)


def generate_scheduling_reply(
    *,
    incoming_email: dict,
    proposed_slots: list[TimeSlot],
    rules: AutomationRule,
    settings: Settings | None = None,
) -> tuple[str, str]:
    """Return ``(draft_reply, reply_source)`` where source is ``cursor`` or ``template``."""
    settings = settings or get_settings()
    sender = str(incoming_email.get("sender", ""))
    subject = str(incoming_email.get("subject", ""))
    body = str(incoming_email.get("body", "")).strip()

    if not settings.cursor_configured:
        return _template_reply(sender, proposed_slots), "template"

    user_payload = {
        "incoming_email": {
            "sender": sender,
            "recipient": incoming_email.get("recipient", ""),
            "subject": subject,
            "body": body[:4000],
        },
        "proposed_slots": [
            {
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "label": _format_slot(slot),
            }
            for slot in proposed_slots
        ],
        "meeting_duration_minutes": rules.meeting_duration_minutes,
        "working_hours": f"{rules.working_hours_start}–{rules.working_hours_end}",
    }

    try:
        result = complete_json_prompt(
            system_prompt=_SYSTEM_PROMPT,
            user_payload=user_payload,
            settings=settings,
            timeout_seconds=min(float(settings.cursor_timeout_seconds), 120.0),
        )
        draft = str(result.get("draft_reply", "")).strip()
        if draft:
            return draft, "cursor"
    except Exception as exc:
        logger.warning("Cursor reply generation failed, using template: %s", exc)

    return _template_reply(sender, proposed_slots), "template"
