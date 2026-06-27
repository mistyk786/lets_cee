"""Hardcoded, realistic demo data for Sloth.ai.

Used as a fallback when:
  - The LLM call fails or times out.
  - Member 3's data endpoint is unavailable.
  - Demo mode is explicitly requested.

Values model a realistic email-to-calendar scheduling workflow so the demo
always has something convincing to show.
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


def _demo_automation_proposal() -> list[WorkflowStep]:
    """Future-state proposal derived from the demo steps.

    Built statically here to keep demo mode self-contained; the live path
    uses ``automation_service.generate_automation_proposal``.
    """
    return [
        WorkflowStep(
            step_id="step_1",
            name="Read incoming meeting request",
            description="Auto-detect scheduling intent from inbound email.",
            is_manual=False,
            avg_minutes=2.0,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_2",
            name="Identify attendees and intent",
            description="Extract attendees and purpose via NLP.",
            is_manual=False,
            avg_minutes=2.5,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_3",
            name="Check calendar availability",
            description="Query free/busy across attendees automatically.",
            is_manual=False,
            avg_minutes=4.0,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_4",
            name="Draft proposed time slots",
            description="Generate candidate slots within working hours.",
            is_manual=False,
            avg_minutes=3.0,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_5",
            name="[Approval] Confirm time with manager",
            description="Human checkpoint: approve slots before sending.",
            is_manual=True,
            avg_minutes=2.0,
            is_automatable=True,
            requires_approval=True,
        ),
        WorkflowStep(
            step_id="step_6",
            name="Send calendar invite",
            description="Create the event and dispatch invites automatically.",
            is_manual=False,
            avg_minutes=2.5,
            is_automatable=True,
            requires_approval=False,
        ),
    ]


def load_demo_workflow() -> DetectedWorkflow:
    """Return a realistic detected scheduling workflow for demos/fallback."""
    return DetectedWorkflow(
        workflow_name="Email-to-Calendar Meeting Scheduling",
        occurrence_count=47,
        current_steps=_demo_steps(),
        bottlenecks=_demo_bottlenecks(),
        opportunity_score=78.5,
        automation_proposal=_demo_automation_proposal(),
        assumptions=[
            "Meetings default to 30 minutes unless stated otherwise.",
            "Scheduling stays within 09:00-18:00 working hours.",
            "External-facing slots require manager approval.",
            "Attendee calendars expose free/busy availability.",
        ],
        automation_rules=_demo_automation_rules(),
    )


def load_demo_forecast() -> ForecastMetrics:
    """Return a realistic time-saved forecast for demos/fallback."""
    return ForecastMetrics(
        eligible_runs=40,
        manual_minutes_per_run=18.0,
        review_minutes_per_run=3.0,
        exception_minutes=12.0,
        conservative_hours_saved=6.86,
        likely_hours_saved=9.80,
        optimistic_hours_saved=11.76,
    )


def load_demo_effectiveness() -> EffectivenessMetrics:
    """Return a realistic effectiveness breakdown (~74, status ok)."""
    return EffectivenessMetrics(
        realised_time_score=24.0,
        coverage_score=16.0,
        reliability_score=15.0,
        quality_score=12.0,
        cycle_time_score=5.0,
        acceptance_score=2.0,
        safety_status="ok",
        overall_score=74.0,
        recommendation="Good performance. Monitor exception rate.",
    )
