from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.schemas import (
    AutomationRule,
    DetectedWorkflow,
    EffectivenessMetrics,
    ForecastInputs,
    ForecastMetrics,
    WorkflowStep,
)
from app.services import analysis_service

router = APIRouter()


class AnalyseWorkflowRequest(BaseModel):
    email_threads: list[dict] | None = None
    demo_mode: bool = False
    prefer_live: bool = True


class GenerateAutomationRequest(BaseModel):
    workflow: DetectedWorkflow | None = None


class ForecastRequest(BaseModel):
    """Accepts strict ForecastInputs or the frontend rules + count shape."""

    eligible_runs: int | None = None
    manual_minutes_per_run: float | None = None
    review_minutes_per_run: float | None = None
    exception_minutes: float | None = None
    rules: AutomationRule | None = None
    occurrence_count: int | None = None


@router.post("/api/analyse-workflow", response_model=DetectedWorkflow)
def analyse_workflow(
    request: AnalyseWorkflowRequest | None = None,
) -> DetectedWorkflow:
    request = request or AnalyseWorkflowRequest()
    try:
        return analysis_service.analyse_workflow(
            request.email_threads,
            request.demo_mode,
            prefer_live=request.prefer_live,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/api/generate-automation", response_model=list[WorkflowStep])
def generate_automation(
    request: GenerateAutomationRequest | None = None,
) -> list[WorkflowStep]:
    request = request or GenerateAutomationRequest()
    return analysis_service.generate_automation(request.workflow)


@router.post("/api/forecast", response_model=ForecastMetrics)
def forecast(request: ForecastRequest) -> ForecastMetrics:
    if (
        request.eligible_runs is not None
        and request.manual_minutes_per_run is not None
        and request.review_minutes_per_run is not None
        and request.exception_minutes is not None
    ):
        return analysis_service.forecast(
            ForecastInputs(
                eligible_runs=request.eligible_runs,
                manual_minutes_per_run=request.manual_minutes_per_run,
                review_minutes_per_run=request.review_minutes_per_run,
                exception_minutes=request.exception_minutes,
            )
        )

    workflow = analysis_service.analyse_workflow(prefer_live=True)
    manual = request.manual_minutes_per_run
    if manual is None:
        manual = sum(
            s.avg_minutes for s in workflow.current_steps if s.is_manual
        ) or 12.0

    return analysis_service.forecast(
        ForecastInputs(
            eligible_runs=request.occurrence_count
            or request.eligible_runs
            or workflow.occurrence_count,
            manual_minutes_per_run=manual,
            review_minutes_per_run=request.review_minutes_per_run or 3.0,
            exception_minutes=request.exception_minutes or 12.0,
        )
    )


@router.get("/api/effectiveness", response_model=EffectivenessMetrics)
def effectiveness() -> EffectivenessMetrics:
    return analysis_service.effectiveness()
