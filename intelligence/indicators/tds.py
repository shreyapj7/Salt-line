"""TDS measurement validation and provenance."""

from datetime import datetime
import math


UNIT_FACTORS = {
    "mg/L": 1.0,
    "g/L": 1000.0,
}

ALLOWED_SOURCES = {
    "physical_sensor",
    "laboratory",
    "public_dataset",
    "simulation",
}

ALLOWED_METHODS = {
    "direct_measurement",
    "ec_estimate",
}


def process_tds_measurement(measurement):
    """Normalize TDS to mg/L without treating EC estimates as independent."""

    if not isinstance(measurement, dict):
        raise TypeError("measurement must be a dictionary")

    location_id = measurement.get("location_id")
    if not isinstance(location_id, str) or not location_id.strip():
        raise ValueError("location_id must be non-empty")

    value = measurement.get("value")

    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or value <= 0
    ):
        raise ValueError("TDS value must be finite and positive")

    unit = measurement.get("unit")
    if unit not in UNIT_FACTORS:
        raise ValueError("Unsupported TDS unit")

    source = measurement.get("source_type")
    if source not in ALLOWED_SOURCES:
        raise ValueError("Invalid source_type")

    method = measurement.get("method")
    if method not in ALLOWED_METHODS:
        raise ValueError("Invalid TDS method")

    timestamp = measurement.get("timestamp")

    if not isinstance(timestamp, str):
        raise ValueError("Invalid timestamp")

    try:
        parsed = datetime.fromisoformat(
            timestamp.replace("Z", "+00:00")
        )
        if parsed.tzinfo is None or parsed.utcoffset() is None:
            raise ValueError("Timestamp must include timezone")
    except ValueError as exc:
        raise ValueError("Invalid timezone-aware timestamp") from exc

    calibration = measurement.get("calibration_status", "unknown")

    if calibration not in {
        "verified", "unverified", "expired",
        "not_applicable", "unknown",
    }:
        raise ValueError("Invalid calibration_status")

    ec_source = measurement.get("ec_source_id")

    if method == "ec_estimate":
        if not isinstance(ec_source, str) or not ec_source.strip():
            raise ValueError(
                "EC-derived TDS requires an EC source identifier"
            )

    return {
        "location_id": location_id,
        "parameter": "total_dissolved_solids",
        "tds_mg_l": round(value * UNIT_FACTORS[unit], 6),
        "raw_value": float(value),
        "raw_unit": unit,
        "source_type": source,
        "method": method,
        "is_simulated": source == "simulation",
        "calibration_status": calibration,
        "timestamp": timestamp,
        "ec_source_id": ec_source,
        "independent_evidence": method == "direct_measurement",
        "quality_flags": (
            ["derived_from_ec_not_independent"]
            if method == "ec_estimate"
            else []
        ),
    }


def assess_tds_evidence(measurement, force_simulated=False):
    """Classify TDS evidence without diagnosing intrusion."""

    if not isinstance(force_simulated, bool):
        raise ValueError("force_simulated must be boolean")

    result = process_tds_measurement(measurement)

    simulated = force_simulated or result["is_simulated"]

    eligible = (
        not simulated
        and result["source_type"] in {
            "physical_sensor", "laboratory", "public_dataset"
        }
        and result["calibration_status"] == "verified"
    )

    if simulated:
        status = "simulated_only"
    elif not eligible:
        status = "measurement_not_eligible"
    elif result["method"] == "ec_estimate":
        status = "derived_estimate"
    else:
        status = "measured"

    return {
        "location_id": result["location_id"],
        "evidence_type": "tds",
        "assessment_status": status,
        "operationally_eligible": eligible,
        "is_simulated": simulated,
        "measurement": result,
        "interpretation": (
            "TDS describes dissolved solids. EC-derived TDS is not "
            "independent evidence from EC and must not be counted twice."
        ),
    }
