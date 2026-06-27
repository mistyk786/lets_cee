"""Rule-based workflow detection from live email threads (no LLM required)."""

from __future__ import annotations

from collections import Counter

from app.schemas import AutomationRule, Bottleneck, DetectedWorkflow, WorkflowStep
from app.services.automation_service import generate_automation_proposal
from app.services.scoring_service import calculate_opportunity_score


def _normalise_subject(subject: str) -> str:
    s = subject.strip()
    while True:
        lowered = s.lower()
        if lowered.startswith("re:") or lowered.startswith("fwd:"):
            s = s.split(":", 1)[1].strip()
            continue
        return s or "Inbox coordination"


def _thread_subject(thread: dict) -> str:
    return str(thread.get("subject") or thread.get("Subject") or "").strip()


def extract_workflow_heuristic(email_threads: list[dict]) -> DetectedWorkflow:
    """Build a DetectedWorkflow directly from real inbox threads."""
    if not email_threads:
        raise ValueError("No email threads to analyse")

    subjects = [_thread_subject(t) for t in email_threads if _thread_subject(t)]
    if not subjects:
        subjects = ["Inbox coordination"]

    normalised = [_normalise_subject(s) for s in subjects]
    theme, theme_count = Counter(normalised).most_common(1)[0]
    occurrence_count = max(theme_count, len(email_threads))

    workflow_name = theme[:72] if len(theme) > 8 else f"{theme} coordination"

    steps = [
        WorkflowStep(
            step_id="step_1",
            name="Triage incoming email",
            description="Read and classify new messages matching this pattern.",
            is_manual=True,
            avg_minutes=2.0,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_2",
            name="Extract intent and details",
            description="Pull dates, attendees, and action items from the thread.",
            is_manual=True,
            avg_minutes=2.5,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_3",
            name="Check calendar / availability",
            description="Cross-reference schedules before proposing times.",
            is_manual=True,
            avg_minutes=3.5,
            is_automatable=True,
            requires_approval=False,
        ),
        WorkflowStep(
            step_id="step_4",
            name="Draft reply or next action",
            description="Compose a response or registration follow-up.",
            is_manual=True,
            avg_minutes=3.0,
            is_automatable=True,
            requires_approval=True,
        ),
        WorkflowStep(
            step_id="step_5",
            name="Confirm and log outcome",
            description="Send the reply and record the result.",
            is_manual=True,
            avg_minutes=2.0,
            is_automatable=True,
            requires_approval=True,
        ),
    ]

    bottlenecks = [
        Bottleneck(
            step_id="step_3",
            reason="Manual calendar checks add delay between messages.",
            severity="high",
        ),
        Bottleneck(
            step_id="step_4",
            reason="Drafting replies is repetitive across similar threads.",
            severity="medium",
        ),
    ]

    repetition = min(occurrence_count / 20.0, 1.0)
    score = calculate_opportunity_score(
        repetition=repetition,
        manual_effort=0.75,
        consistency=0.7,
        data_availability=min(len(subjects) / 10.0, 1.0),
        risk=0.25,
    )

    unique_subjects = list(dict.fromkeys(subjects))[:5]
    assumptions = [
        f"Detected {occurrence_count} related message(s) in your live inbox.",
        f"Most common theme: “{theme}”.",
        *[f"Example: “{s[:96]}{'…' if len(s) > 96 else ''}”" for s in unique_subjects],
    ]

    workflow = DetectedWorkflow(
        workflow_name=workflow_name,
        occurrence_count=occurrence_count,
        current_steps=steps,
        bottlenecks=bottlenecks,
        opportunity_score=round(score, 1),
        automation_proposal=[],
        assumptions=assumptions[:6],
        automation_rules=AutomationRule(
            internal_contacts_only=True,
            meeting_duration_minutes=30,
            working_hours_start="09:00",
            working_hours_end="18:00",
            approval_required=True,
            max_slots_proposed=3,
        ),
    )
    return workflow.model_copy(
        update={"automation_proposal": generate_automation_proposal(workflow)}
    )
