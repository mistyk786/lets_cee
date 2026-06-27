"""Tests for background inbox watcher and scan logic."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services import inbox_watcher, prototype_service
from app.services.prototype_state import get_state, reset_state
from app.request_context import apply_request_context

client = TestClient(app)


def test_run_inbox_scan_creates_notifications():
    apply_request_context("demo", None)
    reset_state("demo")
    state = get_state()
    state.notifications.clear()
    state.initial_scan_done = False
    state.seen_message_keys.clear()

    result = prototype_service.run_inbox_scan(force_analysis=True)

    assert result["notification_count"] >= 1
    assert prototype_service.list_notifications()


def test_watcher_status_endpoint():
    response = client.get("/api/watcher/status")
    assert response.status_code == 200
    body = response.json()
    assert "poll_interval_seconds" in body
    assert "enabled" in body


def test_manual_watcher_scan_endpoint():
    with patch(
        "app.services.workflow_service.complete_json_prompt",
        side_effect=RuntimeError("skip cursor in tests"),
    ):
        response = client.post("/api/watcher/scan")
    assert response.status_code == 200
    assert response.json()["analyzed"] is True


def test_watcher_start_respects_disabled_setting(monkeypatch):
    monkeypatch.setenv("INBOX_POLL_ENABLED", "false")
    from app.config import reset_settings_cache

    reset_settings_cache()
    inbox_watcher.stop()
    inbox_watcher.start()
    assert inbox_watcher.status()["running"] is False


def test_pick_latest_scheduling_email_from_demo():
    from app.services.dataset_service import load_demo_emails

    raw = [e.model_dump() for e in load_demo_emails()]
    latest = prototype_service._pick_latest_scheduling_email(raw)
    assert latest is not None
    assert latest.get("subject")
