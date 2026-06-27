"""Tests for deterministic email pattern sniffing."""

from __future__ import annotations

from app.services.pattern_service import detect_email_patterns


def test_detect_email_patterns_finds_subject_clusters():
    raw = [
        {
            "subject": "Meet next fortnight?",
            "sender": "Alex <alex@example.com>",
            "body": "Want to grab coffee?",
            "timestamp": "2026-06-01T10:00:00+00:00",
        },
        {
            "subject": "Re: Meet next fortnight?",
            "sender": "Alex <alex@example.com>",
            "body": "Tuesday works?",
            "timestamp": "2026-06-02T10:00:00+00:00",
        },
        {
            "subject": "Weekly numbers",
            "sender": "Boss <boss@example.com>",
            "body": "Please send the report",
            "timestamp": "2026-06-03T10:00:00+00:00",
        },
    ]
    report = detect_email_patterns(raw_emails=raw)
    assert report["estimated_occurrences"] >= 2
    assert any("Meet next fortnight" in h for h in report["highlights"])
