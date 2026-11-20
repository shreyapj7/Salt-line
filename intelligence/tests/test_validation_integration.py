from datetime import datetime, timezone

from intelligence.sensor_adapter import evaluate_sensor_reading
from intelligence.geospatial_adapter import load_geospatial_assessments
from intelligence.validation.sensor_validation import validate_sensor_reading
from intelligence.validation.geospatial_validation import (
    validate_geospatial_assessments,
)
from intelligence.validation.community_validation import (
    validate_community_reports,
)


NOW = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)


def test_real_geospatial_dataset_validation():
    assessments = load_geospatial_assessments()
    results = validate_geospatial_assessments(assessments)

    assert len(results) == 13

    by_id = {item["location_id"]: item for item in results}

    # Known rainfall coverage gaps.
    assert by_id["udupi_loc_08"]["layers"]["rainfall"]["status"] == "unmatched"
    assert by_id["udupi_loc_10"]["layers"]["rainfall"]["status"] == "unmatched"

    # Known ambiguous NDMI location.
    assert by_id["udupi_loc_13"]["layers"]["ndmi"]["status"] == "ambiguous"

    # Missing groundwater head remains unknown.
    assert by_id["udupi_loc_06"]["groundwater_head_status"] == "unknown"

    # NDMI remains simulation-only.
    for item in results:
        ndmi = item["layers"]["ndmi"]
        if ndmi["match_count"]:
            assert ndmi["is_simulated"] is True
            assert ndmi["eligible_for_operational_assessment"] is False


def test_wokwi_sensor_cannot_become_operational_evidence():
    reading = {
        "id": 1,
        "device_id": "wokwi_01",
        "location_id": "udupi_loc_01",
        "tds_raw_avg": 1800,
        "water_level_raw_avg": 2100,
        "tds_voltage_est_v": 1.45,
        "water_voltage_est_v": 1.69,
        "input_warning": False,
        "source": "wokwi_potentiometer_simulation",
        "received_at": "2026-11-20T11:55:00+00:00",
    }

    result = validate_sensor_reading(reading, now=NOW)

    assert result["eligible_for_demo"] is True
    assert result["eligible_for_operational_assessment"] is False
    assert result["details"]["is_simulated"] is True

    # Existing adapter must also retain its simulation classification.
    adapter_result = evaluate_sensor_reading(reading)

    assert adapter_result["is_simulated"] is True
    assert adapter_result["eligible_for_operational_assessment"] is False


def test_community_reports_remain_unverified_in_demo():
    reports = [
        {
            "id": 1,
            "reporter_id": "demo_resident",
            "location_id": "udupi_loc_01",
            "latitude": 13.3512,
            "longitude": 74.7045,
            "observation": "Water tastes salty",
            "reported_tds": None,
            "source": "community_report",
            "verification_status": "unverified",
            "reported_at": "2026-11-20T11:00:00+00:00",
        }
    ]

    result = validate_community_reports(
        reports,
        {"udupi_loc_01"},
        now=NOW,
    )

    report = result["reports"][0]

    assert report["eligible_for_demo"] is True
    assert report["eligible_for_operational_assessment"] is False
    assert report["verification_status"] == "unverified"
