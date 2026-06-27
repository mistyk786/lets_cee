"""Notification-driven prototype orchestration.

Live product flow:
  1. Scan inbox (IMAP / upload / demo) and detect repeated workflows.
  2. Surface honest notifications — automate only when safe, else explain why not.
  3. User clicks → run activation for scheduling workflows (draft + slots).
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
_NO_AUTOMATION_ID = "n-no-automation"
_WORKFLOW_DETECTED_ID = "n-workflow-detected"
_ACTIONS_ID = "n-automation-actions"
_OPPORTUNITY_ID = "internal-meeting-scheduling"

_MIN_AUTOMATION_SCORE = 45

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


def incoming_email_for_activation() -> dict[str, Any] | None:
    return _pending_incoming


def get_last_workflow() -> DetectedWorkflow | None:
    return _last_workflow


def scan_snapshot() -> dict[str, Any]:
    workflow = _last_workflow
    return {
        "notification_count": len(_notifications),
        "data_source": _last_data_source,
        "initial_scan_done": _initial_scan_done,
        "pending_email_subject": (
            _pending_incoming.get("subject") if _pending_incoming else None
        ),
        "workflow_name": workflow.workflow_name if workflow else None,
        "automation_available": workflow.automation_available if workflow else None,
        "automation_summary": workflow.automation_summary if workflow else None,
        "workflow_category": workflow.workflow_category if workflow else None,
        "email_count": len(_seen_message_keys),
    }


def _recoverable_minutes(workflow: DetectedWorkflow) -> int:
    if not workflow.automation_available:
        return 0
    manual = sum(step.avg_minutes for step in workflow.current_steps)
    saved_per_run = max(0.0, manual - 3.0)
    weekly_runs = max(1, workflow.occurrence_count // 4)
    return int(round(weekly_runs * saved_per_run))


def _sender_display(sender: str) -> str:
    return sender.split("<")[0].strip() or sender


def _workflow_is_actionable(workflow: DetectedWorkflow) -> bool:
    return (
        workflow.automation_available
        and workflow.opportunity_score >= _MIN_AUTOMATION_SCORE
        and workflow.workflow_category != "none"
    )


def _can_one_click_schedule(
    workflow: DetectedWorkflow,
    incoming: dict[str, Any] | None,
) -> bool:
    return (
        _workflow_is_actionable(workflow)
        and workflow.workflow_category == "scheduling"
        and incoming is not None
    )


def _build_no_automation_notification(
    workflow: DetectedWorkflow,
    *,
    data_source: str,
) -> NotificationItem:
    summary = workflow.automation_summary or (
        "Sloth analysed your inbox but did not find a safe, repeatable "
        "workflow worth automating right now."
    )
    if data_source == "imap":
        prefix = "After reading your live inbox: "
    elif data_source == "upload":
        prefix = "After reading your uploaded emails: "
    else:
        prefix = ""

    return NotificationItem(
        id=_NO_AUTOMATION_ID,
        title="No automation available",
        message=f"{prefix}{summary}",
        created_at=_now_iso(),
        read=False,
        opportunity_id=None,
        recoverable_minutes_per_week=0,
        action="review",
        status="pending",
    )


def _build_scheduling_notification(
    workflow: DetectedWorkflow,
    incoming: dict[str, Any],
) -> NotificationItem:
    recoverable = _recoverable_minutes(workflow)
    sender = _sender_display(str(incoming.get("sender", "Someone")))
    subject = str(incoming.get("subject", "a meeting"))
    actions = workflow.automatable_actions
    action_hint = (
        actions[0]
        if actions
        else "propose times, draft a reply, and hold a calendar slot"
    )
    return NotificationItem(
        id=_SCHEDULING_NOTIFICATION_ID,
        title="Scheduling workflow — automate reply?",
        message=(
            f"{sender} asked about \"{subject}\". Sloth scored this "
            f"{workflow.opportunity_score:.0f}/100 and can {action_hint}."
        ),
        created_at=_now_iso(),
        read=False,
        opportunity_id=_OPPORTUNITY_ID,
        recoverable_minutes_per_week=recoverable,
        action="automate",
        status="pending",
    )


def _build_review_notification(workflow: DetectedWorkflow) -> NotificationItem:
    actions = workflow.automatable_actions
    action_line = (
        f" Possible actions: {', '.join(actions[:4])}."
        if actions
        else ""
    )
    return NotificationItem(
        id=_WORKFLOW_DETECTED_ID,
        title="Workflow detected in your inbox",
        message=(
            f"Found \"{workflow.workflow_name}\" "
            f"({workflow.occurrence_count} similar instances, "
            f"score {workflow.opportunity_score:.0f}/100). "
            f"{workflow.automation_summary or ''}{action_line}"
        ).strip(),
        created_at=_now_iso(),
        read=False,
        opportunity_id=_OPPORTUNITY_ID if _workflow_is_actionable(workflow) else None,
        recoverable_minutes_per_week=_recoverable_minutes(workflow),
        action="review",
        status="pending",
    )


def _build_actions_notification(workflow: DetectedWorkflow) -> NotificationItem:
    actions = workflow.automatable_actions[:5]
    return NotificationItem(
        id=_ACTIONS_ID,
        title=f"What Sloth can help with ({workflow.workflow_category})",
        message=(
            workflow.automation_summary
            or "Sloth identified steps that could be assisted with your approval:"
        )
        + " "
        + "; ".join(actions),
        created_at=_now_iso(),
        read=False,
        opportunity_id=_OPPORTUNITY_ID if _workflow_is_actionable(workflow) else None,
        recoverable_minutes_per_week=_recoverable_minutes(workflow),
        action="review",
        status="pending",
    )


def _build_notifications_for_workflow(
    workflow: DetectedWorkflow,
    *,
    data_source: str,
    incoming: dict[str, Any] | None,
) -> list[NotificationItem]:
    if not _workflow_is_actionable(workflow):
        return [_build_no_automation_notification(workflow, data_source=data_source)]

    items: list[NotificationItem] = [_build_review_notification(workflow)]

    if workflow.automatable_actions and workflow.workflow_category != "scheduling":
        items.append(_build_actions_notification(workflow))

    if _can_one_click_schedule(workflow, incoming):
        items.insert(0, _build_scheduling_notification(workflow, incoming))

    return items


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
    _pending_incoming = _to_activation_email(latest) if latest else None

    has_new_activity = bool(new_keys)
    should_analyze = (
        force_analysis
        or not _initial_scan_done
        or has_new_activity
        or _last_workflow is None
    )

    used_demo = data_source == "demo"
    if should_analyze:
        threads, thread_source = ingestion_service.get_email_threads(
            prefer_live=True
        )
        workflow, used_demo = analysis_service.analyse_workflow_with_meta(threads)
        _last_workflow = workflow
        _initial_scan_done = True

        incoming = incoming_email_for_activation()
        built = _build_notifications_for_workflow(
            workflow,
            data_source=data_source,
            incoming=incoming,
        )

        existing_automate = get_notification(_SCHEDULING_NOTIFICATION_ID)
        if existing_automate is not None and existing_automate.status == "completed":
            built = [
                existing_automate,
                *(n for n in built if n.id != _SCHEDULING_NOTIFICATION_ID),
            ]

        _notifications = built
        logger.info(
            "Inbox scan analyzed workflow (source=%s, new_messages=%s, "
            "automation_available=%s)",
            thread_source,
            len(new_keys),
            workflow.automation_available,
        )
    elif has_new_activity and _last_workflow is not None:
        incoming = incoming_email_for_activation()
        if _can_one_click_schedule(_last_workflow, incoming):
            updated = _build_scheduling_notification(_last_workflow, incoming)
            existing = get_notification(_SCHEDULING_NOTIFICATION_ID)
            if existing is None or existing.status != "completed":
                _notifications = [
                    updated,
                    *(n for n in _notifications if n.id != _SCHEDULING_NOTIFICATION_ID),
                ]
        logger.info(
            "Inbox scan refreshed scheduling notification (source=%s)", data_source
        )

    return {
        "data_source": data_source,
        "demo_mode": used_demo,
        "new_messages": len(new_keys),
        "analyzed": should_analyze,
        "notification_count": len(_notifications),
        "workflow_name": _last_workflow.workflow_name if _last_workflow else None,
        "automation_available": (
            _last_workflow.automation_available if _last_workflow else False
        ),
        "automation_summary": (
            _last_workflow.automation_summary if _last_workflow else None
        ),
    }


def bootstrap_prototype(*, force: bool = False) -> PrototypeBootstrapResponse:
    """Manual scan — returns cached results instantly unless ``force=True``."""
    if not force and _initial_scan_done and _last_workflow is not None:
        return _bootstrap_response(_last_workflow, demo_mode=_last_data_source == "demo")

    result = run_inbox_scan(force_analysis=True)
    workflow = _last_workflow
    if workflow is None:
        workflow = analysis_service.analyse_workflow()

    return _bootstrap_response(
        workflow,
        demo_mode=result["demo_mode"],
        data_source=result["data_source"],
    )


def _bootstrap_response(
    workflow: DetectedWorkflow,
    *,
    demo_mode: bool = False,
    data_source: str | None = None,
) -> PrototypeBootstrapResponse:
    return PrototypeBootstrapResponse(
        workflow_name=workflow.workflow_name,
        opportunity_score=workflow.opportunity_score,
        notifications=list_notifications(),
        demo_mode=demo_mode,
        data_source=data_source or _last_data_source,
        automation_available=workflow.automation_available,
        automation_summary=workflow.automation_summary,
        workflow_category=workflow.workflow_category,
        automatable_actions=workflow.automatable_actions,
        workflow=workflow.model_dump(),
    )


def list_notifications() -> list[NotificationItem]:
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
    incoming = incoming_email_for_activation()
    if incoming is None:
        raise ValueError("No scheduling email available to automate")

    activation: ActivationResponse = activation_service.activate(
        workflow.automation_rules,
        incoming,
    )

    updated = item.model_copy(update={"status": "completed", "read": True})
    for index, existing in enumerate(_notifications):
        if existing.id == notification_id:
            _notifications[index] = updated
            break

    return AutomateNotificationResponse(notification=updated, activation=activation)
