"""Unit tests for workflow extraction and fallback behaviour."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from app.services.demo_data import load_demo_workflow
from app.services.workflow_service import extract_workflow, MODEL, MAX_TOKENS


def test_extract_workflow_falls_back_without_api_key():
    with patch.dict("os.environ", {}, clear=True):
        result = extract_workflow([{"subject": "meet", "body": "sync?"}])
    assert result.workflow_name == "Email-to-Calendar Meeting Scheduling"
    assert result.occurrence_count == 47


def test_extract_workflow_parses_valid_openai_response():
    demo = load_demo_workflow()
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content=json.dumps(demo.model_dump())))
    ]
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch("openai.OpenAI", return_value=mock_client):
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            result = extract_workflow([{"subject": "Q4 planning"}])

    assert result.workflow_name == demo.workflow_name
    assert result.occurrence_count == demo.occurrence_count
    mock_client.chat.completions.create.assert_called_once()
    call_kwargs = mock_client.chat.completions.create.call_args.kwargs
    assert call_kwargs["model"] == MODEL
    assert call_kwargs["max_tokens"] == MAX_TOKENS
    assert call_kwargs["response_format"] == {"type": "json_object"}


def test_extract_workflow_falls_back_on_invalid_json():
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content="Sorry, I cannot help with that."))
    ]
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch("openai.OpenAI", return_value=mock_client):
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            result = extract_workflow([{"subject": "test"}])

    assert result.occurrence_count == 47


def test_extract_workflow_overrides_llm_proposal_with_rules():
    demo = load_demo_workflow()
    payload = demo.model_copy(update={"automation_proposal": []}).model_dump()
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content=json.dumps(payload)))
    ]
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch("openai.OpenAI", return_value=mock_client):
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            result = extract_workflow([{"subject": "Q4 planning"}])

    assert len(result.automation_proposal) == 7
    assert result.automation_proposal[-1].step_id == "step_7"
    assert result.automation_proposal[-1].is_manual is True


def test_extract_workflow_falls_back_on_empty_content():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content=""))]
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response

    with patch("openai.OpenAI", return_value=mock_client):
        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}):
            result = extract_workflow([{"subject": "test"}])

    assert result.opportunity_score == 78.5
