from app.services.calendar_service import find_available_slots

WORK_START = "09:00"
WORK_END = "17:00"
DAY = "2026-06-29"


def test_fully_free_day_returns_back_to_back_slots():
    slots = find_available_slots([], 30, WORK_START, WORK_END, DAY, max_slots=3)

    assert len(slots) == 3
    assert slots[0]["start_time"].startswith("2026-06-29T09:00:00")
    assert slots[0]["end_time"].startswith("2026-06-29T09:30:00")
    assert slots[1]["start_time"].startswith("2026-06-29T09:30:00")
    assert slots[2]["start_time"].startswith("2026-06-29T10:00:00")


def test_partially_booked_day_skips_busy_block():
    events = [
        {
            "start_time": "2026-06-29T09:00:00+00:00",
            "end_time": "2026-06-29T10:00:00+00:00",
        },
        {
            "start_time": "2026-06-29T11:00:00+00:00",
            "end_time": "2026-06-29T11:30:00+00:00",
        },
    ]

    slots = find_available_slots(events, 30, WORK_START, WORK_END, DAY, max_slots=3)

    assert len(slots) == 3
    # First opening is right after the 09:00-10:00 block.
    assert slots[0]["start_time"].startswith("2026-06-29T10:00:00")
    assert slots[1]["start_time"].startswith("2026-06-29T10:30:00")
    # No slot may overlap the 11:00-11:30 block.
    assert all(
        not s["start_time"].startswith("2026-06-29T11:00:00") for s in slots
    )


def test_no_availability_when_fully_booked():
    events = [
        {
            "start_time": "2026-06-29T08:00:00+00:00",
            "end_time": "2026-06-29T18:00:00+00:00",
        }
    ]

    slots = find_available_slots(events, 30, WORK_START, WORK_END, DAY, max_slots=3)

    assert slots == []
