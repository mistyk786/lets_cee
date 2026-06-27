"""Unit tests for the public SlothEngine facade."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.config import Settings, reset_settings_cache
from app.engine import SlothEngine
from app.schemas import OpportunityInputs


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    reset_settings_cache()
    yield
    reset_settings_cache()


def test_health_ok_when_cursor_configured():
    engine = SlothEngine(
        settings=Settings(cursor_api_key="test-key", environment="test")
    )
    health = engine.health()
    assert health.status == "ok"
    assert health.cursor_configured is True
    assert health.openai_configured is True
    assert health.demo_available is True


def test_health_degraded_without_cursor():
    engine = SlothEngine(
        settings=Settings(environment="test", cursor_api_key=None, openai_api_key=None)
    )
    health = engine.health()
    assert health.status == "degraded"
    assert health.cursor_configured is False
    assert health.openai_configured is False


def test_demo_analysis_returns_full_bundle():
    engine = SlothEngine(settings=Settings(environment="test"))
    result = engine.demo_analysis()
    assert result.demo_mode is True
    assert result.workflow.occurrence_count == 47
    assert result.forecast is not None
    assert result.forecast.likely_hours_saved == 9.8
    assert result.effectiveness is not None
    assert result.effectiveness.overall_score == 74.0
    assert result.engine_version


def test_analyze_with_auto_forecast():
    engine = SlothEngine(settings=Settings(environment="test"))
    result = engine.analyze([], demo_mode=True, auto_forecast=True)
    assert result.forecast is not None
    assert result.forecast.manual_minutes_per_run == 18.0


def test_estimate_forecast_inputs_from_workflow():
    engine = SlothEngine(settings=Settings(environment="test"))
    workflow = engine.detect_workflow([], demo_mode=True)
    inputs = engine.estimate_forecast_inputs(workflow)
    assert inputs.eligible_runs == 47
    assert inputs.manual_minutes_per_run == 18.0


def test_estimate_forecast_inputs_respects_explicit_zero_runs():
    # Regression: explicit eligible_runs=0 must not fall back to occurrence_count.
    engine = SlothEngine(settings=Settings(environment="test"))
    workflow = engine.detect_workflow([], demo_mode=True)
    inputs = engine.estimate_forecast_inputs(workflow, eligible_runs=0)
    assert inputs.eligible_runs == 0


def test_score_opportunity_via_engine():
    engine = SlothEngine(settings=Settings(environment="test"))
    score = engine.score_opportunity(
        OpportunityInputs(
            repetition=0.9,
            manual_effort=0.8,
            consistency=0.7,
            data_availability=0.8,
            risk=0.2,
        )
    )
    assert score == 71.0


def test_analyze_marks_demo_mode_on_silent_fallback():
    engine = SlothEngine(
        settings=Settings(environment="test", cursor_api_key=None, openai_api_key=None)
    )
    result = engine.analyze([{"subject": "sync"}], demo_mode=False)
    assert result.demo_mode is True
    assert result.workflow.workflow_name == "Email-to-Calendar Meeting Scheduling"


def test_analyze_live_path_with_mock_cursor():
    engine = SlothEngine(
        settings=Settings(cursor_api_key="test-key", environment="test")
    )
    demo = engine.detect_workflow([], demo_mode=True)

    with patch(
        "app.services.workflow_service.complete_json_prompt",
        return_value=demo.model_dump(),
    ):
        result = engine.analyze([{"subject": "sync"}], auto_forecast=True)

    assert result.demo_mode is False
    assert result.workflow.workflow_name == demo.workflow_name
    assert result.forecast is not None
