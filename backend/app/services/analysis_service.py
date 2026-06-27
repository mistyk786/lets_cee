"""Service layer wiring the HTTP endpoints to Member 2's SlothEngine."""

from __future__ import annotations

import logging

from app.config import Settings, get_settings
from app.engine import SlothEngine
from app.schemas import (
    DetectedWorkflow,
    EffectivenessMetrics,
    ForecastInputs,
    ForecastMetrics,
    WorkflowStep,
)
from app.services import ingestion_service
from app.services.demo_data import load_demo_effectiveness, load_demo_workflow
from app.services.fallback import (
    cached_call,
    load_cached_automation,
    load_cached_effectiveness,
    load_cached_forecast,
    load_cached_workflow,
)
from app.services.imap_service import imap_configured
from app.services.workflow_service import extract_workflow_with_meta

logger = logging.getLogger(__name__)

_engine = SlothEngine()


def _resolve_threads(
    email_threads: list[dict] | None,
    *,
    prefer_live: bool,
    settings: Settings | None = None,
) -> tuple[list[dict], str]:
    """Return (threads, data_source). Uses live IMAP when configured."""
    active = settings or get_settings()

    if email_threads is not None:
        return email_threads, "upload"

    if prefer_live and imap_configured(active):
        threads, source = ingestion_service.get_email_threads(
            prefer_live=True, settings=active
        )
        return threads, source

    if imap_configured(active):
        threads, source = ingestion_service.get_email_threads(
            prefer_live=True, settings=active
        )
        return threads, source

    threads, source = ingestion_service.get_email_threads(
        prefer_live=False, settings=active
    )
    return threads, source


def analyse_workflow(
    email_threads: list[dict] | None = None,
    demo_mode: bool = False,
    *,
    prefer_live: bool = True,
    settings: Settings | None = None,
) -> DetectedWorkflow:
    """Detect a repeated workflow from live inbox or explicit threads."""
    active = settings or get_settings()
    live_only = imap_configured(active) and not demo_mode

    def _run() -> DetectedWorkflow:
        if demo_mode and not live_only:
            return load_demo_workflow()

        threads, source = _resolve_threads(
            email_threads, prefer_live=prefer_live, settings=active
        )
        logger.info("analyse_workflow using data_source=%s threads=%d", source, len(threads))

        workflow, used_demo = extract_workflow_with_meta(
            threads, demo_mode=False, settings=active
        )
        if live_only and used_demo:
            raise RuntimeError(
                "Live analysis failed — could not extract a workflow from your "
                "inbox. Load the inbox summary on Setup first, then try again."
            )
        return workflow

    if live_only:
        return _run()

    return cached_call(_run, fallback=load_cached_workflow)


def generate_automation(
    workflow: DetectedWorkflow | None = None,
) -> list[WorkflowStep]:
    """Build the future-state automation proposal for a detected workflow."""

    def _run() -> list[WorkflowStep]:
        target = workflow if workflow is not None else analyse_workflow()
        return _engine.propose_automation(target)

    active = get_settings()
    if imap_configured(active):
        return _run()
    return cached_call(_run, fallback=load_cached_automation)


def forecast(inputs: ForecastInputs) -> ForecastMetrics:
    """Forecast conservative/likely/optimistic hours saved."""
    if imap_configured():
        return _engine.forecast(inputs)
    return cached_call(
        lambda: _engine.forecast(inputs), fallback=load_cached_forecast
    )


def effectiveness() -> EffectivenessMetrics:
    """Return post-automation effectiveness (zeros until real runs exist)."""
    active = get_settings()
    if imap_configured(active):
        return EffectivenessMetrics(
            realised_time_score=0,
            coverage_score=0,
            reliability_score=0,
            quality_score=0,
            cycle_time_score=0,
            acceptance_score=0,
            safety_status="ok",
            overall_score=0,
            recommendation="Activate an automation to start measuring impact.",
        )
    return cached_call(
        load_demo_effectiveness, fallback=load_cached_effectiveness
    )
