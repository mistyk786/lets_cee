"""Workflow extraction service for Sloth.ai.

Calls OpenAI with a structured prompt to detect repeated scheduling-related
workflows from raw email threads, then validates the response against the
shared schema. Any failure falls back to demo data so the demo never breaks.
"""

from __future__ import annotations

import json
import logging
import os

from app.schemas import DetectedWorkflow
from app.services.demo_data import load_demo_workflow

logger = logging.getLogger(__name__)

MODEL = "gpt-4o-mini"
MAX_TOKENS = 1500

SYSTEM_PROMPT = """\
You are a workflow analyst for Sloth.ai. You analyse raw email threads to \
detect repeated scheduling-related workflows (e.g. setting up meetings from \
email).

From the threads, identify repeated patterns and extract, for each detected \
workflow: the event title/intent, attendees, meeting duration, and the \
sequence of steps and handoffs. Identify bottlenecks.

Return only a JSON object. No preamble, no markdown, no explanation.

The JSON object MUST match this exact schema:

{
  "workflow_name": str,
  "occurrence_count": int,
  "current_steps": [
    {
      "step_id": str,
      "name": str,
      "description": str,
      "is_manual": bool,
      "avg_minutes": float,
      "is_automatable": bool,
      "requires_approval": bool
    }
  ],
  "bottlenecks": [
    {
      "step_id": str,
      "reason": str,
      "severity": "low" | "medium" | "high"
    }
  ],
  "opportunity_score": float,            // 0-100
  "automation_proposal": [ <WorkflowStep>, ... ],
  "assumptions": [str, ...],
  "automation_rules": {
    "internal_contacts_only": bool,
    "meeting_duration_minutes": int,
    "working_hours_start": str,          // e.g. "09:00"
    "working_hours_end": str,            // e.g. "18:00"
    "approval_required": bool,
    "max_slots_proposed": int
  }
}

Every field is required. step_id values must be consistent between \
current_steps and bottlenecks.\
"""


def _build_client():
    """Construct an OpenAI client. Imported lazily so the module loads even
    when the SDK or API key is absent (e.g. in CI running only scoring tests)."""
    from openai import OpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=api_key)


def extract_workflow(email_threads: list[dict]) -> DetectedWorkflow:
    """Detect a repeated workflow from raw email threads.

    Calls OpenAI with a structured prompt and validates the JSON response
    against ``DetectedWorkflow``. On any API or parse failure, returns
    ``load_demo_workflow()`` so downstream consumers always get valid data.
    """
    try:
        client = _build_client()

        user_message = json.dumps({"email_threads": email_threads})

        response = client.chat.completions.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("OpenAI returned empty content")

        return DetectedWorkflow.model_validate(json.loads(content.strip()))
    except Exception as exc:  # noqa: BLE001 - any failure -> safe fallback
        logger.warning(
            "extract_workflow falling back to demo data: %s", exc
        )
        return load_demo_workflow()
