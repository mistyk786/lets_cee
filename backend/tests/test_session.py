"""Tests for session-scoped inbox connect."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services import session_service

client = TestClient(app)


def test_inbox_session_empty_without_header():
    response = client.get("/api/inbox/session")
    assert response.status_code == 200
    assert response.json()["connected"] is False


def test_inbox_connect_creates_session():
    session_service._sessions.clear()
    with patch(
        "app.services.session_service._test_imap_login",
        return_value=None,
    ):
        response = client.post(
            "/api/inbox/connect",
            json={
                "email": "demo@gmail.com",
                "app_password": "abcdefghijklmnop",
                "provider": "gmail",
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert body["connected"] is True
    assert body["session_id"]
    assert body["email"] == "demo@gmail.com"

    session_response = client.get(
        "/api/inbox/session",
        headers={"X-Sloth-Session": body["session_id"]},
    )
    assert session_response.json()["connected"] is True
