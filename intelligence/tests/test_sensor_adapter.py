
import pytest

from intelligence.sensor_adapter import (
    evaluate_sensor_reading,
    evaluate_sensor_batch,
)


def make_reading(**overrides):
    reading = {
        "id": 1,
        "device_id": "saltline_test_device",
        "tds_raw_avg": 1800,
        "water_level_raw_avg": 2100,
        "tds_voltage_est_v": 1.451,
        "water_voltage_est_v": 1.692,
        "input_warning": False,
        "source": "synthetic_integration_test",
        "received_at": "2026-11-20T07:08:00+00:00",
        "temperature_c": 26.0,
        "temperature_valid": True,
    }

    reading.update(overrides)
    return reading


def test_synthetic_reading_is_not_operational():
    result = evaluate_sensor_reading(make_reading())

    assert result["eligible_for_storage"] is True
    assert result["eligible_for_conversion"] is False
    assert result["eligible_for_operational_assessment"] is False
    assert result["is_synthetic"] is True


def test_wokwi_reading_is_simulated():
    result = evaluate_sensor_reading(
        make_reading(source="wokwi_potentiometer_simulation")
    )

    assert result["is_simulated"] is True
    assert result["eligible_for_operational_assessment"] is False


def test_adc_boundary_warning_is_excluded():
    result = evaluate_sensor_reading(
        make_reading(
            water_level_raw_avg=4095,
            input_warning=True,
        )
    )

    assert result["eligible_for_storage"] is True
    assert result["eligible_for_conversion"] is False
    assert result["status"] == "synthetic"


def test_missing_temperature_is_warning():
    result = evaluate_sensor_reading(
        make_reading(
            temperature_c=None,
            temperature_valid=False,
        )
    )

    assert result["eligible_for_storage"] is True
    assert any(
        "Temperature measurement is unavailable" in warning
        for warning in result["warnings"]
    )


def test_invalid_adc_value_is_rejected():
    result = evaluate_sensor_reading(
        make_reading(tds_raw_avg=5000)
    )

    assert result["status"] == "invalid"
    assert result["eligible_for_conversion"] is False


def test_missing_required_field():
    reading = make_reading()
    del reading["device_id"]

    result = evaluate_sensor_reading(reading)

    assert result["eligible_for_storage"] is False
    assert result["status"] == "invalid"


def test_batch_summary():
    readings = [
        make_reading(id=1),
        make_reading(
            id=2,
            source="wokwi_potentiometer_simulation",
        ),
        make_reading(
            id=3,
            input_warning=True,
            water_level_raw_avg=4095,
        ),
    ]

    result = evaluate_sensor_batch(readings)

    assert result["total"] == 3
    assert result["storage_eligible"] == 3
    assert result["conversion_eligible"] == 0
    assert result["operationally_eligible"] == 0


def test_invalid_input_type():
    with pytest.raises(TypeError):
        evaluate_sensor_reading("not a dictionary")
