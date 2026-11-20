import pytest

from intelligence.indicators.tds import (
    process_tds_measurement,
    assess_tds_evidence,
)


def make_tds(method="direct_measurement", source="laboratory"):
    return {
        "location_id": "LOC_001",
        "value": 450,
        "unit": "mg/L",
        "source_type": source,
        "method": method,
        "timestamp": "2026-11-20T10:00:00+05:30",
        "calibration_status": "verified",
        "ec_source_id": "EC_001" if method == "ec_estimate" else None,
    }


def test_direct_tds_measurement():
    result = process_tds_measurement(make_tds())
    assert result["tds_mg_l"] == 450
    assert result["independent_evidence"] is True


def test_g_l_conversion():
    data = make_tds()
    data["value"] = 1
    data["unit"] = "g/L"

    result = process_tds_measurement(data)
    assert result["tds_mg_l"] == 1000


def test_ec_estimated_tds_not_independent():
    result = process_tds_measurement(
        make_tds(method="ec_estimate")
    )

    assert result["independent_evidence"] is False
    assert "derived_from_ec_not_independent" in result["quality_flags"]


def test_ec_estimate_requires_source():
    data = make_tds(method="ec_estimate")
    data["ec_source_id"] = None

    with pytest.raises(ValueError):
        process_tds_measurement(data)


def test_simulated_tds_not_operational():
    result = assess_tds_evidence(
        make_tds(source="simulation")
    )

    assert result["assessment_status"] == "simulated_only"
    assert result["operationally_eligible"] is False


def test_unverified_tds_not_eligible():
    data = make_tds()
    data["calibration_status"] = "unverified"

    result = assess_tds_evidence(data)

    assert result["assessment_status"] == "measurement_not_eligible"


def test_derived_tds_is_not_independent():
    result = assess_tds_evidence(
        make_tds(method="ec_estimate")
    )

    assert result["assessment_status"] == "derived_estimate"
    assert result["operationally_eligible"] is True
    assert result["measurement"]["independent_evidence"] is False


def test_invalid_tds_rejected():
    data = make_tds()
    data["value"] = -10

    with pytest.raises(ValueError):
        process_tds_measurement(data)


def test_invalid_timestamp_rejected():
    data = make_tds()
    data["timestamp"] = "invalid"

    with pytest.raises(ValueError):
        process_tds_measurement(data)
