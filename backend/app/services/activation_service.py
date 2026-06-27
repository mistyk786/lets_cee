"""Activation simulation for the meeting-scheduling automation.

Stores activated settings in-memory and processes a single mock scheduling
email end-to-end: propose slots (via the calendar service), draft a reply,
create a tentative event, and log the run. State is process-local and resets
on restart — this is a demo, not a database.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.models import (
    ActivationResponse,
    AutomationRun,
    TentativeEvent,
    TimeSlot,
)
from app.schemas import AutomationRule
from app.services.calendar_service import find_available_slots
from app.services.dataset_service import load_demo_calendar
from app.services.demo_data import load_demo_workflow

# Day used for the simulated proposal. Chosen so existing demo events on the
# morning of 2026-06-22 (09:15-09:45) visibly push the first proposed slot.
_DEMO_SCHEDULING_DAY = "2026-06-22"

_DEFAULT_EMAIL: dict[str, Any] = {
    "sender": "Jordan Lee <jordan.lee@northwind.io>",
    "recipient": "you@northwind.io",
    "subject": "Quick sync next week?",
    "body": "Hi - could we find some time next week to review the Q3 plan?",
    "requested_duration_minutes": None,
}

# Process-local stores (demo only).
_active_rules: list[AutomationRule] = []
_tentative_events: list[dict[str, Any]] = []
_run_log: list[AutomationRun] = []


def _default_rules() -> AutomationRule:
    return load_demo_workflow().automation_rules


def _busy_events() -> list[dict[str, str]]:
    events = [
        {"start_time": e.start_time, "end_time": e.end_time}
        for e in load_demo_calendar()
    ]
    events.extend(
        {"start_time": e["start_time"], "end_time": e["end_time"]}
        for e in _tentative_events
    )
    return events


def _draft_reply(sender: str, slots: list[TimeSlot]) -> str:
    if not slots:
        return (
            "Hi,\n\nThanks for reaching out. I couldn't find availability in "
            "the requested window - could you share a few alternative dates?\n\n"
            "Best,"
        )
    lines = ["Hi,", "", "Thanks for the note. Here are a few times that work:"]
    lines.extend(f"- {s.start_time} to {s.end_time}" for s in slots)
    lines.extend(
        ["", "Let me know which suits you and I'll send an invite.", "", "Best,"]
    )
    return "\n".join(lines)


def activate(
    rules: AutomationRule | None = None,
    incoming_email: dict[str, Any] | None = None,
) -> ActivationResponse:
    """Activate the automation and process one mock scheduling email."""
    active_rules = rules or _default_rules()
    _active_rules.append(active_rules)

    email = {**_DEFAULT_EMAIL, **(incoming_email or {})}
    duration = (
        email.get("requested_duration_minutes")
        or active_rules.meeting_duration_minutes
    )

    raw_slots = find_available_slots(
        _busy_events(),
        duration,
        active_rules.working_hours_start,
        active_rules.working_hours_end,
        _DEMO_SCHEDULING_DAY,
        max_slots=active_rules.max_slots_proposed,
    )
    slots = [TimeSlot(**s) for s in raw_slots]

    draft = _draft_reply(email["sender"], slots)

    tentative_event: TentativeEvent | None = None
    created_event_id: str | None = None
    if slots:
        created_event_id = f"evt-{uuid.uuid4().hex[:8]}"
        tentative_event = TentativeEvent(
            event_id=created_event_id,
            title=email["subject"],
            start_time=slots[0].start_time,
            end_time=slots[0].end_time,
            attendees=[email["sender"], email["recipient"]],
        )
        _tentative_events.append(tentative_event.model_dump())

    run = AutomationRun(
        run_id=f"run-{uuid.uuid4().hex[:8]}",
        activated_at=datetime.now(timezone.utc).isoformat(),
        email_subject=email["subject"],
        proposed_slot_count=len(slots),
        created_event_id=created_event_id,
        status="completed" if slots else "no_slots_found",
    )
    _run_log.append(run)

    return ActivationResponse(
        rules=active_rules,
        processed_email_subject=email["subject"],
        draft_reply=draft,
        proposed_slots=slots,
        tentative_event=tentative_event,
        run=run,
    )
