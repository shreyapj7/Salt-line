"""Electrical conductivity measurement validation and normalization.

This module does not diagnose seawater intrusion.
It preserves measurement provenance and calculates EC at 25 C
only when the necessary temperature information is available.
"""

from datetime import datetime
import math
from typing import Any


REFERENCE_TEMPERATURE_C = 25.0

EC_UNIT_FACTORS = {
    "uS/cm": 1.0,
    "µS/cm": 1.0,
    "μS/cm": 1.0,
    "mS/cm": 1000.0,
}

SOURCE_TYPES = {
    "simulation",
    "physical_sensor",
    "laboratory",
    "public_dataset",
}

CALIBRATION_STATUSES = {
    "verified",
    "unverified",
    "expired",
    "not_applicable",
    "unknown",
}


def _finite_number(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be numeric")

    result = float(value)

    if not math.isfinite(result):
        raise ValueError(f"{field} must be finite")

    return result


def _validate_timestamp(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("timestamp must be a non-empty ISO 8601 string")

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("timestamp must be valid ISO 8601") from exc

    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("timestamp must include a timezone")

    return value


def process_ec_measurement(measurement: dict) -> dict:
    """Validate an EC observation and calculate EC25 when possible.

    Required:
        location_id, value, unit, source_type, timestamp

    Optional:
        sensor_id, temperature_c, temperature_compensated,
        temperature_coefficient_per_c, calibration_status

    The temperature coefficient must be supplied explicitly.
    No universal coefficient is assumed.
    """

    if not isinstance(measurement, dict):
        raise TypeError("measurement must be a dictionary")

    location_id = measurement.get("location_id")

    if not isinstance(location_id, str) or not location_id.strip():
        raise ValueError("location_id must be a non-empty string")

    value = _finite_number(measurement.get("value"), "value")

    if value <= 0:
        raise ValueError("EC value must be greater than zero")

    unit = measurement.get("unit")

    if unit not in EC_UNIT_FACTORS:
        raise ValueError(
            f"Unsupported EC unit: {unit}. "
            f"Supported units: {list(EC_UNIT_FACTORS)}"
        )

    ec_value = value * EC_UNIT_FACTORS[unit]

    source_type = measurement.get("source_type")

    if source_type not in SOURCE_TYPES:
        raise ValueError(
            f"source_type must be one of {sorted(SOURCE_TYPES)}"
        )

    timestamp = _validate_timestamp(measurement.get("timestamp"))

    calibration_status = measurement.get(
        "calibration_status", "unknown"
    )

    if calibration_status not in CALIBRATION_STATUSES:
        raise ValueError("Invalid calibration_status")

    temperature_compensated = measurement.get(
        "temperature_compensated", False
    )

    if not isinstance(temperature_compensated, bool):
        raise ValueError("temperature_compensated must be boolean")

    temperature = measurement.get("temperature_c")

    if temperature is not None:
        temperature = _finite_number(
            temperature, "temperature_c"
        )

    coefficient = measurement.get(
        "temperature_coefficient_per_c"
    )

    if coefficient is not None:
        coefficient = _finite_number(
            coefficient, "temperature_coefficient_per_c"
        )

        if not 0 < coefficient < 0.1:
            raise ValueError(
                "temperature coefficient must be greater than 0 "
                "and less than 0.1 per degree C"
            )

    ec25 = None
    correction_status = "unavailable"
    quality_flags = []

    if temperature_compensated:
        reference = measurement.get(
            "ec_reference_temperature_c",
            REFERENCE_TEMPERATURE_C,
        )

        reference = _finite_number(
            reference, "ec_reference_temperature_c"
        )

        if reference != REFERENCE_TEMPERATURE_C:
            raise ValueError(
                "This module currently accepts compensated EC "
                "only when referenced to 25 C"
            )

        ec25 = ec_value
        correction_status = "already_compensated"

    elif temperature is None:
        correction_status = "temperature_missing"
        quality_flags.append("water_temperature_unavailable")

    elif temperature == REFERENCE_TEMPERATURE_C:
        ec25 = ec_value
        correction_status = "no_correction_needed"

    elif coefficient is None:
        correction_status = "coefficient_missing"
        quality_flags.append(
            "temperature_coefficient_not_configured"
        )

    else:
        denominator = (
            1 + coefficient * (temperature - REFERENCE_TEMPERATURE_C)
        )

        if denominator <= 0:
            raise ValueError(
                "Invalid temperature correction denominator"
            )

        ec25 = ec_value / denominator
        correction_status = "temperature_corrected"

    return {
        "location_id": location_id,
        "parameter": "electrical_conductivity",
        "raw_value": value,
        "raw_unit": unit,
        "ec_uS_cm": round(ec_value, 6),
        "water_temperature_c": temperature,
        "ec_reference_temperature_c": REFERENCE_TEMPERATURE_C,
        "temperature_compensated": temperature_compensated,
        "temperature_coefficient_per_c": coefficient,
        "ec25_uS_cm": (
            round(ec25, 6) if ec25 is not None else None
        ),
        "correction_status": correction_status,
        "source_type": source_type,
        "is_simulated": source_type == "simulation",
        "sensor_id": measurement.get("sensor_id"),
        "calibration_status": calibration_status,
        "timestamp": timestamp,
        "quality_flags": quality_flags,
    }
