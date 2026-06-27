"""Unit tests for workflow extraction and fallback behaviour."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.config import reset_settings_cache
from app.services.demo_data import load_demo_workflow
from app.services.workflow_service import (
    extract_workflow,
    extract_workflow_with_meta,
    MODEL,
)


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    reset_settings_cache()
    yield
    reset_settings_cache()


def test_extract_workflow_falls_back_without_api_key():
    with patch.dict("os.environ", {}, clear=True):
        result = extract_workflow([{"subject": "meet", "body": "sync?"}])
    assert result.workflow_name == "Email-to-Calendar Meeting Scheduling"
    assert result.occurrence_count == 47


def test_extract_workflow_parses_valid_cursor_response():
    demo = load_demo_workflow()

    with patch(
        "app.services.workflow_service.complete_json_prompt",
        return_value=demo.model_dump(),
    ):
        with patch.dict("os.environ", {"CURSOR_API_KEY": "test-key"}):
            result = extract_workflow([{"subject": "Q4 planning"}])

    assert result.workflow_name == demo.workflow_name
    assert result.occurrence_count == demo.occurrence_count


def test_extract_workflow_falls_back_on_invalid_json():
    with patch(
        "app.services.workflow_service.complete_json_prompt",
        side_effect=ValueError("bad json"),
    ):
        with patch.dict("os.environ", {"CURSOR_API_KEY": "test-key"}):
            result = extract_workflow([{"subject": "test"}])

    assert result.occurrence_count == 47


def test_extract_workflow_overrides_llm_proposal_with_rules():
    demo = load_demo_workflow()
    payload = demo.model_copy(update={"automation_proposal": []}).model_dump()

    with patch(
        "app.services.workflow_service.complete_json_prompt",
        return_value=payload,
    ):
        with patch.dict("os.environ", {"CURSOR_API_KEY": "test-key"}):
            result = extract_workflow([{"subject": "Q4 planning"}])

    assert len(result.automation_proposal) == 7
    assert result.automation_proposal[-1].step_id == "step_7"
    assert result.automation_proposal[-1].is_manual is True


def test_extract_workflow_demo_mode_skips_cursor():
    with patch(
        "app.services.workflow_service.complete_json_prompt"
    ) as mock_cursor:
        result = extract_workflow([], demo_mode=True)
    mock_cursor.assert_not_called()
    assert result.occurrence_count == 47


def test_extract_workflow_with_meta_reports_demo_mode():
    workflow, used_demo = extract_workflow_with_meta([], demo_mode=True)
    assert used_demo is True
    assert workflow.occurrence_count == 47


def test_extract_workflow_with_meta_reports_fallback():
    workflow, used_demo = extract_workflow_with_meta([{"subject": "x"}])
    assert used_demo is True
    assert workflow.workflow_name == "Email-to-Calendar Meeting Scheduling"


def test_extract_workflow_with_meta_reports_live_success():
    demo = load_demo_workflow()

    with patch(
        "app.services.workflow_service.complete_json_prompt",
        return_value=demo.model_dump(),
    ):
        with patch.dict("os.environ", {"CURSOR_API_KEY": "test-key"}):
            workflow, used_demo = extract_workflow_with_meta([{"subject": "x"}])

    assert used_demo is False
    assert workflow.workflow_name == demo.workflow_name


def test_extract_workflow_falls_back_on_empty_content():
    with patch(
        "app.services.workflow_service.complete_json_prompt",
        side_effect=ValueError("Cursor returned empty content"),
    ):
        with patch.dict("os.environ", {"CURSOR_API_KEY": "test-key"}):
            result = extract_workflow([{"subject": "test"}])

    assert result.opportunity_score == 78.5


def test_model_constant_is_cursor_default():
    assert MODEL == "composer-2.5"
