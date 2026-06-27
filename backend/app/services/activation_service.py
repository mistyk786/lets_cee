"""Activation simulation for the meeting-scheduling automation.

Stores activated settings in-memory and processes a single mock scheduling
email end-to-end: propose slots (via the calendar service), draft a reply,
create a tentative event, and log the run. State is process-local and resets
on restart — this is a demo, not a database.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.models import (
    ActivationResponse,
    AutomationRun,
    TentativeEvent,
    TimeSlot,
)
from app.schemas import AutomationRule
from app.services.calendar_service import find_available_slots
from app.services.demo_data import load_demo_workflow
from app.services import ingestion_service


def _next_scheduling_day() -> str:
    """Next upcoming weekday (skip Sat/Sun) so proposed slots are never in the past."""
    day = datetime.now(timezone.utc).date() + timedelta(days=1)
    while day.weekday() >= 5:  # 5=Sat, 6=Sun
        day += timedelta(days=1)
    return day.isoformat()

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


def _parse_iso(value: str) -> datetime:
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _format_display_time(dt: datetime) -> str:
    """Human-readable local time, e.g. ``29/6/2026 9:00am``."""
    local = dt.astimezone()
    hour = local.hour
    minute = local.minute
    period = "am" if hour < 12 else "pm"
    hour12 = hour % 12 or 12
    time_part = f"{hour12}{period}" if minute == 0 else f"{hour12}:{minute:02d}{period}"
    return f"{local.day}/{local.month}/{local.year} {time_part}"


def _format_slot_range(start: str, end: str) -> str:
    """Readable slot line, e.g. ``29/6/2026 9:00am to 9:30am``."""
    start_local = _parse_iso(start).astimezone()
    end_local = _parse_iso(end).astimezone()
    start_label = _format_display_time(start_local)
    if start_local.date() == end_local.date():
        end_time = end_local.hour
        end_minute = end_local.minute
        end_period = "am" if end_time < 12 else "pm"
        end_hour12 = end_time % 12 or 12
        end_part = (
            f"{end_hour12}{end_period}"
            if end_minute == 0
            else f"{end_hour12}:{end_minute:02d}{end_period}"
        )
        return f"{start_label} to {end_part}"
    return f"{start_label} to {_format_display_time(end_local)}"


def _busy_events() -> list[dict[str, str]]:
    events_raw, _source = ingestion_service.get_calendar_events(prefer_live=True)
    events = [
        {"start_time": e["start_time"], "end_time": e["end_time"]}
        for e in events_raw
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
    lines.extend(f"- {_format_slot_range(s.start_time, s.end_time)}" for s in slots)
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
    requested = (
        email.get("requested_duration_minutes")
        or active_rules.meeting_duration_minutes
    )
    # Clamp: LLM-derived rules occasionally return absurd durations (e.g. 720).
    duration = max(15, min(int(requested or 30), 120))

    raw_slots = find_available_slots(
        _busy_events(),
        duration,
        active_rules.working_hours_start,
        active_rules.working_hours_end,
        _next_scheduling_day(),
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
