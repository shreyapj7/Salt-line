import pytest

from intelligence.indicators.ec_baseline import calculate_ec_baseline


def observation(value, index, **overrides):
    item = {
        "location_id": "LOC_001",
        "season_key": "pre_monsoon",
        "ec25_uS_cm": value,
        "source_type": "physical_sensor",
        "calibration_status": "verified",
        "timestamp": f"2026-03-{index:02d}T10:00:00Z",
    }
    item.update(overrides)
    return item


def test_real_verified_observations_produce_baseline():
    records = [
        observation(400, 1),
        observation(420, 2),
        observation(410, 3),
        observation(430, 4),
        observation(405, 5),
    ]

    result = calculate_ec_baseline(
        records, "LOC_001", "pre_monsoon"
    )

    assert result["baseline_status"] == "calculated"
    assert result["baseline_ec25_uS_cm"] == 410
    assert result["sample_count"] == 5


def test_no_ec_history_returns_unavailable():
    result = calculate_ec_baseline(
        [], "LOC_001", "pre_monsoon"
    )

    assert result["baseline_status"] == "unavailable"
    assert result["baseline_ec25_uS_cm"] if (
        "baseline_ec25_uS_cm" in result
    ) else None is None


def test_simulated_observations_are_excluded():
    records = [
        observation(
            400, 1,
            source_type="simulation",
            calibration_status="not_applicable",
        )
        for _ in range(5)
    ]

    result = calculate_ec_baseline(
        records, "LOC_001", "pre_monsoon"
    )

    assert result["baseline_status"] == "unavailable"
    assert result["sample_count"] == 0
    assert result["excluded_observations"][
        "simulated_or_unsupported_source"
    ] == 5


def test_unverified_measurements_are_excluded():
    records = [
        observation(400, i, calibration_status="unverified")
        for i in range(1, 6)
    ]

    result = calculate_ec_baseline(
        records, "LOC_001", "pre_monsoon"
    )

    assert result["sample_count"] == 0


def test_other_locations_are_not_mixed():
    records = [
        observation(400, i, location_id="LOC_OTHER")
        for i in range(1, 6)
    ]

    result = calculate_ec_baseline(
        records, "LOC_001", "pre_monsoon"
    )

    assert result["sample_count"] == 0
    assert result["excluded_observations"]["wrong_location"] == 5


def test_other_seasons_are_not_mixed():
    records = [
        observation(400, i, season_key="monsoon")
        for i in range(1, 6)
    ]

    result = calculate_ec_baseline(
        records, "LOC_001", "pre_monsoon"
    )

    assert result["sample_count"] == 0
    assert result["excluded_observations"]["wrong_season"] == 5


def test_median_is_robust_to_extreme_observation():
    records = [
        observation(400, 1),
        observation(410, 2),
        observation(420, 3),
        observation(415, 4),
        observation(5000, 5),
    ]

    result = calculate_ec_baseline(
        records, "LOC_001", "pre_monsoon"
    )

    assert result["baseline_ec25_uS_cm"] == 415


def test_insufficient_history_is_not_a_baseline():
    records = [
        observation(400, 1),
        observation(410, 2),
        observation(420, 3),
    ]

    result = calculate_ec_baseline(
        records, "LOC_001", "pre_monsoon"
    )

    assert result["baseline_status"] == "unavailable"
    assert result["sample_count"] == 3


def test_invalid_timestamp_is_excluded():
    records = [
        observation(
            400, i, timestamp="2026-03-01T10:00:00"
        )
        for i in range(1, 6)
    ]

    result = calculate_ec_baseline(
        records, "LOC_001", "pre_monsoon"
    )

    assert result["sample_count"] == 0


def test_invalid_configuration_is_rejected():
    with pytest.raises(ValueError):
        calculate_ec_baseline(
            [], "LOC_001", "pre_monsoon",
            minimum_observations=2,
        )
