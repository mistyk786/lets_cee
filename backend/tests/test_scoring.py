"""Unit tests for the pure scoring functions.

Run from the backend/ directory:
    pytest
"""

from __future__ import annotations

import pytest

from app.services.scoring_service import (
    calculate_effectiveness,
    calculate_forecast,
    calculate_opportunity_score,
)


# ---------------------------------------------------------------------------
# Opportunity score
# ---------------------------------------------------------------------------


def test_opportunity_all_ones():
    # 30 + 25 + 20 + 15 - 10 = 80
    assert calculate_opportunity_score(1.0, 1.0, 1.0, 1.0, 1.0) == 80.0


def test_opportunity_all_zeros():
    assert calculate_opportunity_score(0.0, 0.0, 0.0, 0.0, 0.0) == 0.0


def test_opportunity_risk_only_clamped_non_negative():
    # -10 would be negative; clamps to 0.0
    assert calculate_opportunity_score(0.0, 0.0, 0.0, 0.0, 1.0) == 0.0


def test_opportunity_typical_case():
    # 0.9*30 + 0.8*25 + 0.7*20 + 0.8*15 - 0.2*10
    # = 27 + 20 + 14 + 12 - 2 = 71.0
    result = calculate_opportunity_score(
        repetition=0.9,
        manual_effort=0.8,
        consistency=0.7,
        data_availability=0.8,
        risk=0.2,
    )
    assert result == 71.0


def test_opportunity_clamped_upper_bound():
    # Inputs above 1.0 are clamped; max score with zero risk is 90.
    assert calculate_opportunity_score(2.0, 2.0, 2.0, 2.0, 0.0) == 90.0


def test_opportunity_clamps_negative_inputs():
    assert calculate_opportunity_score(-1.0, -1.0, -1.0, -1.0, -1.0) == 0.0


def test_effectiveness_clamps_ratios_above_one():
    result = calculate_effectiveness(1.5, 1.5, 1.5, 1.5, 1.5, 1.5, False)
    assert result.overall_score == 100.0


# ---------------------------------------------------------------------------
# Forecast
# ---------------------------------------------------------------------------


def test_forecast_zero_eligible():
    result = calculate_forecast(
        eligible_runs=0,
        manual_minutes_per_run=18.0,
        review_minutes_per_run=3.0,
        exception_minutes=0.0,
    )
    assert result.conservative_hours_saved == 0.0
    assert result.likely_hours_saved == 0.0
    assert result.optimistic_hours_saved == 0.0
    assert result.eligible_runs == 0


def test_forecast_demo_values():
    # base = 40 * (18 - 3) = 600
    # likely = 600 - 12 = 588 min -> 9.8 h
    # conservative = 588 * 0.7 = 411.6 -> 6.86 h
    # optimistic = 588 * 1.2 = 705.6 -> 11.76 h
    result = calculate_forecast(
        eligible_runs=40,
        manual_minutes_per_run=18.0,
        review_minutes_per_run=3.0,
        exception_minutes=12.0,
    )
    assert result.likely_hours_saved == 9.8
    assert result.conservative_hours_saved == 6.86
    assert result.optimistic_hours_saved == 11.76


def test_forecast_preserves_inputs():
    result = calculate_forecast(
        eligible_runs=25,
        manual_minutes_per_run=20.0,
        review_minutes_per_run=4.0,
        exception_minutes=10.0,
    )
    assert result.eligible_runs == 25
    assert result.manual_minutes_per_run == 20.0
    assert result.review_minutes_per_run == 4.0
    assert result.exception_minutes == 10.0


def test_forecast_exceptions_can_drive_negative():
    # Sanity: huge exception cost yields negative saved time (no clamp).
    result = calculate_forecast(
        eligible_runs=1,
        manual_minutes_per_run=10.0,
        review_minutes_per_run=3.0,
        exception_minutes=600.0,
    )
    assert result.likely_hours_saved < 0


# ---------------------------------------------------------------------------
# Effectiveness
# ---------------------------------------------------------------------------


def test_effectiveness_all_perfect():
    result = calculate_effectiveness(
        realised_time_ratio=1.0,
        coverage_ratio=1.0,
        reliability_ratio=1.0,
        rework_ratio=1.0,
        cycle_time_ratio=1.0,
        acceptance_ratio=1.0,
        has_major_error=False,
    )
    # 30 + 20 + 20 + 15 + 10 + 5 = 100
    assert result.overall_score == 100.0
    assert result.safety_status == "ok"
    assert result.recommendation == (
        "Automation is performing well. Consider expanding scope."
    )


def test_effectiveness_all_zero():
    result = calculate_effectiveness(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, False)
    assert result.overall_score == 0.0
    assert result.safety_status == "ok"
    assert result.recommendation == (
        "Low effectiveness. Consider adjusting automation rules."
    )


def test_effectiveness_major_error_caps_at_40():
    # Perfect scores but a major error -> capped at 40 + needs_review.
    result = calculate_effectiveness(
        realised_time_ratio=1.0,
        coverage_ratio=1.0,
        reliability_ratio=1.0,
        rework_ratio=1.0,
        cycle_time_ratio=1.0,
        acceptance_ratio=1.0,
        has_major_error=True,
    )
    assert result.overall_score == 40.0
    assert result.safety_status == "needs_review"
    assert result.recommendation == (
        "Automation paused for review. "
        "Check flagged runs before re-enabling."
    )


def test_effectiveness_component_breakdown():
    result = calculate_effectiveness(
        realised_time_ratio=0.8,
        coverage_ratio=0.8,
        reliability_ratio=0.75,
        rework_ratio=0.8,
        cycle_time_ratio=0.5,
        acceptance_ratio=0.4,
        has_major_error=False,
    )
    assert result.realised_time_score == 24.0  # 0.8 * 30
    assert result.coverage_score == 16.0  # 0.8 * 20
    assert result.reliability_score == 15.0  # 0.75 * 20
    assert result.quality_score == 12.0  # 0.8 * 15
    assert result.cycle_time_score == 5.0  # 0.5 * 10
    assert result.acceptance_score == 2.0  # 0.4 * 5
    # 24 + 16 + 15 + 12 + 5 + 2 = 74
    assert result.overall_score == 74.0
    assert result.recommendation == "Good performance. Monitor exception rate."


@pytest.mark.parametrize(
    "realised,coverage,reliability,rework,cycle,acceptance,expected",
    [
        # ~60 tier: 18 + 12 + 12 + 9 + 6 + 3 = 60
        (0.6, 0.6, 0.6, 0.6, 0.6, 0.6, "Good performance. Monitor exception rate."),
        # ~40 tier: 12 + 8 + 8 + 6 + 4 + 2 = 40
        (0.4, 0.4, 0.4, 0.4, 0.4, 0.4, "Moderate performance. Review manual-touch steps."),
        # ~30 tier (< 40): low effectiveness
        (0.3, 0.3, 0.3, 0.3, 0.3, 0.3, "Low effectiveness. Consider adjusting automation rules."),
    ],
)
def test_effectiveness_recommendation_tiers(
    realised, coverage, reliability, rework, cycle, acceptance, expected
):
    result = calculate_effectiveness(
        realised, coverage, reliability, rework, cycle, acceptance, False
    )
    assert result.recommendation == expected
