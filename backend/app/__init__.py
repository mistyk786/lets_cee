"""Sloth.ai scoring engine — public package exports."""

from __future__ import annotations

from app.constants import __version__
from app.engine import SlothEngine
from app.schemas import (
    AnalysisResult,
    AutomationRule,
    Bottleneck,
    DetectedWorkflow,
    EffectivenessInputs,
    EffectivenessMetrics,
    ForecastInputs,
    ForecastMetrics,
    HealthStatus,
    OpportunityInputs,
    WorkflowStep,
)

__all__ = [
    "SlothEngine",
    "__version__",
    "AnalysisResult",
    "AutomationRule",
    "Bottleneck",
    "DetectedWorkflow",
    "EffectivenessInputs",
    "EffectivenessMetrics",
    "ForecastInputs",
    "ForecastMetrics",
    "HealthStatus",
    "OpportunityInputs",
    "WorkflowStep",
]
