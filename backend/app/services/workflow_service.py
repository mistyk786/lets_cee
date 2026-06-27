"""Workflow extraction service for Sloth.ai.

Calls the Cursor Cloud Agents API with a structured prompt to detect repeated
workflows from raw email threads, then validates the response against the
shared schema. Live IMAP analysis returns an honest empty result on failure;
bundled demo data is only used when no live inbox is configured.
"""

from __future__ import annotations

import logging

from app.config import Settings, get_settings
from app.constants import DEFAULT_CURSOR_MODEL
from app.schemas import DetectedWorkflow
from app.services.automation_service import generate_automation_proposal
from app.services.cursor_service import complete_json_prompt
from app.services.demo_data import build_no_automation_workflow, load_demo_workflow
from app.services.imap_service import imap_configured

logger = logging.getLogger(__name__)

# Re-exported for tests and backward compatibility.
MODEL = DEFAULT_CURSOR_MODEL

_MIN_AUTOMATION_SCORE = 45

SYSTEM_PROMPT = """\
You are a workflow analyst for Sloth.ai. You analyse raw email threads to \
detect repeated manual work that could be partially automated.

Look for ANY repeatable patterns, not only meetings. Examples include:
- Meeting / calendar scheduling from email
- Follow-ups and status-check nudges
- Approval or sign-off loops
- Weekly reports or recurring summaries
- Onboarding / handoff checklists
- Vendor or customer coordination threads

From the threads, identify the strongest repeated workflow (if any). For each \
detected workflow extract: name, category, manual steps, bottlenecks, what can \
realistically be automated, and safety constraints.

Set automation_available to false when:
- Threads are mostly one-off or promotional
- No clear repetition (occurrence_count < 3)
- Opportunity score would be below 45
- Automation would be unsafe without heavy human review

When automation_available is false, still explain why in automation_summary.

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
    "working_hours_start": str,
    "working_hours_end": str,
    "approval_required": bool,
    "max_slots_proposed": int
  },
  "automation_available": bool,
  "workflow_category": "scheduling" | "follow_up" | "approval" | "reporting" | "onboarding" | "coordination" | "none" | "other",
  "automation_summary": str,
  "automatable_actions": [str, ...]
}

Every field is required. step_id values must be consistent between \
current_steps and bottlenecks.\
"""


def _apply_rule_based_proposal(workflow: DetectedWorkflow) -> DetectedWorkflow:
    return workflow.model_copy(
        update={"automation_proposal": generate_automation_proposal(workflow)}
    )


def _normalize_workflow(workflow: DetectedWorkflow) -> DetectedWorkflow:
    """Enforce server-side guardrails on AI output."""
    available = workflow.automation_available
    summary = workflow.automation_summary

    if workflow.opportunity_score < _MIN_AUTOMATION_SCORE:
        available = False
        if not summary:
            summary = (
                "Workflow score is too low for safe automation right now."
            )

    if workflow.occurrence_count < 3 and workflow.workflow_category != "none":
        available = False
        if not summary:
            summary = "Not enough repeated instances to justify automation."

    if not workflow.automatable_actions and not available:
        if not summary:
            summary = "No concrete automatable actions were identified."

    return workflow.model_copy(
        update={
            "automation_available": available,
            "automation_summary": summary or workflow.automation_summary,
        }
    )


def _live_inbox_configured(settings: Settings) -> bool:
    return imap_configured(settings)


def extract_workflow_with_meta(
    email_threads: list[dict],
    *,
    demo_mode: bool = False,
    settings: Settings | None = None,
) -> tuple[DetectedWorkflow, bool]:
    """Detect a repeated workflow, reporting whether demo data was used.

    Returns ``(workflow, used_demo_data)`` where ``used_demo_data`` is True
    when demo mode was requested OR the live extraction fell back to bundled
    demo data (only when no live inbox is configured).
    """
    active_settings = settings or get_settings()
    live = _live_inbox_configured(active_settings)

    if demo_mode:
        logger.info("extract_workflow running in explicit demo mode")
        return load_demo_workflow(), True

    if not email_threads:
        if live:
            msg = (
                "Sloth read your inbox but found no recent messages to analyse."
            )
            return build_no_automation_workflow(msg), False
        logger.warning("extract_workflow falling back to demo data: no threads")
        return load_demo_workflow(), True

    if not active_settings.cursor_configured:
        if live:
            return build_no_automation_workflow(
                "Cursor AI is not configured — cannot analyse your inbox."
            ), False
        logger.warning("extract_workflow falling back to demo data: no Cursor API key")
        return load_demo_workflow(), True

    try:
        payload = complete_json_prompt(
            system_prompt=SYSTEM_PROMPT,
            user_payload={"email_threads": email_threads},
            settings=active_settings,
        )
        workflow = _normalize_workflow(
            _apply_rule_based_proposal(DetectedWorkflow.model_validate(payload))
        )
        return workflow, False
    except Exception as exc:  # noqa: BLE001 - any failure -> safe fallback
        logger.warning("extract_workflow failed: %s", exc)
        if live:
            return build_no_automation_workflow(
                f"Inbox analysis failed: {exc}"
            ), False
        return load_demo_workflow(), True


def extract_workflow(
    email_threads: list[dict],
    *,
    demo_mode: bool = False,
    settings: Settings | None = None,
) -> DetectedWorkflow:
    """Detect a repeated workflow from raw email thread dicts."""
    workflow, _ = extract_workflow_with_meta(
        email_threads, demo_mode=demo_mode, settings=settings
    )
    return workflow
