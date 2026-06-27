"""Unit tests for automation proposal generation."""

from __future__ import annotations

from app.schemas import AutomationRule, DetectedWorkflow, WorkflowStep
from app.services.automation_service import generate_automation_proposal
from app.services.demo_data import load_demo_workflow


def _minimal_workflow(steps: list[WorkflowStep]) -> DetectedWorkflow:
    return DetectedWorkflow(
        workflow_name="Test",
        occurrence_count=1,
        current_steps=steps,
        bottlenecks=[],
        opportunity_score=50.0,
        automation_proposal=[],
        assumptions=[],
        automation_rules=AutomationRule(
            internal_contacts_only=True,
            meeting_duration_minutes=30,
            working_hours_start="09:00",
            working_hours_end="18:00",
            approval_required=False,
            max_slots_proposed=3,
        ),
    )


def test_automatable_no_approval_becomes_automated():
    steps = [
        WorkflowStep(
            step_id="a",
            name="Check calendar",
            description="Find free slots.",
            is_manual=True,
            avg_minutes=4.0,
            is_automatable=True,
            requires_approval=False,
        )
    ]
    proposal = generate_automation_proposal(_minimal_workflow(steps))
    assert len(proposal) == 1
    assert proposal[0].is_manual is False


def test_automatable_with_approval_becomes_checkpoint():
    steps = [
        WorkflowStep(
            step_id="b",
            name="Confirm with manager",
            description="Get sign-off.",
            is_manual=True,
            avg_minutes=2.0,
            is_automatable=True,
            requires_approval=True,
        )
    ]
    proposal = generate_automation_proposal(_minimal_workflow(steps))
    assert len(proposal) == 1
    assert proposal[0].is_manual is True
    assert proposal[0].name == "[Approval] Confirm with manager"


def test_non_automatable_kept_as_manual_handoff():
    steps = [
        WorkflowStep(
            step_id="c",
            name="Handle reschedule replies",
            description="Negotiate conflicts.",
            is_manual=True,
            avg_minutes=2.0,
            is_automatable=False,
            requires_approval=False,
        )
    ]
    proposal = generate_automation_proposal(_minimal_workflow(steps))
    assert len(proposal) == 1
    assert proposal[0].is_manual is True
    assert "Manual handoff" in proposal[0].description


def test_demo_workflow_proposal_includes_all_seven_steps():
    workflow = load_demo_workflow()
    assert len(workflow.current_steps) == 7
    assert len(workflow.automation_proposal) == 7

    reschedule = workflow.automation_proposal[-1]
    assert reschedule.step_id == "step_7"
    assert reschedule.is_manual is True
    assert "Manual handoff" in reschedule.description

    approval = next(s for s in workflow.automation_proposal if s.step_id == "step_5")
    assert approval.name.startswith("[Approval] ")
    assert approval.is_manual is True
