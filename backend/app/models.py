"""API response models for the Member 3 data layer.

These are distinct from `schemas.py` (Member 2's scoring/workflow contracts).
They describe the raw demo dataset surfaced by `GET /api/demo-data`.
"""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas import AutomationRule


class EmailMessage(BaseModel):
    """A single email within a scheduling thread."""

    thread_id: str
    subject: str
    sender: str
    recipient: str
    timestamp: str
    body: str


class CalendarEvent(BaseModel):
    """A single calendar event with its attendees."""

    event_id: str
    title: str
    start_time: str
    end_time: str
    attendees: list[str]


class DemoDataResponse(BaseModel):
    """Combined dataset surfaced by ``GET /api/demo-data``."""

    emails: list[EmailMessage]
    calendar_events: list[CalendarEvent]
    data_source: str = "demo"
    thread_count: int = 0
    ingest_error: str | None = None


class TimeSlot(BaseModel):
    """A proposed open meeting slot."""

    start_time: str
    end_time: str


class TentativeEvent(BaseModel):
    """A tentatively-created calendar event from an activation run."""

    event_id: str
    title: str
    start_time: str
    end_time: str
    attendees: list[str]
    status: str = "tentative"


class AutomationRun(BaseModel):
    """A logged record of one simulated automation run."""

    run_id: str
    activated_at: str
    email_subject: str
    proposed_slot_count: int
    created_event_id: str | None = None
    status: str


class ActivationResponse(BaseModel):
    """Result of activating the automation against one mock scheduling email."""

    rules: AutomationRule
    processed_email_subject: str
    draft_reply: str
    proposed_slots: list[TimeSlot]
    tentative_event: TentativeEvent | None = None
    run: AutomationRun
