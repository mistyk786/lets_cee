"""API response models for the Member 3 data layer.

These are distinct from `schemas.py` (Member 2's scoring/workflow contracts).
They describe the raw demo dataset surfaced by `GET /api/demo-data`.
"""

from __future__ import annotations

from pydantic import BaseModel


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
    """Combined raw demo dataset: scheduling emails and calendar events."""

    emails: list[EmailMessage]
    calendar_events: list[CalendarEvent]
