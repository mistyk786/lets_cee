"""Background inbox polling for passive workflow detection.

Runs on a timer while the API is up: fetches inbox (IMAP, upload, or demo),
detects new scheduling-related messages, re-runs workflow analysis when needed,
and updates prototype notifications without a manual bootstrap click.
"""

from __future__ import annotations

import logging
import threading
from datetime import datetime, timedelta, timezone

from app.config import Settings, get_settings
from app.services import prototype_service

logger = logging.getLogger(__name__)

_stop = threading.Event()
_thread: threading.Thread | None = None
_running = False
_last_error: str | None = None
_last_scan_at: datetime | None = None
_next_scan_at: datetime | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def start(*, settings: Settings | None = None) -> None:
    """Start the background watcher thread (no-op if disabled or already running)."""
    global _thread, _running

    active = settings or get_settings()
    if not active.inbox_poll_enabled:
        logger.info("Inbox watcher disabled (INBOX_POLL_ENABLED=false)")
        return
    if _thread is not None and _thread.is_alive():
        return

    _stop.clear()
    _running = True
    _thread = threading.Thread(
        target=_run_loop,
        args=(active.inbox_poll_interval_seconds,),
        name="sloth-inbox-watcher",
        daemon=True,
    )
    _thread.start()
    logger.info(
        "Inbox watcher started (interval=%ss)", active.inbox_poll_interval_seconds
    )


def stop() -> None:
    """Signal the watcher thread to stop."""
    global _running
    _running = False
    _stop.set()
    logger.info("Inbox watcher stopped")


def trigger_scan(*, force_analysis: bool = False) -> dict:
    """Run one inbox scan immediately (used by API manual trigger)."""
    return _scan_once(force_analysis=force_analysis)


def status() -> dict:
    """Return watcher health for debugging and the frontend."""
    active = get_settings()
    interval = active.inbox_poll_interval_seconds
    seconds_until_next: float | None = None
    if _running and _next_scan_at is not None:
        seconds_until_next = max(0.0, (_next_scan_at - _now()).total_seconds())

    return {
        "enabled": active.inbox_poll_enabled,
        "running": _running and _thread is not None and _thread.is_alive(),
        "poll_interval_seconds": interval,
        "last_scan_at": _last_scan_at.isoformat() if _last_scan_at else None,
        "next_scan_in_seconds": seconds_until_next,
        "last_error": _last_error,
        **prototype_service.scan_snapshot(),
    }


def _scan_once(*, force_analysis: bool = False) -> dict:
    global _last_error, _last_scan_at

    try:
        result = prototype_service.run_inbox_scan(force_analysis=force_analysis)
        _last_error = None
        _last_scan_at = _now()
        return result
    except Exception as exc:  # noqa: BLE001
        _last_error = str(exc)
        logger.warning("Inbox scan failed: %s", exc)
        raise


def _run_loop(interval_seconds: int) -> None:
    global _next_scan_at

    try:
        _scan_once(force_analysis=True)
    except Exception:
        pass

    while not _stop.is_set():
        _next_scan_at = _now() + timedelta(seconds=interval_seconds)
        if _stop.wait(timeout=interval_seconds):
            break
        try:
            _scan_once(force_analysis=False)
        except Exception:
            pass

    global _running
    _running = False
