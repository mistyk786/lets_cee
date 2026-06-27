"""Shared JSON schemas for Sloth.ai.

These Pydantic v2 models are the data contracts shared between the AI/scoring
engine (this module's owner), the frontend (Member 1), and the backend data
layer (Member 3).

Do not change field names after publishing without telling the team.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class OpportunityInputs(BaseModel):
    """Normalised 0-1 signals for opportunity scoring."""

    repetition: float = Field(ge=0, le=1)
    manual_effort: float = Field(ge=0, le=1)
    consistency: float = Field(ge=0, le=1)
    data_availability: float = Field(ge=0, le=1)
    risk: float = Field(ge=0, le=1)


class ForecastInputs(BaseModel):
    """Inputs for time-saved forecasting."""

    eligible_runs: int = Field(ge=0)
    manual_minutes_per_run: float = Field(ge=0)
    review_minutes_per_run: float = Field(ge=0)
    exception_minutes: float = Field(ge=0)


class EffectivenessInputs(BaseModel):
    """Inputs for post-automation effectiveness scoring."""

    realised_time_ratio: float = Field(ge=0, le=1)
    coverage_ratio: float = Field(ge=0, le=1)
    reliability_ratio: float = Field(ge=0, le=1)
    rework_ratio: float = Field(ge=0, le=1)
    cycle_time_ratio: float = Field(ge=0, le=1)
    acceptance_ratio: float = Field(ge=0, le=1)
    has_major_error: bool = False


class HealthStatus(BaseModel):
    """Health/readiness report for deployment probes and Member 3 integration."""

    status: Literal["ok", "degraded"]
    version: str
    environment: str
    openai_configured: bool
    demo_available: bool = True
    message: str


class WorkflowStep(BaseModel):
    """A single step in a detected or proposed workflow."""

    step_id: str
    name: str
    description: str
    is_manual: bool
    avg_minutes: float
    is_automatable: bool
    requires_approval: bool


class Bottleneck(BaseModel):
    """A friction point identified within a workflow step."""

    step_id: str
    reason: str
    severity: Literal["low", "medium", "high"]


class AutomationRule(BaseModel):
    """Configuration constraints for the proposed automation."""

    internal_contacts_only: bool
    meeting_duration_minutes: int
    working_hours_start: str  # "09:00"
    working_hours_end: str  # "18:00"
    approval_required: bool
    max_slots_proposed: int


class DetectedWorkflow(BaseModel):
    """A repeated workflow detected from email + calendar activity."""

    workflow_name: str
    occurrence_count: int
    current_steps: list[WorkflowStep]
    bottlenecks: list[Bottleneck]
    opportunity_score: float = Field(ge=0, le=100)
    automation_proposal: list[WorkflowStep]
    assumptions: list[str]
    automation_rules: AutomationRule


class ForecastMetrics(BaseModel):
    """Forecasted time saved by automating a workflow."""

    eligible_runs: int
    manual_minutes_per_run: float
    review_minutes_per_run: float
    exception_minutes: float
    conservative_hours_saved: float
    likely_hours_saved: float
    optimistic_hours_saved: float


class EffectivenessMetrics(BaseModel):
    """Post-automation effectiveness scoring breakdown."""

    realised_time_score: float = Field(ge=0, le=30)
    coverage_score: float = Field(ge=0, le=20)
    reliability_score: float = Field(ge=0, le=20)
    quality_score: float = Field(ge=0, le=15)
    cycle_time_score: float = Field(ge=0, le=10)
    acceptance_score: float = Field(ge=0, le=5)
    safety_status: Literal["ok", "needs_review"]
    overall_score: float = Field(ge=0, le=100)
    recommendation: str


class AnalysisResult(BaseModel):
    """Complete analysis payload returned by the public engine API."""

    workflow: DetectedWorkflow
    forecast: ForecastMetrics | None = None
    effectiveness: EffectivenessMetrics | None = None
    demo_mode: bool
    engine_version: str
