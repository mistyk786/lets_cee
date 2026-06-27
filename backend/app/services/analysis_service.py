"""Service layer wiring the HTTP endpoints to Member 2's SlothEngine.

Keeps routers thin: each function delegates to the engine facade and uses
Member 3's demo dataset (loaded + normalised) when no input is supplied.
"""

from __future__ import annotations

from app.engine import SlothEngine
from app.schemas import (
    AutomationRule,
    DetectedWorkflow,
    EffectivenessMetrics,
    ForecastInputs,
    ForecastMetrics,
    WorkflowStep,
)
from app.services.demo_data import load_demo_effectiveness, load_demo_workflow
from app.services import ingestion_service
from app.services.fallback import (
    cached_call,
    load_cached_automation,
    load_cached_effectiveness,
    load_cached_forecast,
    load_cached_workflow,
)

_engine = SlothEngine()


def _demo_threads() -> list[dict]:
    threads, _source = ingestion_service.get_email_threads(prefer_live=True)
    return threads


def analyse_workflow_with_meta(
    email_threads: list[dict] | None = None,
    demo_mode: bool = False,
) -> tuple[DetectedWorkflow, bool]:
    """Detect workflow and report whether demo/fallback data was used."""
    threads = email_threads if email_threads is not None else _demo_threads()
    return _engine.detect_workflow_with_meta(threads, demo_mode=demo_mode)


def analyse_workflow(
    email_threads: list[dict] | None = None,
    demo_mode: bool = False,
) -> DetectedWorkflow:
    """Detect a repeated workflow, defaulting to configured inbox sources."""

    def _run() -> DetectedWorkflow:
        threads = email_threads if email_threads is not None else _demo_threads()
        return _engine.detect_workflow(threads, demo_mode=demo_mode)

    return cached_call(_run, fallback=load_cached_workflow)


def generate_automation(
    workflow: DetectedWorkflow | None = None,
) -> list[WorkflowStep]:
    """Build the future-state automation proposal for a detected workflow."""

    def _run() -> list[WorkflowStep]:
        target = workflow if workflow is not None else load_demo_workflow()
        return _engine.propose_automation(target)

    return cached_call(_run, fallback=load_cached_automation)


def forecast(inputs: ForecastInputs) -> ForecastMetrics:
    """Forecast conservative/likely/optimistic hours saved."""
    return cached_call(
        lambda: _engine.forecast(inputs), fallback=load_cached_forecast
    )


def forecast_from_request(
    *,
    rules: AutomationRule | None = None,
    occurrence_count: int | None = None,
    workflow: DetectedWorkflow | None = None,
    review_minutes_per_run: float | None = None,
    exception_minutes: float = 12.0,
) -> ForecastMetrics:
    """Accept frontend-shaped bodies and derive ``ForecastInputs`` via SlothEngine."""
    target = workflow if workflow is not None else load_demo_workflow()
    review = review_minutes_per_run
    if review is None and rules is not None:
        review = 3.0 if rules.approval_required else 1.5

    inputs = SlothEngine.estimate_forecast_inputs(
        target,
        review_minutes_per_run=review if review is not None else 3.0,
        exception_minutes=exception_minutes,
        eligible_runs=occurrence_count,
    )
    return forecast(inputs)


def effectiveness() -> EffectivenessMetrics:
    """Return the seeded post-automation effectiveness breakdown."""
    return cached_call(
        load_demo_effectiveness, fallback=load_cached_effectiveness
    )
