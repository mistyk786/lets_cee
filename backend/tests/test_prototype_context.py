"""Tests for isolated prototype state per inbox context."""

from __future__ import annotations

from app.request_context import apply_request_context
from app.services import prototype_service
from app.services.prototype_state import get_state, reset_state


def test_demo_and_session_contexts_have_separate_notifications():
    apply_request_context("demo", None)
    reset_state("demo")
    demo_state = get_state()
    demo_state.notifications = []
    demo_state.initial_scan_done = True

    apply_request_context("session-user-a", None)
    reset_state("session-user-a")
    user_state = get_state()
    user_state.initial_scan_done = False

    apply_request_context("demo", None)
    assert get_state().initial_scan_done is True

    apply_request_context("session-user-a", None)
    assert get_state().initial_scan_done is False


def test_get_last_workflow_respects_context():
    apply_request_context("demo", None)
    reset_state("demo")
    from app.services.demo_data import load_demo_workflow

    get_state().last_workflow = load_demo_workflow()

    apply_request_context("session-user-b", None)
    reset_state("session-user-b")
    assert prototype_service.get_last_workflow() is None

    apply_request_context("demo", None)
    assert prototype_service.get_last_workflow() is not None
