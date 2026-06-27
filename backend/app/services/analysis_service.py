"""Service layer wiring the HTTP endpoints to Member 2's SlothEngine.

Keeps routers thin: each function delegates to the engine facade and uses
Member 3's demo dataset (loaded + normalised) when no input is supplied.
"""

from __future__ import annotations

from app.engine import SlothEngine
from app.schemas import (
    DetectedWorkflow,
    EffectivenessMetrics,
    ForecastInputs,
    ForecastMetrics,
    WorkflowStep,
)
from app.services.dataset_service import load_demo_emails
from app.services.demo_data import load_demo_effectiveness, load_demo_workflow
from app.services.email_normaliser import normalise_threads

_engine = SlothEngine()


def _demo_threads() -> list[dict]:
    raw = [email.model_dump() for email in load_demo_emails()]
    return normalise_threads(raw)


def analyse_workflow(
    email_threads: list[dict] | None = None,
    demo_mode: bool = False,
) -> DetectedWorkflow:
    """Detect a repeated workflow, defaulting to the bundled demo threads."""
    threads = email_threads if email_threads is not None else _demo_threads()
    return _engine.detect_workflow(threads, demo_mode=demo_mode)


def generate_automation(
    workflow: DetectedWorkflow | None = None,
) -> list[WorkflowStep]:
    """Build the future-state automation proposal for a detected workflow."""
    target = workflow if workflow is not None else load_demo_workflow()
    return _engine.propose_automation(target)


def forecast(inputs: ForecastInputs) -> ForecastMetrics:
    """Forecast conservative/likely/optimistic hours saved."""
    return _engine.forecast(inputs)


def effectiveness() -> EffectivenessMetrics:
    """Return the seeded post-automation effectiveness breakdown."""
    return load_demo_effectiveness()
