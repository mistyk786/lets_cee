"""Per-inbox prototype state (demo vs each connected user session)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.models import NotificationItem
from app.request_context import get_inbox_context_key
from app.schemas import DetectedWorkflow


@dataclass
class PrototypeState:
    notifications: list[NotificationItem] = field(default_factory=list)
    last_workflow: DetectedWorkflow | None = None
    pending_incoming: dict[str, Any] | None = None
    last_data_source: str = "demo"
    seen_message_keys: set[str] = field(default_factory=set)
    initial_scan_done: bool = False
    scan_in_progress: bool = False
    last_scan_at: datetime | None = None
    last_error: str | None = None


_states: dict[str, PrototypeState] = {}


def get_state() -> PrototypeState:
    key = get_inbox_context_key()
    if key not in _states:
        _states[key] = PrototypeState()
    return _states[key]


def reset_state(key: str | None = None) -> None:
    target = key or get_inbox_context_key()
    _states.pop(target, None)
