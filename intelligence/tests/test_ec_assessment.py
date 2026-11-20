from intelligence.indicators.ec_assessment import assess_ec_evidence


def make_measurement(
    value=800,
    source_type="physical_sensor",
    calibration_status="verified",
):
    return {
        "location_id": "well_001",
        "value": value,
        "unit": "uS/cm",
        "source_type": source_type,
        "timestamp": "2026-11-20T10:00:00+05:30",
        "temperature_c": 25,
        "calibration_status": calibration_status,
    }


def make_history():
    values = [790, 800, 810, 795, 805]

    return [
        {
            "location_id": "well_001",
            "season_key": "post_monsoon",
            "ec25_uS_cm": value,
            "source_type": "physical_sensor",
            "calibration_status": "verified",
            "timestamp": (
                f"2025-11-{index + 1:02d}T10:00:00+05:30"
            ),
        }
        for index, value in enumerate(values)
    ]


def test_valid_measurement_and_baseline_are_assessed():
    result = assess_ec_evidence(
        make_measurement(value=1200),
        make_history(),
        "post_monsoon",
    )

    assert result["assessment_status"] == "assessed"
    assert result["operationally_eligible"] is True
    assert result["baseline"]["baseline_status"] == "calculated"
    assert result["anomaly"]["anomaly_status"] == "calculated"
    assert result["anomaly"]["direction"] == "increased"


def test_simulated_measurement_is_not_operational():
    result = assess_ec_evidence(
        make_measurement(source_type="simulation"),
        make_history(),
        "post_monsoon",
    )

    assert result["assessment_status"] == "simulated_only"
    assert result["operationally_eligible"] is False
    assert result["anomaly"]["anomaly_status"] == "not_assessed_simulated"


def test_unverified_calibration_is_not_operational():
    result = assess_ec_evidence(
        make_measurement(calibration_status="unverified"),
        make_history(),
        "post_monsoon",
    )

    assert result["assessment_status"] == "measurement_not_eligible"
    assert result["operationally_eligible"] is False


def test_missing_history_does_not_claim_low_anomaly():
    result = assess_ec_evidence(
        make_measurement(),
        [],
        "post_monsoon",
    )

    assert result["assessment_status"] == "baseline_unavailable"
    assert result["anomaly"]["anomaly_status"] == "baseline_unavailable"
    assert result["anomaly"]["direction"] == "unknown"


def test_simulated_pipeline_mode_blocks_operational_assessment():
    result = assess_ec_evidence(
        make_measurement(),
        make_history(),
        "post_monsoon",
        force_simulated=True,
    )

    assert result["assessment_status"] == "simulated_only"
    assert result["operationally_eligible"] is False


def test_wrong_location_history_is_rejected():
    history = make_history()
    history[0]["location_id"] = "another_well"

    try:
        assess_ec_evidence(
            make_measurement(),
            history,
            "post_monsoon",
        )
    except ValueError:
        pass
    else:
        raise AssertionError("Expected mismatched location to be rejected")
