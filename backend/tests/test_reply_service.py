"""Tests for NLP scheduling reply generation."""

from __future__ import annotations

from unittest.mock import patch

from app.config import Settings
from app.models import TimeSlot
from app.schemas import AutomationRule
from app.services.reply_service import generate_scheduling_reply


def _rules() -> AutomationRule:
    return AutomationRule(
        internal_contacts_only=True,
        meeting_duration_minutes=30,
        working_hours_start="09:00",
        working_hours_end="18:00",
        approval_required=True,
        max_slots_proposed=3,
    )


def _email() -> dict:
    return {
        "sender": "Alex Chen <alex@example.com>",
        "recipient": "you@company.com",
        "subject": "Coffee next fortnight?",
        "body": "Hey — want to grab coffee in two weeks to catch up on the project?",
    }


def _slots() -> list[TimeSlot]:
    return [
        TimeSlot(
            start_time="2026-07-01T10:00:00+00:00",
            end_time="2026-07-01T10:30:00+00:00",
        )
    ]


def test_generate_scheduling_reply_uses_template_without_cursor():
    draft, source = generate_scheduling_reply(
        incoming_email=_email(),
        proposed_slots=_slots(),
        rules=_rules(),
        settings=Settings(cursor_api_key=None, environment="test"),
    )
    assert source == "template"
    assert "Hi Alex" in draft or "Hi," in draft
    assert "10:00" in draft or "2026-07-01" in draft


def test_generate_scheduling_reply_uses_cursor_when_available():
    settings = Settings(cursor_api_key="test-key", environment="test")
    with patch(
        "app.services.reply_service.complete_json_prompt",
        return_value={
            "draft_reply": (
                "Hi Alex,\n\nCoffee in two weeks sounds great — "
                "how about Wed 1 Jul at 10:00 UTC?\n\nBest,"
            )
        },
    ):
        draft, source = generate_scheduling_reply(
            incoming_email=_email(),
            proposed_slots=_slots(),
            rules=_rules(),
            settings=settings,
        )
    assert source == "cursor"
    assert "Coffee" in draft
    assert "Alex" in draft
