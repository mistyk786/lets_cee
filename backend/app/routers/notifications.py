from fastapi import APIRouter, HTTPException

from app.models import (
    AutomateNotificationResponse,
    NotificationItem,
    PrototypeBootstrapResponse,
)
from app.services import inbox_watcher, prototype_service

router = APIRouter()


@router.get("/api/watcher/status")
def watcher_status() -> dict:
    """Background inbox poll state (for debugging and the UI)."""
    return inbox_watcher.status()


@router.post("/api/watcher/scan")
def watcher_scan_now() -> dict:
    """Trigger an immediate inbox scan."""
    try:
        return inbox_watcher.trigger_scan(force_analysis=True)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/api/prototype/bootstrap", response_model=PrototypeBootstrapResponse)
def bootstrap_prototype() -> PrototypeBootstrapResponse:
    """Scan demo inbox and surface actionable notifications."""
    return prototype_service.bootstrap_prototype()


@router.get("/api/notifications", response_model=list[NotificationItem])
def list_notifications() -> list[NotificationItem]:
    return prototype_service.list_notifications()


@router.get("/api/notifications/{notification_id}", response_model=NotificationItem)
def get_notification(notification_id: str) -> NotificationItem:
    item = prototype_service.get_notification(notification_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return item


@router.post(
    "/api/notifications/{notification_id}/automate",
    response_model=AutomateNotificationResponse,
)
def automate_notification(notification_id: str) -> AutomateNotificationResponse:
    try:
        return prototype_service.automate_notification(notification_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
