"""Pure scoring functions for Sloth.ai.

No LLM calls, no I/O. Every function here is deterministic and easy to unit
test. These power the opportunity ranking, time-saved forecast, and the
post-automation Effectiveness Score.
"""

from __future__ import annotations

from app.constants import (
    EFFECTIVENESS_SAFETY_CAP,
    EFFECTIVENESS_WEIGHT_ACCEPTANCE,
    EFFECTIVENESS_WEIGHT_COVERAGE,
    EFFECTIVENESS_WEIGHT_CYCLE_TIME,
    EFFECTIVENESS_WEIGHT_QUALITY,
    EFFECTIVENESS_WEIGHT_REALISED_TIME,
    EFFECTIVENESS_WEIGHT_RELIABILITY,
    FORECAST_CONSERVATIVE_FACTOR,
    FORECAST_OPTIMISTIC_FACTOR,
    OPPORTUNITY_WEIGHT_CONSISTENCY,
    OPPORTUNITY_WEIGHT_DATA_AVAILABILITY,
    OPPORTUNITY_WEIGHT_MANUAL_EFFORT,
    OPPORTUNITY_WEIGHT_REPETITION,
    OPPORTUNITY_WEIGHT_RISK,
)
from app.schemas import (
    EffectivenessInputs,
    EffectivenessMetrics,
    ForecastInputs,
    ForecastMetrics,
    OpportunityInputs,
)


def _clamp_unit(value: float) -> float:
    """Clamp a ratio-style input to the 0-1 range."""
    return max(0.0, min(1.0, value))


def calculate_opportunity_score(
    repetition: float,
    manual_effort: float,
    consistency: float,
    data_availability: float,
    risk: float,
) -> float:
    """Score how worthwhile automating a workflow is, on a 0-100 scale.

    All inputs are normalised 0-1 signals. Risk subtracts from the score.
    Out-of-range inputs are clamped before scoring.
    """
    repetition = _clamp_unit(repetition)
    manual_effort = _clamp_unit(manual_effort)
    consistency = _clamp_unit(consistency)
    data_availability = _clamp_unit(data_availability)
    risk = _clamp_unit(risk)

    score = (
        repetition * OPPORTUNITY_WEIGHT_REPETITION
        + manual_effort * OPPORTUNITY_WEIGHT_MANUAL_EFFORT
        + consistency * OPPORTUNITY_WEIGHT_CONSISTENCY
        + data_availability * OPPORTUNITY_WEIGHT_DATA_AVAILABILITY
        - risk * OPPORTUNITY_WEIGHT_RISK
    )
    return round(max(0, min(100, score)), 2)


def score_opportunity(inputs: OpportunityInputs) -> float:
    """Typed wrapper around ``calculate_opportunity_score``."""
    return calculate_opportunity_score(
        inputs.repetition,
        inputs.manual_effort,
        inputs.consistency,
        inputs.data_availability,
        inputs.risk,
    )


def calculate_forecast(
    eligible_runs: int,
    manual_minutes_per_run: float,
    review_minutes_per_run: float,
    exception_minutes: float,
) -> ForecastMetrics:
    """Forecast hours saved across conservative/likely/optimistic scenarios."""
    base = eligible_runs * (manual_minutes_per_run - review_minutes_per_run)

    likely_minutes = base - exception_minutes
    conservative_minutes = likely_minutes * FORECAST_CONSERVATIVE_FACTOR
    optimistic_minutes = likely_minutes * FORECAST_OPTIMISTIC_FACTOR

    return ForecastMetrics(
        eligible_runs=eligible_runs,
        manual_minutes_per_run=manual_minutes_per_run,
        review_minutes_per_run=review_minutes_per_run,
        exception_minutes=exception_minutes,
        conservative_hours_saved=round(conservative_minutes / 60, 2),
        likely_hours_saved=round(likely_minutes / 60, 2),
        optimistic_hours_saved=round(optimistic_minutes / 60, 2),
    )


def forecast_time_saved(inputs: ForecastInputs) -> ForecastMetrics:
    """Typed wrapper around ``calculate_forecast``."""
    return calculate_forecast(
        inputs.eligible_runs,
        inputs.manual_minutes_per_run,
        inputs.review_minutes_per_run,
        inputs.exception_minutes,
    )


def _recommendation_from_score(overall_score: float) -> str:
    """Map an overall effectiveness score to a human-facing recommendation."""
    if overall_score >= 80:
        return "Automation is performing well. Consider expanding scope."
    if overall_score >= 60:
        return "Good performance. Monitor exception rate."
    if overall_score >= 40:
        return "Moderate performance. Review manual-touch steps."
    return "Low effectiveness. Consider adjusting automation rules."


def calculate_effectiveness(
    realised_time_ratio: float,
    coverage_ratio: float,
    reliability_ratio: float,
    rework_ratio: float,
    cycle_time_ratio: float,
    acceptance_ratio: float,
    has_major_error: bool,
) -> EffectivenessMetrics:
    """Compute the weighted Effectiveness Score with a safety cap.

    A major error caps the overall score at 40 and flags the automation for
    review, regardless of how well individual dimensions scored.
    Ratios above 1.0 are clamped to 1.0 before scoring.
    """
    realised_time_ratio = _clamp_unit(realised_time_ratio)
    coverage_ratio = _clamp_unit(coverage_ratio)
    reliability_ratio = _clamp_unit(reliability_ratio)
    rework_ratio = _clamp_unit(rework_ratio)
    cycle_time_ratio = _clamp_unit(cycle_time_ratio)
    acceptance_ratio = _clamp_unit(acceptance_ratio)

    realised_time_score = realised_time_ratio * EFFECTIVENESS_WEIGHT_REALISED_TIME
    coverage_score = coverage_ratio * EFFECTIVENESS_WEIGHT_COVERAGE
    reliability_score = reliability_ratio * EFFECTIVENESS_WEIGHT_RELIABILITY
    quality_score = rework_ratio * EFFECTIVENESS_WEIGHT_QUALITY
    cycle_time_score = cycle_time_ratio * EFFECTIVENESS_WEIGHT_CYCLE_TIME
    acceptance_score = acceptance_ratio * EFFECTIVENESS_WEIGHT_ACCEPTANCE

    overall = min(
        realised_time_score
        + coverage_score
        + reliability_score
        + quality_score
        + cycle_time_score
        + acceptance_score,
        100,
    )

    if has_major_error:
        safety_status: str = "needs_review"
        overall_score = min(overall, EFFECTIVENESS_SAFETY_CAP)
        recommendation = (
            "Automation paused for review. "
            "Check flagged runs before re-enabling."
        )
    else:
        safety_status = "ok"
        overall_score = overall
        recommendation = _recommendation_from_score(overall_score)

    return EffectivenessMetrics(
        realised_time_score=round(realised_time_score, 2),
        coverage_score=round(coverage_score, 2),
        reliability_score=round(reliability_score, 2),
        quality_score=round(quality_score, 2),
        cycle_time_score=round(cycle_time_score, 2),
        acceptance_score=round(acceptance_score, 2),
        safety_status=safety_status,  # type: ignore[arg-type]
        overall_score=round(overall_score, 2),
        recommendation=recommendation,
    )


def score_effectiveness(inputs: EffectivenessInputs) -> EffectivenessMetrics:
    """Typed wrapper around ``calculate_effectiveness``."""
    return calculate_effectiveness(
        inputs.realised_time_ratio,
        inputs.coverage_ratio,
        inputs.reliability_ratio,
        inputs.rework_ratio,
        inputs.cycle_time_ratio,
        inputs.acceptance_ratio,
        inputs.has_major_error,
    )
