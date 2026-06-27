"""Cursor Cloud Agents API client for structured workflow extraction.

Uses the public Cloud Agents REST API (no OpenAI dependency). Each extraction
creates a short-lived no-repo cloud agent, waits for the run to finish, and
returns the assistant's final text (expected to be JSON).
"""

from __future__ import annotations

import json
import logging
import re
import time

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)

CURSOR_API_BASE = "https://api.cursor.com"
_TERMINAL_STATUSES = frozenset({"FINISHED", "ERROR", "CANCELLED", "EXPIRED"})


def _auth(api_key: str) -> tuple[str, str]:
    return (api_key, "")


def _extract_json_object(text: str) -> dict:
    """Parse JSON from raw assistant text, tolerating markdown fences."""
    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Cursor response did not contain a JSON object")
    return json.loads(cleaned[start : end + 1])


def complete_json_prompt(
    *,
    system_prompt: str,
    user_payload: dict,
    settings: Settings,
    timeout_seconds: float | None = None,
) -> dict:
    """Run a one-shot Cursor cloud agent and parse a JSON object from the reply."""
    if not settings.cursor_configured:
        raise RuntimeError("CURSOR_API_KEY is not set")

    timeout = timeout_seconds or float(settings.cursor_timeout_seconds)
    poll_interval = settings.cursor_poll_interval_seconds
    max_polls = max(1, int(timeout / poll_interval))

    user_message = json.dumps(user_payload, ensure_ascii=False)
    prompt_text = (
        f"{system_prompt}\n\n"
        "Respond with ONLY a single JSON object matching the schema above. "
        "No markdown, no code fences, no explanation.\n\n"
        f"Input data:\n{user_message}"
    )

    with httpx.Client(timeout=httpx.Timeout(30.0, read=timeout)) as client:
        create = client.post(
            f"{CURSOR_API_BASE}/v1/agents",
            auth=_auth(settings.cursor_api_key),  # type: ignore[arg-type]
            json={
                "prompt": {"text": prompt_text},
                "model": {"id": settings.cursor_model},
            },
        )
        create.raise_for_status()
        payload = create.json()
        agent_id = payload["agent"]["id"]
        run_id = payload["run"]["id"]
        logger.info("Cursor agent %s run %s started", agent_id, run_id)

        for attempt in range(max_polls):
            run_resp = client.get(
                f"{CURSOR_API_BASE}/v1/agents/{agent_id}/runs/{run_id}",
                auth=_auth(settings.cursor_api_key),  # type: ignore[arg-type]
            )
            run_resp.raise_for_status()
            run = run_resp.json()
            status = run.get("status", "")
            if status not in _TERMINAL_STATUSES:
                time.sleep(poll_interval)
                continue

            if status != "FINISHED":
                detail = run.get("result") or status
                raise RuntimeError(f"Cursor run ended with {status}: {detail}")

            result_text = run.get("result") or ""
            if not result_text.strip():
                raise ValueError("Cursor returned empty content")
            return _extract_json_object(result_text)

        raise TimeoutError(
            f"Cursor run {run_id} did not finish within {timeout:.0f}s"
        )
