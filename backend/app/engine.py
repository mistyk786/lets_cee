"""Public engine facade for Sloth.ai.

This is the integration surface Member 3 should import. It orchestrates
workflow detection, automation proposals, and scoring without exposing
internal service details.
"""

from __future__ import annotations

import logging

from app.config import Settings, get_settings
from app.constants import __version__
from app.schemas import (
    AnalysisResult,
    DetectedWorkflow,
    EffectivenessInputs,
    EffectivenessMetrics,
    ForecastInputs,
    ForecastMetrics,
    HealthStatus,
    OpportunityInputs,
    WorkflowStep,
)
from app.services.automation_service import generate_automation_proposal
from app.services.demo_data import (
    load_demo_effectiveness,
    load_demo_forecast,
    load_demo_workflow,
)
from app.services.scoring_service import (
    forecast_time_saved as compute_forecast,
    score_effectiveness as compute_effectiveness,
    score_opportunity as compute_opportunity,
)
from app.services.workflow_service import (
    extract_workflow,
    extract_workflow_with_meta,
)

logger = logging.getLogger(__name__)


class SlothEngine:
    """Production entry point for the Sloth.ai AI/scoring engine."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def health(self) -> HealthStatus:
        """Report readiness for deployment probes and upstream services."""
        if self.settings.openai_configured:
            status = "ok"
            message = "OpenAI configured. Live workflow extraction available."
        else:
            status = "degraded"
            message = (
                "OpenAI not configured. Engine will use demo fallback data."
            )

        return HealthStatus(
            status=status,
            version=__version__,
            environment=self.settings.environment,
            openai_configured=self.settings.openai_configured,
            demo_available=True,
            message=message,
        )

    def detect_workflow(
        self,
        email_threads: list[dict],
        *,
        demo_mode: bool = False,
    ) -> DetectedWorkflow:
        """Detect a repeated workflow from raw email thread dicts."""
        return extract_workflow(
            email_threads,
            demo_mode=demo_mode,
            settings=self.settings,
        )

    def propose_automation(self, workflow: DetectedWorkflow) -> list[WorkflowStep]:
        """Build a rule-based automation proposal from a detected workflow."""
        return generate_automation_proposal(workflow)

    def score_opportunity(self, inputs: OpportunityInputs) -> float:
        """Score automation opportunity on a 0-100 scale."""
        return compute_opportunity(inputs)

    def forecast(self, inputs: ForecastInputs) -> ForecastMetrics:
        """Forecast conservative/likely/optimistic hours saved."""
        return compute_forecast(inputs)

    def score_effectiveness(
        self, inputs: EffectivenessInputs
    ) -> EffectivenessMetrics:
        """Compute post-automation effectiveness metrics."""
        return compute_effectiveness(inputs)

    @staticmethod
    def estimate_forecast_inputs(
        workflow: DetectedWorkflow,
        *,
        review_minutes_per_run: float = 3.0,
        exception_minutes: float = 12.0,
        eligible_runs: int | None = None,
    ) -> ForecastInputs:
        """Derive forecast inputs from a detected workflow's step timings."""
        manual_minutes = sum(step.avg_minutes for step in workflow.current_steps)
        runs = (
            eligible_runs
            if eligible_runs is not None
            else workflow.occurrence_count
        )
        return ForecastInputs(
            eligible_runs=runs,
            manual_minutes_per_run=manual_minutes,
            review_minutes_per_run=review_minutes_per_run,
            exception_minutes=exception_minutes,
        )

    def analyze(
        self,
        email_threads: list[dict],
        *,
        demo_mode: bool = False,
        forecast: ForecastInputs | None = None,
        effectiveness: EffectivenessInputs | None = None,
        auto_forecast: bool = False,
    ) -> AnalysisResult:
        """Run the full Member 2 analysis pipeline and return a single payload.

        If ``auto_forecast`` is True and no forecast inputs are supplied, the
        engine derives them from the detected workflow step timings.

        ``demo_mode`` in the result is True whenever demo data was returned —
        either because it was explicitly requested or because live extraction
        failed and fell back to demo data.
        """
        workflow, used_demo = extract_workflow_with_meta(
            email_threads,
            demo_mode=demo_mode,
            settings=self.settings,
        )

        forecast_metrics = None
        if forecast is not None:
            forecast_metrics = self.forecast(forecast)
        elif auto_forecast:
            forecast_metrics = self.forecast(
                self.estimate_forecast_inputs(workflow)
            )

        effectiveness_metrics = None
        if effectiveness is not None:
            effectiveness_metrics = self.score_effectiveness(effectiveness)

        return AnalysisResult(
            workflow=workflow,
            forecast=forecast_metrics,
            effectiveness=effectiveness_metrics,
            demo_mode=used_demo,
            engine_version=__version__,
        )

    def demo_analysis(self) -> AnalysisResult:
        """Return a complete demo analysis without calling external services."""
        workflow = load_demo_workflow()
        return AnalysisResult(
            workflow=workflow,
            forecast=load_demo_forecast(),
            effectiveness=load_demo_effectiveness(),
            demo_mode=True,
            engine_version=__version__,
        )
