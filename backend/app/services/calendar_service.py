"""Calendar availability logic.

Pure functions for proposing open meeting slots within working hours while
avoiding overlap with existing calendar events. No FastAPI, no file I/O.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date, datetime, time, timedelta, timezone


def _parse_dt(value: str) -> datetime:
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _parse_time(value: str) -> time:
    hour, minute = (int(part) for part in value.split(":")[:2])
    return time(hour=hour, minute=minute)


def _as_date(day: date | str) -> date:
    if isinstance(day, date):
        return day
    return date.fromisoformat(day)


def find_available_slots(
    events: Sequence[Mapping[str, str]],
    meeting_duration_minutes: int,
    working_hours_start: str,
    working_hours_end: str,
    day: date | str,
    max_slots: int = 3,
) -> list[dict[str, str]]:
    """Return up to ``max_slots`` open meeting slots on ``day``.

    Each slot is ``{"start_time": iso, "end_time": iso}`` in UTC, fits entirely
    within the working-hours window, and does not overlap any provided event.
    Events are expected to expose ISO 8601 ``start_time`` and ``end_time``.
    """
    if meeting_duration_minutes <= 0 or max_slots <= 0:
        return []

    target = _as_date(day)
    duration = timedelta(minutes=meeting_duration_minutes)

    window_start = datetime.combine(
        target, _parse_time(working_hours_start), tzinfo=timezone.utc
    )
    window_end = datetime.combine(
        target, _parse_time(working_hours_end), tzinfo=timezone.utc
    )
    if window_start >= window_end:
        return []

    # Collect busy intervals that intersect the working window, clipped to it.
    busy: list[tuple[datetime, datetime]] = []
    for event in events:
        start = _parse_dt(event["start_time"])
        end = _parse_dt(event["end_time"])
        if end <= window_start or start >= window_end:
            continue
        busy.append((max(start, window_start), min(end, window_end)))
    busy.sort()

    # Merge overlapping/adjacent busy intervals.
    merged: list[tuple[datetime, datetime]] = []
    for start, end in busy:
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))

    # Walk the free gaps, cutting back-to-back duration-length slots.
    slots: list[dict[str, str]] = []
    cursor = window_start
    for busy_start, busy_end in [*merged, (window_end, window_end)]:
        while cursor + duration <= busy_start and len(slots) < max_slots:
            slot_end = cursor + duration
            slots.append(
                {
                    "start_time": cursor.isoformat(),
                    "end_time": slot_end.isoformat(),
                }
            )
            cursor = slot_end
        if len(slots) >= max_slots:
            break
        cursor = max(cursor, busy_end)

    return slots
