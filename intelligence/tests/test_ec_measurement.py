import pytest

from intelligence.indicators.ec_measurement import (
    process_ec_measurement,
)


def make_measurement(**overrides):
    data = {
        "location_id": "LOC_TEST",
        "value": 1200,
        "unit": "uS/cm",
        "source_type": "simulation",
        "timestamp": "2026-11-21T01:00:00Z",
        "temperature_c": 30,
        "temperature_coefficient_per_c": 0.0191,
        "temperature_compensated": False,
        "sensor_id": "SIM_EC_01",
    }
    data.update(overrides)
    return data


def test_temperature_correction():
    result = process_ec_measurement(make_measurement())

    expected = 1200 / (1 + 0.0191 * 5)

    assert result["ec25_uS_cm"] == pytest.approx(expected)
    assert result["correction_status"] == "temperature_corrected"


def test_simulated_data_is_identified():
    result = process_ec_measurement(make_measurement())

    assert result["is_simulated"] is True
    assert result["source_type"] == "simulation"


def test_mS_cm_is_converted_to_uS_cm():
    result = process_ec_measurement(
        make_measurement(
            value=1.2,
            unit="mS/cm",
            temperature_c=25,
        )
    )

    assert result["ec_uS_cm"] == pytest.approx(1200)
    assert result["ec25_uS_cm"] == pytest.approx(1200)


def test_missing_temperature_does_not_invent_ec25():
    result = process_ec_measurement(
        make_measurement(temperature_c=None)
    )

    assert result["ec25_uS_cm"] is None
    assert result["correction_status"] == "temperature_missing"


def test_missing_coefficient_does_not_invent_ec25():
    result = process_ec_measurement(
        make_measurement(
            temperature_coefficient_per_c=None
        )
    )

    assert result["ec25_uS_cm"] is None
    assert result["correction_status"] == "coefficient_missing"


def test_already_compensated_reading_is_not_corrected_twice():
    result = process_ec_measurement(
        make_measurement(
            value=1100,
            temperature_compensated=True,
            temperature_c=30,
        )
    )

    assert result["ec25_uS_cm"] == pytest.approx(1100)
    assert result["correction_status"] == "already_compensated"


def test_temperature_of_25_needs_no_coefficient():
    result = process_ec_measurement(
        make_measurement(
            temperature_c=25,
            temperature_coefficient_per_c=None,
        )
    )

    assert result["ec25_uS_cm"] == pytest.approx(1200)
    assert result["correction_status"] == "no_correction_needed"


@pytest.mark.parametrize("value", [-1, 0, float("nan"), float("inf")])
def test_invalid_ec_values_are_rejected(value):
    with pytest.raises(ValueError):
        process_ec_measurement(make_measurement(value=value))


def test_boolean_ec_value_is_rejected():
    with pytest.raises(ValueError):
        process_ec_measurement(make_measurement(value=True))


def test_invalid_timestamp_is_rejected():
    with pytest.raises(ValueError):
        process_ec_measurement(
            make_measurement(timestamp="not-a-date")
        )


def test_timezone_is_required():
    with pytest.raises(ValueError):
        process_ec_measurement(
            make_measurement(timestamp="2026-11-21T01:00:00")
        )


def test_unknown_unit_is_rejected():
    with pytest.raises(ValueError):
        process_ec_measurement(
            make_measurement(unit="ppm")
        )


def test_unknown_source_type_is_rejected():
    with pytest.raises(ValueError):
        process_ec_measurement(
            make_measurement(source_type="unknown")
        )


def test_temperature_coefficient_is_not_assumed():
    result = process_ec_measurement(
        make_measurement(
            temperature_coefficient_per_c=None
        )
    )

    assert result["temperature_coefficient_per_c"] is None
    assert result["ec25_uS_cm"] is None
