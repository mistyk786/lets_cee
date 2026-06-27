"""Hardcoded, realistic demo data for Sloth.ai.

Used as a fallback when:
  - The LLM call fails or times out.
  - Member 3's data endpoint is unavailable.
  - Demo mode is explicitly requested.

Values model a realistic email-to-calendar scheduling workflow so the demo
always has something convincing to show.

Forecast and effectiveness metrics are derived from the scoring functions so
they cannot drift. ``opportunity_score`` stays at the spec value (78.5).
"""

from __future__ import annotations

from app.schemas import (
    AutomationRule,
    Bottleneck,
    DetectedWorkflow,
    EffectivenessMetrics,
    ForecastMetrics,
    WorkflowStep,
)
from app.services.automation_service import generate_automation_proposal
from app.services.scoring_service import calculate_effectiveness, calculate_forecast

# Spec-required constants — do not derive these.
_DEMO_OCCURRENCE_COUNT = 47
_DEMO_OPPORTUNITY_SCORE = 78.5
_DEMO_FORECAST_INPUTS = {
    "eligible_runs": 40,
    "manual_minutes_per_run": 18.0,
    "review_minutes_per_run": 3.0,
    "exception_minutes": 12.0,
}
_DEMO_EFFECTIVENESS_INPUTS = {
    "realised_time_ratio": 0.8,
    "coverage_ratio": 0.8,
    "reliability_ratio": 0.75,
    "rework_ratio": 0.8,
    "cycle_time_ratio": 0.5,
    "acceptance_ratio": 0.4,
    "has_major_error": False,
}


def _demo_steps() -> list[WorkflowStep]:
    """Seven-step email-to-calendar scheduling workflow."""
    return [
        WorkflowStep(
            step_id="step_1",
            name="Read incoming meeting request",
            description="Triage inbound email asking to schedule a meeting.",
            is_manual=True,
            avg_minutes=2.0,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_2",
            name="Identify attendees and intent",
            description="Parse who needs to attend and the meeting purpose.",
            is_manual=True,
            avg_minutes=2.5,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_3",
            name="Check calendar availability",
            description="Cross-reference free/busy times across attendees.",
            is_manual=True,
            avg_minutes=4.0,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_4",
            name="Draft proposed time slots",
            description="Compose 3 candidate slots within working hours.",
            is_manual=True,
            avg_minutes=3.0,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_5",
            name="Confirm time with manager",
            description="Get sign-off before committing external-facing slots.",
            is_manual=True,
            avg_minutes=2.0,
            is_automatable=True,
            requires_approval=True,
        ),
        WorkflowStep(
            step_id="step_6",
            name="Send calendar invite",
            description="Create the event and dispatch invites to attendees.",
            is_manual=True,
            avg_minutes=2.5,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_7",
            name="Handle reschedule replies",
            description="Negotiate conflicts and re-send updated invites.",
            is_manual=True,
            avg_minutes=2.0,
            is_automatable=False,
            requires_approval=False,
        ),
    ]


def _demo_bottlenecks() -> list[Bottleneck]:
    return [
        Bottleneck(
            step_id="step_3",
            reason="Manual cross-referencing of multiple calendars is slow "
            "and error-prone.",
            severity="high",
        ),
        Bottleneck(
            step_id="step_5",
            reason="Waiting on manager approval introduces variable delay.",
            severity="medium",
        ),
        Bottleneck(
            step_id="step_7",
            reason="Reschedule loops require back-and-forth email handling.",
            severity="medium",
        ),
    ]


def _demo_automation_rules() -> AutomationRule:
    return AutomationRule(
        internal_contacts_only=True,
        meeting_duration_minutes=30,
        working_hours_start="09:00",
        working_hours_end="18:00",
        approval_required=True,
        max_slots_proposed=3,
    )


def _build_demo_workflow_shell() -> DetectedWorkflow:
    """Build the workflow without a proposal (proposal added after)."""
    return DetectedWorkflow(
        workflow_name="Email-to-Calendar Meeting Scheduling",
        occurrence_count=_DEMO_OCCURRENCE_COUNT,
        current_steps=_demo_steps(),
        bottlenecks=_demo_bottlenecks(),
        opportunity_score=_DEMO_OPPORTUNITY_SCORE,
        automation_proposal=[],
        assumptions=[
            "Meetings default to 30 minutes unless stated otherwise.",
            "Scheduling stays within 09:00-18:00 working hours.",
            "External-facing slots require manager approval.",
            "Attendee calendars expose free/busy availability.",
        ],
        automation_rules=_demo_automation_rules(),
        automation_available=True,
        workflow_category="scheduling",
        automation_summary=(
            "Repeated meeting-scheduling from email can be partially automated: "
            "propose times, draft replies, and hold tentative calendar slots."
        ),
        automatable_actions=[
            "Draft reply with proposed meeting times",
            "Hold a tentative calendar slot",
            "Summarise scheduling thread for review",
        ],
    )


def build_no_automation_workflow(
    summary: str,
    *,
    email_count: int = 0,
) -> DetectedWorkflow:
    """Honest empty analysis when live inbox has nothing worth automating."""
    detail = summary
    if email_count:
        detail = f"{summary} (reviewed {email_count} recent messages)."
    return DetectedWorkflow(
        workflow_name="No repeatable workflow detected",
        occurrence_count=0,
        current_steps=[],
        bottlenecks=[],
        opportunity_score=0.0,
        automation_proposal=[],
        assumptions=[detail],
        automation_rules=_demo_automation_rules(),
        automation_available=False,
        workflow_category="none",
        automation_summary=detail,
        automatable_actions=[],
    )


def load_demo_workflow() -> DetectedWorkflow:
    """Return a realistic detected scheduling workflow for demos/fallback."""
    workflow = _build_demo_workflow_shell()
    return workflow.model_copy(
        update={
            "automation_proposal": generate_automation_proposal(workflow),
        }
    )


def load_demo_forecast() -> ForecastMetrics:
    """Return a realistic time-saved forecast for demos/fallback."""
    return calculate_forecast(**_DEMO_FORECAST_INPUTS)


def load_demo_effectiveness() -> EffectivenessMetrics:
    """Return a realistic effectiveness breakdown (~74, status ok)."""
    return calculate_effectiveness(**_DEMO_EFFECTIVENESS_INPUTS)
