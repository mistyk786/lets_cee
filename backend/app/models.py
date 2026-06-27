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
    """Combined raw demo dataset: scheduling emails and calendar events."""

    emails: list[EmailMessage]
    calendar_events: list[CalendarEvent]


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
    """Result of activating the automation against one scheduling email."""

    rules: AutomationRule
    processed_email_subject: str
    processed_email_sender: str | None = None
    processed_email_body: str | None = None
    draft_reply: str
    reply_source: str = "template"  # "cursor" | "template"
    proposed_slots: list[TimeSlot]
    tentative_event: TentativeEvent | None = None
    run: AutomationRun


class NotificationItem(BaseModel):
    """Actionable inbox item for the notification → automate prototype."""

    id: str
    title: str
    message: str
    created_at: str
    read: bool = False
    opportunity_id: str | None = None
    recoverable_minutes_per_week: int | None = None
    action: str = "review"  # "automate" | "review"
    status: str = "pending"  # "pending" | "completed"


class PrototypeBootstrapResponse(BaseModel):
    """Result of scanning inbox and surfacing actionable notifications."""

    workflow_name: str
    opportunity_score: float
    notifications: list[NotificationItem]
    demo_mode: bool
    data_source: str = "demo"  # demo | imap | upload
    automation_available: bool = True
    automation_summary: str = ""
    workflow_category: str = "other"
    automatable_actions: list[str] = []
    workflow: dict | None = None


class AutomateNotificationResponse(BaseModel):
    """Result of running automation from a notification click."""

    notification: NotificationItem
    activation: ActivationResponse
