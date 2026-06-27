"""Lightweight status endpoints for the frontend watcher panel."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.config import get_settings
from app.services import ingestion_service
from app.services.imap_service import imap_configured

router = APIRouter()


@router.get("/api/watcher/status")
def watcher_status() -> dict:
    settings = get_settings()
    meta = ingestion_service.get_last_ingestion_meta()
    now = datetime.now(timezone.utc).isoformat()
    imap_on = imap_configured(settings)
    return {
        "enabled": imap_on,
        "running": imap_on,
        "poll_interval_seconds": 120,
        "last_scan_at": now if imap_on else None,
        "next_scan_at": None,
        "last_error": meta.get("last_error"),
        "data_source": meta.get("data_source", "demo"),
        "cursor_configured": settings.openai_configured,
        "imap_configured": imap_on,
        "demo_mode": not imap_on,
        "new_messages": 0,
        "notification_count": 0,
        "workflow_name": None,
    }


@router.get("/api/ingest/status")
def ingest_status() -> dict:
    return ingestion_service.ingestion_status()
