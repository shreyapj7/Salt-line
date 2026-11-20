
from datetime import datetime, timezone
import math


SIMULATED_SOURCES = {
    "wokwi_potentiometer_simulation",
    "synthetic_integration_test",
}


def evaluate_sensor_reading(reading: dict) -> dict:
    """
    Evaluate one stored sensor record.

    This function checks data quality and provenance.
    It does not convert raw ADC values into calibrated
    groundwater or TDS measurements.
    """

    if not isinstance(reading, dict):
        raise TypeError("reading must be a dictionary")

    reasons = []
    warnings = []

    required_fields = [
        "id",
        "device_id",
        "tds_raw_avg",
        "water_level_raw_avg",
        "source",
        "received_at",
        "input_warning",
    ]

    missing_fields = [
        field for field in required_fields
        if field not in reading or reading[field] is None
    ]

    if missing_fields:
        return {
            "reading_id": reading.get("id"),
            "eligible_for_storage": False,
            "eligible_for_conversion": False,
            "eligible_for_operational_assessment": False,
            "is_simulated": False,
            "is_synthetic": False,
            "status": "invalid",
            "reasons": [
                f"Missing required fields: {missing_fields}"
            ],
            "warnings": [],
        }

    source = reading["source"]

    is_simulated = source == "wokwi_potentiometer_simulation"
    is_synthetic = source == "synthetic_integration_test"

    if not isinstance(source, str) or not source.strip():
        return {
            "reading_id": reading.get("id"),
            "eligible_for_storage": False,
            "eligible_for_conversion": False,
            "eligible_for_operational_assessment": False,
            "is_simulated": False,
            "is_synthetic": False,
            "status": "invalid",
            "reasons": ["Invalid source metadata."],
            "warnings": [],
        }

    raw_fields = ["tds_raw_avg", "water_level_raw_avg"]

    for field in raw_fields:
        value = reading[field]

        if (
            isinstance(value, bool)
            or not isinstance(value, int)
            or not 0 <= value <= 4095
        ):
            reasons.append(
                f"{field} must be an integer between 0 and 4095."
            )

    if not isinstance(reading["input_warning"], bool):
        reasons.append("input_warning must be a boolean.")

    if reasons:
        return {
            "reading_id": reading["id"],
            "eligible_for_storage": True,
            "eligible_for_conversion": False,
            "eligible_for_operational_assessment": False,
            "is_simulated": is_simulated,
            "is_synthetic": is_synthetic,
            "status": "invalid",
            "reasons": reasons,
            "warnings": [],
        }

    if reading["input_warning"]:
        warnings.append(
            "Sensor input warning is active. Exclude this reading "
            "from indicator conversion until investigated."
        )

    if is_simulated:
        reasons.append("Reading originated from Wokwi simulation.")

    elif is_synthetic:
        reasons.append("Reading is synthetic test data.")

    else:
        reasons.append(
            "Source is not recognised as simulation or synthetic data. "
            "Physical provenance still requires verification."
        )

    temperature = reading.get("temperature_c")
    temperature_valid = reading.get("temperature_valid", False)

    if temperature_valid:
        if (
            isinstance(temperature, bool)
            or not isinstance(temperature, (int, float))
            or not math.isfinite(temperature)
        ):
            warnings.append("Temperature value is invalid.")
        else:
            warnings.append(
                "Temperature is available but is not independently "
                "a groundwater salinity indicator."
            )
    else:
        warnings.append("Temperature measurement is unavailable.")

    try:
        timestamp = datetime.fromisoformat(
            reading["received_at"].replace("Z", "+00:00")
        )

        if timestamp.tzinfo is None:
            warnings.append(
                "Timestamp has no timezone information."
            )

    except (ValueError, TypeError, AttributeError):
        warnings.append("Timestamp is invalid.")

    if reading["input_warning"]:
        conversion_eligible = False
    else:
        conversion_eligible = False

    reasons.extend([
        "Raw ADC values are not calibrated TDS measurements.",
        "Raw water-level ADC values are not calibrated groundwater depth.",
    ])

    return {
        "reading_id": reading["id"],
        "eligible_for_storage": True,
        "eligible_for_conversion": conversion_eligible,
        "eligible_for_operational_assessment": False,
        "is_simulated": is_simulated,
        "is_synthetic": is_synthetic,
        "status": (
            "simulated"
            if is_simulated
            else "synthetic"
            if is_synthetic
            else "unverified_source"
        ),
        "reasons": reasons,
        "warnings": warnings,
    }


def evaluate_sensor_batch(readings: list[dict]) -> dict:
    """Evaluate a batch of sensor readings."""

    if not isinstance(readings, list):
        raise TypeError("readings must be a list")

    results = [
        evaluate_sensor_reading(reading)
        for reading in readings
    ]

    return {
        "total": len(results),
        "storage_eligible": sum(
            item["eligible_for_storage"] for item in results
        ),
        "conversion_eligible": sum(
            item["eligible_for_conversion"] for item in results
        ),
        "operationally_eligible": sum(
            item["eligible_for_operational_assessment"]
            for item in results
        ),
        "readings": results,
    }
