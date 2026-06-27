"""Loaders for the raw demo dataset (emails + calendar events).

Keeps file I/O out of the routers so endpoints stay thin.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.models import CalendarEvent, DemoDataResponse, EmailMessage

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_json(filename: str):
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def load_demo_emails() -> list[EmailMessage]:
    return [EmailMessage(**item) for item in _load_json("demo_emails.json")]


def load_demo_calendar() -> list[CalendarEvent]:
    return [CalendarEvent(**item) for item in _load_json("demo_calendar.json")]


def load_demo_data() -> DemoDataResponse:
    return DemoDataResponse(
        emails=load_demo_emails(),
        calendar_events=load_demo_calendar(),
    )
