"""Notification-driven prototype orchestration.

This is the real product flow for the hackathon demo:
  1. Scan inbox (IMAP / upload / demo) and detect repeated workflows.
  2. Surface a notification: "Sloth can handle this scheduling email."
  3. User clicks → run activation (slots, draft reply, tentative calendar hold).

``run_inbox_scan`` is called by the background watcher and manual bootstrap.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from app.models import (
    ActivationResponse,
    AutomateNotificationResponse,
    NotificationItem,
    PrototypeBootstrapResponse,
)
from app.schemas import DetectedWorkflow
from app.services import activation_service, analysis_service, ingestion_service
from app.services.imap_service import looks_like_scheduling

logger = logging.getLogger(__name__)

_SCHEDULING_NOTIFICATION_ID = "n-incoming-scheduling"
_OPPORTUNITY_ID = "internal-meeting-scheduling"

_FALLBACK_INCOMING: dict[str, Any] = {
    "sender": "Jordan Lee <jordan.lee@northwind.io>",
    "recipient": "you@northwind.io",
    "subject": "Quick sync next week?",
    "body": "Hi - could we find some time next week to review the Q3 plan?",
    "requested_duration_minutes": 30,
}

_notifications: list[NotificationItem] = []
_last_workflow: DetectedWorkflow | None = None
_pending_incoming: dict[str, Any] | None = None
_last_data_source: str = "demo"
_seen_message_keys: set[str] = set()
_initial_scan_done = False


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _message_key(email: dict[str, Any]) -> str:
    return "|".join(
        [
            str(email.get("thread_id", "")),
            str(email.get("timestamp", "")),
            str(email.get("subject", "")),
            str(email.get("sender", "")),
        ]
    )


def _parse_ts(value: str) -> datetime:
    try:
        dt = datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return datetime.min.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _pick_latest_scheduling_email(
    raw_emails: list[dict[str, Any]],
) -> dict[str, Any] | None:
    scheduling = [
        e
        for e in raw_emails
        if looks_like_scheduling(
            str(e.get("subject", "")),
            str(e.get("body", "")),
        )
    ]
    if not scheduling:
        return None
    return max(scheduling, key=lambda e: _parse_ts(str(e.get("timestamp", ""))))


def _to_activation_email(email: dict[str, Any]) -> dict[str, Any]:
    return {
        "sender": email.get("sender", ""),
        "recipient": email.get("recipient", ""),
        "subject": email.get("subject", ""),
        "body": email.get("body", ""),
        "requested_duration_minutes": email.get("requested_duration_minutes", 30),
    }


def incoming_email_for_activation() -> dict[str, Any]:
    if _pending_incoming is not None:
        return _pending_incoming
    return _FALLBACK_INCOMING


def scan_snapshot() -> dict[str, Any]:
    return {
        "notification_count": len(_notifications),
        "data_source": _last_data_source,
        "initial_scan_done": _initial_scan_done,
        "pending_email_subject": incoming_email_for_activation().get("subject"),
    }


def _recoverable_minutes(workflow: DetectedWorkflow) -> int:
    manual = sum(step.avg_minutes for step in workflow.current_steps)
    saved_per_run = max(0.0, manual - 3.0)
    weekly_runs = max(1, workflow.occurrence_count // 4)
    return int(round(weekly_runs * saved_per_run))


def _sender_display(sender: str) -> str:
    return sender.split("<")[0].strip() or sender


def _build_scheduling_notification(
    workflow: DetectedWorkflow,
    incoming: dict[str, Any],
) -> NotificationItem:
    recoverable = _recoverable_minutes(workflow)
    sender = _sender_display(str(incoming.get("sender", "Someone")))
    subject = str(incoming.get("subject", "a meeting"))
    return NotificationItem(
        id=_SCHEDULING_NOTIFICATION_ID,
        title="New scheduling email — automate reply?",
        message=(
            f"{sender} asked to \"{subject}\". Sloth scored this workflow "
            f"{workflow.opportunity_score:.0f}/100 and can propose times, "
            f"draft a reply, and hold a calendar slot."
        ),
        created_at=_now_iso(),
        read=False,
        opportunity_id=_OPPORTUNITY_ID,
        recoverable_minutes_per_week=recoverable,
        action="automate",
        status="pending",
    )


def _build_review_notification(workflow: DetectedWorkflow) -> NotificationItem:
    return NotificationItem(
        id="n-workflow-detected",
        title="Repeated workflow detected",
        message=(
            f"Found \"{workflow.workflow_name}\" "
            f"({workflow.occurrence_count} runs). Review the full analysis "
            f"in the dashboard."
        ),
        created_at=_now_iso(),
        read=False,
        opportunity_id=_OPPORTUNITY_ID,
        recoverable_minutes_per_week=_recoverable_minutes(workflow),
        action="review",
        status="pending",
    )


def run_inbox_scan(*, force_analysis: bool = False) -> dict[str, Any]:
    """Poll inbox sources, refresh workflow + notifications when needed."""
    global _notifications, _last_workflow, _pending_incoming
    global _last_data_source, _initial_scan_done

    raw_emails, data_source = ingestion_service.get_raw_emails(prefer_live=True)
    _last_data_source = data_source

    new_keys = [
        key
        for email in raw_emails
        if (key := _message_key(email)) not in _seen_message_keys
    ]
    for key in new_keys:
        _seen_message_keys.add(key)

    latest = _pick_latest_scheduling_email(raw_emails)
    if latest is not None:
        _pending_incoming = _to_activation_email(latest)

    has_new_activity = bool(new_keys)
    should_analyze = (
        force_analysis
        or not _initial_scan_done
        or has_new_activity
        or _last_workflow is None
    )

    used_demo = True
    if should_analyze:
        threads, _ = ingestion_service.get_email_threads(prefer_live=True)
        workflow, used_demo = analysis_service.analyse_workflow_with_meta(threads)
        _last_workflow = workflow
        _initial_scan_done = True

        incoming = incoming_email_for_activation()
        automate = _build_scheduling_notification(workflow, incoming)
        review = _build_review_notification(workflow)

        # Preserve completed automate notification if user already ran it.
        existing_automate = get_notification(_SCHEDULING_NOTIFICATION_ID)
        if existing_automate is not None and existing_automate.status == "completed":
            automate = existing_automate

        _notifications = [automate, review]
        logger.info(
            "Inbox scan analyzed workflow (source=%s, new_messages=%s)",
            data_source,
            len(new_keys),
        )
    elif has_new_activity and latest is not None and _last_workflow is not None:
        incoming = incoming_email_for_activation()
        updated = _build_scheduling_notification(_last_workflow, incoming)
        existing = get_notification(_SCHEDULING_NOTIFICATION_ID)
        if existing is None or existing.status != "completed":
            _notifications = [
                updated,
                *(n for n in _notifications if n.id != _SCHEDULING_NOTIFICATION_ID),
            ]
            if not any(n.id == "n-workflow-detected" for n in _notifications):
                _notifications.append(_build_review_notification(_last_workflow))
        logger.info(
            "Inbox scan refreshed scheduling notification (source=%s)", data_source
        )

    return {
        "data_source": data_source,
        "demo_mode": used_demo or data_source == "demo",
        "new_messages": len(new_keys),
        "analyzed": should_analyze,
        "notification_count": len(_notifications),
        "workflow_name": _last_workflow.workflow_name if _last_workflow else None,
    }


def bootstrap_prototype() -> PrototypeBootstrapResponse:
    """Manual scan — same as watcher but returns the bootstrap API shape."""
    result = run_inbox_scan(force_analysis=True)
    workflow = _last_workflow
    if workflow is None:
        workflow = analysis_service.analyse_workflow()

    return PrototypeBootstrapResponse(
        workflow_name=workflow.workflow_name,
        opportunity_score=workflow.opportunity_score,
        notifications=list_notifications(),
        demo_mode=result["demo_mode"],
        data_source=result["data_source"],
    )


def list_notifications() -> list[NotificationItem]:
    if not _notifications:
        return []
    return list(_notifications)


def get_notification(notification_id: str) -> NotificationItem | None:
    for item in _notifications:
        if item.id == notification_id:
            return item
    return None


def automate_notification(notification_id: str) -> AutomateNotificationResponse:
    item = get_notification(notification_id)
    if item is None:
        raise KeyError(f"Unknown notification: {notification_id}")
    if item.action != "automate":
        raise ValueError(f"Notification {notification_id} is not automatable")

    workflow = _last_workflow or analysis_service.analyse_workflow()
    activation: ActivationResponse = activation_service.activate(
        workflow.automation_rules,
        incoming_email_for_activation(),
    )

    updated = item.model_copy(update={"status": "completed", "read": True})
    for index, existing in enumerate(_notifications):
        if existing.id == notification_id:
            _notifications[index] = updated
            break

    return AutomateNotificationResponse(notification=updated, activation=activation)
