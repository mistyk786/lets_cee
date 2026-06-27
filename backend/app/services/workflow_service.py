"""Workflow extraction service for Sloth.ai.

Calls OpenAI with a structured prompt to detect repeated scheduling-related
workflows from raw email threads, then validates the response against the
shared schema. Any failure falls back to demo data so the demo never breaks.
"""

from __future__ import annotations

import json
import logging

from app.config import Settings, get_settings
from app.constants import DEFAULT_OPENAI_MAX_TOKENS, DEFAULT_OPENAI_MODEL
from app.schemas import DetectedWorkflow
from app.services.automation_service import generate_automation_proposal
from app.services.demo_data import load_demo_workflow
from app.services.heuristic_workflow_service import extract_workflow_heuristic

logger = logging.getLogger(__name__)

# Re-exported for tests and backward compatibility.
MODEL = DEFAULT_OPENAI_MODEL
MAX_TOKENS = DEFAULT_OPENAI_MAX_TOKENS

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


def _build_client(settings: Settings):
    """Construct an OpenAI client. Imported lazily so the module loads even
    when the SDK or API key is absent (e.g. in CI running only scoring tests)."""
    from openai import OpenAI

    if not settings.openai_configured:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=settings.openai_api_key)


def _apply_rule_based_proposal(workflow: DetectedWorkflow) -> DetectedWorkflow:
    return workflow.model_copy(
        update={"automation_proposal": generate_automation_proposal(workflow)}
    )


def extract_workflow_with_meta(
    email_threads: list[dict],
    *,
    demo_mode: bool = False,
    settings: Settings | None = None,
) -> tuple[DetectedWorkflow, bool]:
    """Detect a repeated workflow, reporting whether demo data was used.

    Returns ``(workflow, used_demo_data)`` where ``used_demo_data`` is True
    when demo mode was requested OR the live extraction failed and fell back
    to demo data. This lets callers surface data provenance to consumers.
    """
    active_settings = settings or get_settings()

    if demo_mode:
        logger.info("extract_workflow running in explicit demo mode")
        return load_demo_workflow(), True

    try:
        client = _build_client(active_settings)

        user_message = json.dumps({"email_threads": email_threads})

        response = client.chat.completions.create(
            model=active_settings.openai_model,
            max_tokens=active_settings.openai_max_tokens,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("OpenAI returned empty content")

        workflow = DetectedWorkflow.model_validate(json.loads(content.strip()))
        return _apply_rule_based_proposal(workflow), False
    except Exception as exc:  # noqa: BLE001
        logger.warning("extract_workflow LLM failed: %s", exc)
        if email_threads:
            try:
                workflow = extract_workflow_heuristic(email_threads)
                logger.info(
                    "extract_workflow using heuristic fallback for %d threads",
                    len(email_threads),
                )
                return workflow, False
            except Exception as heuristic_exc:  # noqa: BLE001
                logger.warning(
                    "extract_workflow heuristic failed: %s", heuristic_exc
                )
        logger.warning("extract_workflow falling back to demo data")
        return load_demo_workflow(), True


def extract_workflow(
    email_threads: list[dict],
    *,
    demo_mode: bool = False,
    settings: Settings | None = None,
) -> DetectedWorkflow:
    """Detect a repeated workflow from raw email threads.

    Calls OpenAI with a structured prompt and validates the JSON response
    against ``DetectedWorkflow``. On any API or parse failure, returns
    ``load_demo_workflow()`` so downstream consumers always get valid data.

    Set ``demo_mode=True`` to skip the LLM call entirely (useful for demos,
    CI, and environments without an API key). Use ``extract_workflow_with_meta``
    if you need to know whether demo/fallback data was returned.
    """
    workflow, _ = extract_workflow_with_meta(
        email_threads, demo_mode=demo_mode, settings=settings
    )
    return workflow
