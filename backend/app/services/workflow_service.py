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
from app.services.pattern_service import (
    detect_email_patterns,
    enrich_workflow_summary,
)

logger = logging.getLogger(__name__)

# Re-exported for tests and backward compatibility.
MODEL = DEFAULT_CURSOR_MODEL

_MIN_AUTOMATION_SCORE = 45

SYSTEM_PROMPT = """\
You are a workflow analyst for Sloth.ai. You analyse real email threads to \
find SPECIFIC repeated manual work — not generic advice.

You will receive:
- email_threads: grouped conversations from the user's inbox (and sent mail)
- pattern_analysis: deterministic signals already found (subject clusters, \
  senders, categories). Treat these as ground truth counts.

Your job:
1. Pick the strongest repeated workflow backed by pattern_analysis evidence.
2. Quote real subjects, sender names, and counts in workflow_name, \
   automation_summary, assumptions, and detected_patterns.
3. Name the workflow specifically (e.g. "Fortnightly meet-up requests from \
   Mustafa" not "Meeting scheduling workflow").
4. List 3-8 concrete detected_patterns strings, each citing evidence like \
   "3 emails titled 'Hangout every second Tuesday' from Abizer".

Set automation_available to false when:
- Mostly one-off or promotional mail
- pattern_analysis shows no cluster with count >= 2
- opportunity_score would be below 45
- Automation would be unsafe without heavy human review

When automation_available is false, still explain what you DID find in \
automation_summary and detected_patterns (even weak patterns).

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
  "opportunity_score": float,
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
  "automatable_actions": [str, ...],
  "detected_patterns": [str, ...]
}

Every field is required. step_id values must be consistent between \
current_steps and bottlenecks. occurrence_count should align with the \
strongest pattern cluster count when possible.\
"""


def _apply_rule_based_proposal(workflow: DetectedWorkflow) -> DetectedWorkflow:
    return workflow.model_copy(
        update={"automation_proposal": generate_automation_proposal(workflow)}
    )


def _merge_local_patterns(
    workflow: DetectedWorkflow,
    pattern_analysis: dict,
) -> DetectedWorkflow:
    local_highlights = pattern_analysis.get("highlights") or []
    merged_patterns = list(workflow.detected_patterns)
    for item in local_highlights:
        if item not in merged_patterns:
            merged_patterns.append(item)

    summary = enrich_workflow_summary(workflow.automation_summary, pattern_analysis)
    assumptions = list(workflow.assumptions)
    for item in local_highlights[:3]:
        if item not in assumptions:
            assumptions.append(item)

    occurrence = workflow.occurrence_count
    estimated = int(pattern_analysis.get("estimated_occurrences") or 0)
    if estimated > occurrence:
        occurrence = estimated

    return workflow.model_copy(
        update={
            "detected_patterns": merged_patterns[:10],
            "automation_summary": summary,
            "assumptions": assumptions[:8],
            "occurrence_count": occurrence,
        }
    )


def _normalize_workflow(
    workflow: DetectedWorkflow,
    *,
    pattern_analysis: dict | None = None,
) -> DetectedWorkflow:
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
        cluster_count = int((pattern_analysis or {}).get("estimated_occurrences") or 0)
        if cluster_count < 2:
            available = False
            if not summary:
                summary = "Not enough repeated instances to justify automation."

    if not workflow.automatable_actions and not available:
        if not summary:
            summary = "No concrete automatable actions were identified."

    result = workflow.model_copy(
        update={
            "automation_available": available,
            "automation_summary": summary or workflow.automation_summary,
        }
    )
    if pattern_analysis:
        result = _merge_local_patterns(result, pattern_analysis)
    return result


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
        pattern_analysis = detect_email_patterns(email_threads=email_threads)
        payload = complete_json_prompt(
            system_prompt=SYSTEM_PROMPT,
            user_payload={
                "email_threads": email_threads,
                "pattern_analysis": pattern_analysis,
            },
            settings=active_settings,
        )
        workflow = _normalize_workflow(
            _apply_rule_based_proposal(DetectedWorkflow.model_validate(payload)),
            pattern_analysis=pattern_analysis,
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
