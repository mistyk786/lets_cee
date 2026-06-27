"""Workflow extraction service for Sloth.ai.

Calls the Cursor Cloud Agents API with a structured prompt to detect repeated
scheduling-related workflows from raw email threads, then validates the
response against the shared schema. Any failure falls back to demo data so the
demo never breaks.
"""

from __future__ import annotations

import logging

from app.config import Settings, get_settings
from app.constants import DEFAULT_CURSOR_MODEL
from app.schemas import DetectedWorkflow
from app.services.automation_service import generate_automation_proposal
from app.services.cursor_service import complete_json_prompt
from app.services.demo_data import load_demo_workflow

logger = logging.getLogger(__name__)

# Re-exported for tests and backward compatibility.
MODEL = DEFAULT_CURSOR_MODEL

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

    if not active_settings.cursor_configured:
        logger.warning("extract_workflow falling back to demo data: no Cursor API key")
        return load_demo_workflow(), True

    try:
        payload = complete_json_prompt(
            system_prompt=SYSTEM_PROMPT,
            user_payload={"email_threads": email_threads},
            settings=active_settings,
        )
        workflow = DetectedWorkflow.model_validate(payload)
        return _apply_rule_based_proposal(workflow), False
    except Exception as exc:  # noqa: BLE001 - any failure -> safe fallback
        logger.warning(
            "extract_workflow falling back to demo data: %s", exc
        )
        return load_demo_workflow(), True


def extract_workflow(
    email_threads: list[dict],
    *,
    demo_mode: bool = False,
    settings: Settings | None = None,
) -> DetectedWorkflow:
    """Detect a repeated workflow from raw email thread dicts.

    Calls Cursor with a structured prompt and validates the JSON response
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
