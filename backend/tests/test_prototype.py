"""Tests for the notification-driven prototype flow."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_bootstrap_creates_automate_notification():
    response = client.post("/api/prototype/bootstrap")
    assert response.status_code == 200
    body = response.json()
    assert body["workflow_name"]
    assert len(body["notifications"]) >= 1
    automate = next(n for n in body["notifications"] if n["action"] == "automate")
    assert automate["status"] == "pending"
    assert automate["opportunity_id"] == "internal-meeting-scheduling"


def test_list_notifications_after_bootstrap():
    client.post("/api/prototype/bootstrap")
    response = client.get("/api/notifications")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_automate_notification_runs_activation():
    boot = client.post("/api/prototype/bootstrap").json()
    automate_id = next(
        n["id"] for n in boot["notifications"] if n["action"] == "automate"
    )
    response = client.post(f"/api/notifications/{automate_id}/automate")
    assert response.status_code == 200
    body = response.json()
    assert body["notification"]["status"] == "completed"
    assert body["activation"]["draft_reply"]
    assert len(body["activation"]["proposed_slots"]) >= 1


def test_forecast_accepts_frontend_body():
    response = client.post(
        "/api/forecast",
        json={
            "rules": {
                "internal_contacts_only": True,
                "meeting_duration_minutes": 30,
                "working_hours_start": "09:00",
                "working_hours_end": "18:00",
                "approval_required": True,
                "max_slots_proposed": 3,
            },
            "occurrence_count": 47,
        },
    )
    assert response.status_code == 200
    assert response.json()["likely_hours_saved"] > 0
