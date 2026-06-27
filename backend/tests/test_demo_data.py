"""Unit tests for demo fallback data."""

from __future__ import annotations

from app.services.demo_data import (
    _DEMO_EFFECTIVENESS_INPUTS,
    _DEMO_FORECAST_INPUTS,
    _DEMO_OPPORTUNITY_SCORE,
    load_demo_effectiveness,
    load_demo_forecast,
    load_demo_workflow,
)
from app.services.scoring_service import calculate_effectiveness, calculate_forecast


def test_demo_workflow_spec_constants():
    workflow = load_demo_workflow()
    assert workflow.workflow_name == "Email-to-Calendar Meeting Scheduling"
    assert workflow.occurrence_count == 47
    assert workflow.opportunity_score == _DEMO_OPPORTUNITY_SCORE == 78.5
    assert len(workflow.current_steps) == 7


def test_demo_forecast_matches_scoring_function():
    demo = load_demo_forecast()
    expected = calculate_forecast(**_DEMO_FORECAST_INPUTS)
    assert demo == expected
    assert demo.likely_hours_saved == 9.8
    assert demo.conservative_hours_saved == 6.86
    assert demo.optimistic_hours_saved == 11.76


def test_demo_effectiveness_matches_scoring_function():
    demo = load_demo_effectiveness()
    expected = calculate_effectiveness(**_DEMO_EFFECTIVENESS_INPUTS)
    assert demo == expected
    assert demo.overall_score == 74.0
    assert demo.safety_status == "ok"
    assert demo.recommendation == "Good performance. Monitor exception rate."


def test_demo_step_minutes_align_with_forecast_input():
    workflow = load_demo_workflow()
    step_total = sum(step.avg_minutes for step in workflow.current_steps)
    assert step_total == _DEMO_FORECAST_INPUTS["manual_minutes_per_run"]
