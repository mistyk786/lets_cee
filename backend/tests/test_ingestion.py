"""Tests for Cursor JSON parsing and ingestion helpers."""

from __future__ import annotations

import pytest

from app.config import reset_settings_cache
from app.services.cursor_service import _extract_json_object
from app.services import ingestion_service


@pytest.fixture(autouse=True)
def _reset_state():
    reset_settings_cache()
    ingestion_service.clear_uploads()
    yield
    ingestion_service.clear_uploads()
    reset_settings_cache()


def test_extract_json_object_strips_markdown_fence():
    text = 'Here you go:\n```json\n{"workflow_name": "Test", "occurrence_count": 3}\n```'
    data = _extract_json_object(text)
    assert data["workflow_name"] == "Test"
    assert data["occurrence_count"] == 3


def test_parse_ics_events_reads_basic_vevent():
    ics = """BEGIN:VCALENDAR
BEGIN:VEVENT
UID:evt-1
SUMMARY:Team sync
DTSTART:20260622T090000Z
DTEND:20260622T093000Z
END:VEVENT
END:VCALENDAR
"""
    events = ingestion_service.parse_ics_events(ics)
    assert len(events) == 1
    assert events[0]["title"] == "Team sync"
    assert "2026-06-22" in events[0]["start_time"]


def test_list_recent_emails_returns_preview_and_source():
    ingestion_service.set_uploaded_emails(
        [
            {
                "thread_id": "t1",
                "subject": "Weekly report",
                "sender": "boss@example.com",
                "recipient": "me@example.com",
                "timestamp": "2026-06-02T10:00:00+00:00",
                "body": "Please send the weekly numbers by Friday.",
            },
            {
                "thread_id": "t2",
                "subject": "Coffee?",
                "sender": "friend@example.com",
                "recipient": "me@example.com",
                "timestamp": "2026-06-01T10:00:00+00:00",
                "body": "Want to grab coffee tomorrow?",
            },
        ]
    )
    emails, source = ingestion_service.list_recent_emails(limit=5)
    assert source == "upload"
    assert len(emails) == 2
    assert emails[0]["subject"] == "Weekly report"
    assert emails[0]["preview"].startswith("Please send")


def test_uploaded_emails_take_priority_over_demo():
    ingestion_service.set_uploaded_emails(
        [
            {
                "thread_id": "t1",
                "subject": "Schedule a meeting",
                "sender": "a@example.com",
                "recipient": "b@example.com",
                "timestamp": "2026-06-01T10:00:00+00:00",
                "body": "Can we find time next week?",
            }
        ]
    )
    threads, source = ingestion_service.get_email_threads(prefer_live=True)
    assert source == "upload"
    assert threads[0]["subject"] == "Schedule a meeting"
