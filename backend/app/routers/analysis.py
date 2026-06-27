from fastapi import APIRouter
from pydantic import BaseModel

from app.schemas import (
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


class GenerateAutomationRequest(BaseModel):
    workflow: DetectedWorkflow | None = None


@router.post("/api/analyse-workflow", response_model=DetectedWorkflow)
def analyse_workflow(
    request: AnalyseWorkflowRequest | None = None,
) -> DetectedWorkflow:
    request = request or AnalyseWorkflowRequest()
    return analysis_service.analyse_workflow(
        request.email_threads, request.demo_mode
    )


@router.post("/api/generate-automation", response_model=list[WorkflowStep])
def generate_automation(
    request: GenerateAutomationRequest | None = None,
) -> list[WorkflowStep]:
    request = request or GenerateAutomationRequest()
    return analysis_service.generate_automation(request.workflow)


@router.post("/api/forecast", response_model=ForecastMetrics)
def forecast(inputs: ForecastInputs) -> ForecastMetrics:
    return analysis_service.forecast(inputs)


@router.get("/api/effectiveness", response_model=EffectivenessMetrics)
def effectiveness() -> EffectivenessMetrics:
    return analysis_service.effectiveness()
