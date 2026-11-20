from datetime import datetime, timezone

import pytest

from intelligence.validation.sensor_validation import (
    validate_sensor_reading,
    validate_sensor_batch,
)


NOW = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)


def reading(**overrides):
    data = {
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
    data.update(overrides)
    return data


def test_wokwi_is_demo_eligible_not_operational():
    result = validate_sensor_reading(reading(), now=NOW)

    assert result["eligible_for_demo"] is True
    assert result["eligible_for_operational_assessment"] is False
    assert result["status"] == "simulated"


def test_synthetic_data_is_identified():
    result = validate_sensor_reading(
        reading(source="synthetic_integration_test"),
        now=NOW,
    )

    assert result["source_type"] == "synthetic"
    assert result["eligible_for_operational_assessment"] is False


def test_invalid_adc_is_rejected():
    result = validate_sensor_reading(
        reading(tds_raw_avg=5000),
        now=NOW,
    )

    assert result["eligible_for_demo"] is False
    assert "invalid" in result["status"]


def test_boolean_adc_is_rejected():
    result = validate_sensor_reading(
        reading(tds_raw_avg=True),
        now=NOW,
    )

    assert result["eligible_for_demo"] is False


def test_invalid_voltage_is_flagged():
    result = validate_sensor_reading(
        reading(tds_voltage_est_v=4.5),
        now=NOW,
    )

    assert "invalid" in result["status"]
    assert result["eligible_for_demo"] is False


def test_future_timestamp_is_rejected():
    result = validate_sensor_reading(
        reading(received_at="2026-11-20T13:00:00+00:00"),
        now=NOW,
    )

    assert result["status"] == "invalid"
    assert "FUTURE_TIMESTAMP" in result["quality_flags"]


def test_timezone_missing_is_rejected():
    result = validate_sensor_reading(
        reading(received_at="2026-11-20T11:55:00"),
        now=NOW,
    )

    assert result["status"] == "invalid"


def test_stale_reading_is_flagged():
    result = validate_sensor_reading(
        reading(received_at="2026-11-20T10:00:00+00:00"),
        now=NOW,
    )

    assert result["status"] == "stale"
    assert "STALE_READING" in result["quality_flags"]


def test_physical_uncalibrated_sensor_not_operational():
    result = validate_sensor_reading(
        reading(
            device_id="esp32_01",
            source="esp32",
        ),
        sensor_registry={
            "esp32_01": {
                "location_id": "udupi_loc_01",
                "source": "esp32",
            }
        },
        now=NOW,
    )

    assert result["eligible_for_demo"] is True
    assert result["eligible_for_operational_assessment"] is False
    assert "UNCALIBRATED_ADC" in result["quality_flags"]


def test_valid_calibrated_physical_reading():
    result = validate_sensor_reading(
        reading(
            device_id="esp32_01",
            source="esp32",
            calibration_profile_id="cal_01",
            tds_calibrated_value=350,
        ),
        sensor_registry={
            "esp32_01": {
                "location_id": "udupi_loc_01",
                "source": "esp32",
            }
        },
        calibration_profiles={
            "cal_01": {
                "validated": True,
                "unit": "ppm",
            }
        },
        now=NOW,
    )

    assert result["eligible_for_operational_assessment"] is True
    assert result["details"]["conversion_eligible"] is True


def test_unregistered_sensor_is_not_operational():
    result = validate_sensor_reading(
        reading(
            device_id="unknown_01",
            source="esp32",
            calibration_profile_id="cal_01",
            tds_calibrated_value=350,
        ),
        calibration_profiles={
            "cal_01": {"validated": True, "unit": "ppm"}
        },
        now=NOW,
    )

    assert result["eligible_for_operational_assessment"] is False
    assert "UNREGISTERED_SENSOR" in result["quality_flags"]


def test_invalid_calibration_unit():
    result = validate_sensor_reading(
        reading(
            device_id="esp32_01",
            source="esp32",
            calibration_profile_id="cal_01",
            tds_calibrated_value=350,
        ),
        sensor_registry={
            "esp32_01": {
                "location_id": "udupi_loc_01",
                "source": "esp32",
            }
        },
        calibration_profiles={
            "cal_01": {"validated": True, "unit": "unknown"}
        },
        now=NOW,
    )

    assert result["eligible_for_operational_assessment"] is False
    assert "INVALID_TDS_UNIT" in result["quality_flags"]


def test_batch_validation():
    result = validate_sensor_batch(
        [reading(id=1), reading(id=2)],
        now=NOW,
    )

    assert result["total"] == 2
    assert result["demo_eligible"] == 2
    assert result["operationally_eligible"] == 0


def test_invalid_input_type():
    with pytest.raises(TypeError):
        validate_sensor_reading("invalid", now=NOW)
