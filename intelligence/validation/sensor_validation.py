"""SALT-LINE sensor validation. No ADC-to-TDS conversion is performed."""

from datetime import datetime, timezone
import math

from intelligence.validation.contracts import build_validation_result


SIMULATED_SOURCES = {
    "wokwi_potentiometer_simulation",
}

SYNTHETIC_SOURCES = {
    "synthetic_integration_test",
}

PHYSICAL_SOURCES = {
    "esp32",
    "esp32_physical",
}

VALID_TDS_UNITS = {"ppm", "mg/L"}


def _timestamp(value):
    if not isinstance(value, str):
        raise ValueError("Timestamp must be an ISO-8601 string")

    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))

    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include timezone information")

    return parsed.astimezone(timezone.utc)


def validate_sensor_reading(
    reading,
    sensor_registry=None,
    calibration_profiles=None,
    now=None,
    stale_after_seconds=3600,
):
    if not isinstance(reading, dict):
        raise TypeError("reading must be a dictionary")

    registry = sensor_registry or {}
    calibrations = calibration_profiles or {}

    reasons = []
    flags = []

    source = reading.get("source")
    device_id = reading.get("device_id")
    reading_id = reading.get("id")

    simulated = source in SIMULATED_SOURCES
    synthetic = source in SYNTHETIC_SOURCES
    physical = source in PHYSICAL_SOURCES

    required = [
        "device_id",
        "tds_raw_avg",
        "water_level_raw_avg",
        "source",
        "received_at",
        "input_warning",
    ]

    missing = [
        field for field in required
        if field not in reading or reading[field] is None
    ]

    if missing:
        return build_validation_result(
            source_type=str(source or "unknown"),
            status="invalid",
            eligible_for_demo=False,
            eligible_for_operational_assessment=False,
            reasons=[f"Missing fields: {missing}"],
            quality_flags=["MISSING_REQUIRED_FIELDS"],
            provenance={"device_id": device_id},
        )

    if not isinstance(source, str) or not source.strip():
        reasons.append("Invalid source metadata.")

    for field in ("tds_raw_avg", "water_level_raw_avg"):
        value = reading[field]

        if (
            isinstance(value, bool)
            or not isinstance(value, int)
            or not 0 <= value <= 4095
        ):
            reasons.append(f"{field} must be an integer from 0 to 4095.")
            flags.append("INVALID_ADC_VALUE")

    for field in ("tds_voltage_est_v", "water_voltage_est_v"):
        value = reading.get(field)

        if value is not None and (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or not 0 <= value <= 3.3
        ):
            reasons.append(f"{field} must be between 0 and 3.3 V.")
            flags.append("INVALID_VOLTAGE")

    if not isinstance(reading["input_warning"], bool):
        reasons.append("input_warning must be boolean.")
        flags.append("INVALID_INPUT_WARNING")

    sensor = registry.get(device_id) if isinstance(device_id, str) else None

    if sensor is None:
        flags.append("UNREGISTERED_SENSOR")
        reasons.append("Sensor registration could not be verified.")
    else:
        registered_source = sensor.get("source")

        if registered_source and registered_source != source:
            reasons.append("Sensor source does not match registration.")
            flags.append("SOURCE_REGISTRY_MISMATCH")

    location_id = (
        sensor.get("location_id") if sensor else None
    ) or reading.get("location_id")

    if not location_id:
        flags.append("MISSING_LOCATION_ASSOCIATION")
        reasons.append("Sensor has no verified location association.")

    if reading["input_warning"] is True:
        flags.append("SENSOR_INPUT_WARNING")
        reasons.append("Sensor input warning is active.")

    timestamp = None

    try:
        timestamp = _timestamp(reading["received_at"])
        reference_time = now or datetime.now(timezone.utc)

        if reference_time.tzinfo is None:
            raise ValueError("Reference time must be timezone-aware")

        reference_time = reference_time.astimezone(timezone.utc)

        if timestamp > reference_time:
            reasons.append("Reading timestamp is in the future.")
            flags.append("FUTURE_TIMESTAMP")
        elif (reference_time - timestamp).total_seconds() > stale_after_seconds:
            reasons.append("Reading is stale.")
            flags.append("STALE_READING")

    except (ValueError, TypeError, AttributeError):
        reasons.append("Timestamp is invalid or lacks timezone.")
        flags.append("INVALID_TIMESTAMP")

    if reading.get("tds_raw_avg") in (0, 4095):
        flags.append("ADC_BOUNDARY_VALUE")

    # Raw ADC is never treated as calibrated TDS.
    calibration_id = reading.get("calibration_profile_id")
    calibration = calibrations.get(calibration_id)

    conversion_eligible = False

    if calibration_id:
        unit = calibration.get("unit") if calibration else None

        if not calibration or calibration.get("validated") is not True:
            flags.append("CALIBRATION_NOT_VALIDATED")
            reasons.append("Calibration profile is missing or unvalidated.")
        elif unit not in VALID_TDS_UNITS:
            flags.append("INVALID_TDS_UNIT")
            reasons.append("Calibration profile has an unsupported TDS unit.")
        elif reading.get("tds_calibrated_value") is None:
            flags.append("CALIBRATED_VALUE_MISSING")
        else:
            calibrated_value = reading["tds_calibrated_value"]

            if (
                isinstance(calibrated_value, bool)
                or not isinstance(calibrated_value, (int, float))
                or not math.isfinite(calibrated_value)
                or calibrated_value < 0
            ):
                flags.append("INVALID_CALIBRATED_VALUE")
            else:
                conversion_eligible = True

    else:
        flags.append("UNCALIBRATED_ADC")
        reasons.append("Raw ADC is not calibrated TDS.")

    if simulated:
        status = "simulated"
        flags.append("SIMULATED_SOURCE")
        reasons.append("Wokwi data is for demonstration only.")
    elif synthetic:
        status = "synthetic"
        flags.append("SYNTHETIC_SOURCE")
        reasons.append("Synthetic data is for testing only.")
    elif not physical:
        status = "review_required"
        flags.append("UNKNOWN_SOURCE")
        reasons.append("Physical sensor provenance is unverified.")
    elif not conversion_eligible:
        status = "review_required"
    else:
        status = "valid"

    if reasons and status == "valid":
        status = "review_required"

    if reasons_for_invalid_adc(reading) or any(
        "must be between 0 and 3.3 V" in r for r in reasons
    ):
        status = "invalid"

    if any(flag in flags for flag in (
        "INVALID_ADC_VALUE", "INVALID_VOLTAGE", "INVALID_INPUT_WARNING"
    )):
        status = "invalid"
    elif "FUTURE_TIMESTAMP" in flags or "INVALID_TIMESTAMP" in flags:
        status = "invalid"
    elif "STALE_READING" in flags:
        status = "stale"

    if not physical:
        conversion_eligible = False

    if (
        reasons
        or not physical
        or not sensor
        or not location_id
        or not conversion_eligible
    ):
        operational = False
    else:
        operational = True

    demo_eligible = (
        not missing
        and not any(
            flag in flags
            for flag in (
                "FUTURE_TIMESTAMP",
                "INVALID_TIMESTAMP",
                "ADC_BOUNDARY_VALUE",
                "INVALID_ADC_VALUE",
                "INVALID_VOLTAGE",
                "INVALID_INPUT_WARNING",
            )
        )
        and not reasons_for_invalid_adc(reading)
    )

    return build_validation_result(
        source_type=(
            "wokwi" if simulated else
            "synthetic" if synthetic else
            "esp32" if physical else
            "unknown"
        ),
        status=status,
        eligible_for_demo=demo_eligible,
        eligible_for_operational_assessment=operational,
        provenance={
            "reading_id": reading_id,
            "device_id": device_id,
            "location_id": location_id,
            "original_source": source,
            "calibration_profile_id": calibration_id,
            "received_at": reading.get("received_at"),
        },
        quality_flags=list(dict.fromkeys(flags)),
        reasons=list(dict.fromkeys(reasons)),
        details={
            "measurement_type": "raw_adc",
            "tds_unit": calibration.get("unit") if calibration else None,
            "conversion_eligible": conversion_eligible,
            "is_simulated": simulated,
            "is_synthetic": synthetic,
        },
    )


def reasons_for_invalid_adc(reading):
    for field in ("tds_raw_avg", "water_level_raw_avg"):
        value = reading.get(field)

        if (
            isinstance(value, bool)
            or not isinstance(value, int)
            or not 0 <= value <= 4095
        ):
            return True

    return False


def validate_sensor_batch(readings, **kwargs):
    if not isinstance(readings, list):
        raise TypeError("readings must be a list")

    results = [
        validate_sensor_reading(reading, **kwargs)
        for reading in readings
    ]

    return {
        "total": len(results),
        "demo_eligible": sum(r["eligible_for_demo"] for r in results),
        "operationally_eligible": sum(
            r["eligible_for_operational_assessment"] for r in results
        ),
        "readings": results,
    }
