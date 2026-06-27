"""On-disk demo fallback for the analysis endpoints.

Member 2's engine already falls back to demo data when the LLM is unavailable.
This is the outer safety net: if *any* call raises (engine import error, bad
data, etc.) the endpoints return pre-generated JSON from ``data/cache`` so the
demo never 500s.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Callable, TypeVar

from app.schemas import (
    DetectedWorkflow,
    EffectivenessMetrics,
    ForecastMetrics,
    WorkflowStep,
)

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "cache"

T = TypeVar("T")


def cached_call(primary: Callable[[], T], *, fallback: Callable[[], T]) -> T:
    """Run ``primary``; on any failure log and return ``fallback()``."""
    try:
        return primary()
    except Exception as exc:  # noqa: BLE001 - any failure -> safe demo fallback
        logger.warning("Falling back to cached demo data: %s", exc)
        return fallback()


def _read(filename: str) -> str:
    with open(CACHE_DIR / filename, encoding="utf-8") as f:
        return f.read()


def load_cached_workflow() -> DetectedWorkflow:
    return DetectedWorkflow.model_validate_json(_read("workflow.json"))


def load_cached_automation() -> list[WorkflowStep]:
    return [WorkflowStep(**step) for step in json.loads(_read("automation.json"))]


def load_cached_forecast() -> ForecastMetrics:
    return ForecastMetrics.model_validate_json(_read("forecast.json"))


def load_cached_effectiveness() -> EffectivenessMetrics:
    return EffectivenessMetrics.model_validate_json(_read("effectiveness.json"))
