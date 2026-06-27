"""Pure scoring functions for Sloth.ai.

No LLM calls, no I/O. Every function here is deterministic and easy to unit
test. These power the opportunity ranking, time-saved forecast, and the
post-automation Effectiveness Score.
"""

from __future__ import annotations

from app.schemas import EffectivenessMetrics, ForecastMetrics


def calculate_opportunity_score(
    repetition: float,
    manual_effort: float,
    consistency: float,
    data_availability: float,
    risk: float,
) -> float:
    """Score how worthwhile automating a workflow is, on a 0-100 scale.

    All inputs are normalised 0-1 signals. Risk subtracts from the score.
    """
    score = (
        repetition * 30
        + manual_effort * 25
        + consistency * 20
        + data_availability * 15
        - risk * 10
    )
    return round(max(0, min(100, score)), 2)


def calculate_forecast(
    eligible_runs: int,
    manual_minutes_per_run: float,
    review_minutes_per_run: float,
    exception_minutes: float,
) -> ForecastMetrics:
    """Forecast hours saved across conservative/likely/optimistic scenarios."""
    base = eligible_runs * (manual_minutes_per_run - review_minutes_per_run)

    likely_minutes = base - exception_minutes
    conservative_minutes = likely_minutes * 0.7
    optimistic_minutes = likely_minutes * 1.2

    return ForecastMetrics(
        eligible_runs=eligible_runs,
        manual_minutes_per_run=manual_minutes_per_run,
        review_minutes_per_run=review_minutes_per_run,
        exception_minutes=exception_minutes,
        conservative_hours_saved=round(conservative_minutes / 60, 2),
        likely_hours_saved=round(likely_minutes / 60, 2),
        optimistic_hours_saved=round(optimistic_minutes / 60, 2),
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
    """
    realised_time_score = realised_time_ratio * 30
    coverage_score = coverage_ratio * 20
    reliability_score = reliability_ratio * 20
    quality_score = rework_ratio * 15
    cycle_time_score = cycle_time_ratio * 10
    acceptance_score = acceptance_ratio * 5

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
        overall_score = min(overall, 40)
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
