"""Rule-based automation proposal generation for Sloth.ai.

Turns a detected current-state workflow into a proposed future-state workflow.
No LLM needed for the MVP — deterministic rules are enough and map directly to
the editable future-state diagram in Member 1's UI.
"""

from __future__ import annotations

from app.schemas import DetectedWorkflow, WorkflowStep

_APPROVAL_PREFIX = "[Approval] "


def generate_automation_proposal(workflow: DetectedWorkflow) -> list[WorkflowStep]:
    """Build the proposed future-state steps from the current workflow.

    Rules applied per step:
      - automatable & no approval  -> kept as an automated step (is_manual=False).
      - automatable & needs approval -> kept as a human checkpoint
        (is_manual=True, name prefixed with "[Approval] ").
      - not automatable -> kept as a manual handoff with an explanatory note.
    """
    proposal: list[WorkflowStep] = []

    for step in workflow.current_steps:
        if step.is_automatable and not step.requires_approval:
            proposal.append(
                step.model_copy(update={"is_manual": False})
            )
        elif step.is_automatable and step.requires_approval:
            name = step.name
            if not name.startswith(_APPROVAL_PREFIX):
                name = f"{_APPROVAL_PREFIX}{name}"
            proposal.append(
                step.model_copy(
                    update={"is_manual": True, "name": name}
                )
            )
        else:
            note = " (Manual handoff: not automatable — requires a human.)"
            description = step.description
            if note.strip() not in description:
                description = f"{description}{note}"
            proposal.append(
                step.model_copy(
                    update={"is_manual": True, "description": description}
                )
            )

    return proposal
