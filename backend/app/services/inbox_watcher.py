"""Background inbox polling for passive workflow detection."""

from __future__ import annotations

import logging
import threading
from datetime import datetime, timedelta, timezone

from app.config import Settings, get_settings
from app.request_context import apply_request_context, capture_request_context
from app.services import prototype_service
from app.services.prototype_state import get_state

logger = logging.getLogger(__name__)

_stop = threading.Event()
_thread: threading.Thread | None = None
_running = False


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
    """Run one inbox scan immediately (blocks until Cursor finishes)."""
    return _scan_once(force_analysis=force_analysis)


def trigger_scan_async(*, force_analysis: bool = False) -> dict:
    """Start a scan in the background; returns immediately for the UI to poll."""
    state = get_state()
    if state.scan_in_progress:
        snap = status()
        snap["scan_in_progress"] = True
        return snap

    ctx_key, ctx_settings = capture_request_context()
    state.scan_in_progress = True

    def _run() -> None:
        apply_request_context(ctx_key, ctx_settings)
        try:
            _scan_once(force_analysis=force_analysis)
        except Exception:
            pass
        finally:
            get_state().scan_in_progress = False

    threading.Thread(
        target=_run,
        name="sloth-manual-scan",
        daemon=True,
    ).start()

    snap = status()
    snap["scan_in_progress"] = True
    return snap


def status() -> dict:
    """Return watcher health for debugging and the frontend."""
    active = get_settings()
    interval = active.inbox_poll_interval_seconds
    state = get_state()
    seconds_until_next: float | None = None
    if _running:
        seconds_until_next = float(interval)

    return {
        "enabled": active.inbox_poll_enabled,
        "running": _running and _thread is not None and _thread.is_alive(),
        "poll_interval_seconds": interval,
        "last_scan_at": (
            state.last_scan_at.isoformat() if state.last_scan_at else None
        ),
        "next_scan_in_seconds": seconds_until_next,
        "last_error": state.last_error,
        "scan_in_progress": state.scan_in_progress,
        **prototype_service.scan_snapshot(),
    }


def _scan_once(*, force_analysis: bool = False) -> dict:
    state = get_state()
    try:
        result = prototype_service.run_inbox_scan(force_analysis=force_analysis)
        state.last_error = None
        state.last_scan_at = _now()
        return result
    except Exception as exc:  # noqa: BLE001
        state.last_error = str(exc)
        logger.warning("Inbox scan failed: %s", exc)
        raise


def _run_loop(interval_seconds: int) -> None:
    apply_request_context("demo", None)
    try:
        _scan_once(force_analysis=True)
    except Exception:
        pass

    while not _stop.is_set():
        if _stop.wait(timeout=interval_seconds):
            break
        try:
            _scan_once(force_analysis=False)
        except Exception:
            pass

    global _running
    _running = False
