import pytest

from intelligence.indicators.chloride import (
    process_chloride_measurement,
    calculate_chloride_baseline,
    calculate_chloride_anomaly,
    assess_chloride_evidence,
)


def measurement(value=120, unit="mg/L", source="laboratory"):
    return {
        "location_id": "LOC_001",
        "value": value,
        "unit": unit,
        "source_type": source,
        "timestamp": "2026-11-20T10:00:00+05:30",
        "calibration_status": "verified",
        "method": "laboratory_test",
    }


def history():
    return [
        {
            "location_id": "LOC_001",
            "season_key": "post_monsoon",
            "chloride_mg_l": value,
            "source_type": "laboratory",
            "calibration_status": "verified",
            "timestamp": (
                f"2025-11-{i:02d}T10:00:00+05:30"
            ),
        }
        for i, value in enumerate([80, 82, 81, 83, 84], start=1)
    ]


def test_mg_l_conversion():
    result = process_chloride_measurement(measurement())
    assert result["chloride_mg_l"] == 120


def test_g_l_conversion():
    result = process_chloride_measurement(
        measurement(value=1, unit="g/L")
    )
    assert result["chloride_mg_l"] == 1000


def test_mmol_l_conversion():
    result = process_chloride_measurement(
        measurement(value=1, unit="mmol/L")
    )
    assert result["chloride_mg_l"] == pytest.approx(35.453)


def test_simulated_source_is_labelled():
    result = process_chloride_measurement(
        measurement(source="simulation")
    )
    assert result["is_simulated"] is True


def test_invalid_unit_rejected():
    with pytest.raises(ValueError):
        process_chloride_measurement(
            measurement(unit="ppm")
        )


def test_invalid_timestamp_rejected():
    data = measurement()
    data["timestamp"] = "not-a-date"

    with pytest.raises(ValueError):
        process_chloride_measurement(data)


def test_baseline_calculation():
    result = calculate_chloride_baseline(
        history(), "LOC_001", "post_monsoon"
    )

    assert result["baseline_status"] == "calculated"
    assert result["sample_count"] == 5
    assert result["baseline_chloride_mg_l"] == 82


def test_simulated_history_excluded():
    observations = history()
    observations[0]["source_type"] = "simulation"

    result = calculate_chloride_baseline(
        observations, "LOC_001", "post_monsoon"
    )

    assert result["sample_count"] == 4
    assert result["baseline_status"] == "unavailable"


def test_insufficient_history():
    result = calculate_chloride_baseline(
        history()[:2], "LOC_001", "post_monsoon"
    )

    assert result["baseline_status"] == "unavailable"


def test_increased_chloride_anomaly():
    baseline = calculate_chloride_baseline(
        history(), "LOC_001", "post_monsoon"
    )

    result = calculate_chloride_anomaly(120, baseline)

    assert result["anomaly_status"] == "calculated"
    assert result["direction"] == "increased"
    assert result["percentage_deviation"] > 0


def test_missing_baseline_does_not_claim_low_anomaly():
    baseline = calculate_chloride_baseline(
        [], "LOC_001", "post_monsoon"
    )

    result = calculate_chloride_anomaly(120, baseline)

    assert result["anomaly_status"] == "baseline_unavailable"
    assert result["direction"] == "unknown"


def test_complete_chloride_assessment():
    result = assess_chloride_evidence(
        measurement(),
        history(),
        "post_monsoon",
    )

    assert result["assessment_status"] == "assessed"
    assert result["operationally_eligible"] is True
    assert result["anomaly"]["direction"] == "increased"


def test_simulated_assessment_not_operational():
    result = assess_chloride_evidence(
        measurement(source="simulation"),
        history(),
        "post_monsoon",
    )

    assert result["assessment_status"] == "simulated_only"
    assert result["operationally_eligible"] is False


def test_unverified_measurement_not_eligible():
    data = measurement()
    data["calibration_status"] = "unverified"

    result = assess_chloride_evidence(
        data, history(), "post_monsoon"
    )

    assert result["assessment_status"] == "measurement_not_eligible"
    assert result["operationally_eligible"] is False


def test_mixed_location_history_rejected():
    observations = history()
    observations[0]["location_id"] = "LOC_002"

    with pytest.raises(ValueError):
        assess_chloride_evidence(
            measurement(), observations, "post_monsoon"
        )
