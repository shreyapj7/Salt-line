"""Chloride measurement and salinity-evidence assessment."""

from datetime import datetime
import math
import statistics


CHLORIDE_MOLAR_MASS_G_MOL = 35.453

UNIT_FACTORS = {
    "mg/L": 1.0,
    "g/L": 1000.0,
    "mmol/L": CHLORIDE_MOLAR_MASS_G_MOL,
}

ALLOWED_SOURCES = {
    "physical_sensor",
    "laboratory",
    "public_dataset",
    "simulation",
}


def _valid_timestamp(value):
    if not isinstance(value, str):
        return False

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.tzinfo is not None and parsed.utcoffset() is not None
    except ValueError:
        return False


def _positive_number(value, field):
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or value <= 0
    ):
        raise ValueError(f"{field} must be finite and greater than zero")

    return float(value)


def process_chloride_measurement(measurement):
    """Normalize an exact chloride measurement to mg/L."""

    if not isinstance(measurement, dict):
        raise TypeError("measurement must be a dictionary")

    location_id = measurement.get("location_id")
    if not isinstance(location_id, str) or not location_id.strip():
        raise ValueError("location_id must be non-empty")

    value = _positive_number(measurement.get("value"), "value")

    unit = measurement.get("unit")
    if unit not in UNIT_FACTORS:
        raise ValueError(f"Unsupported chloride unit: {unit}")

    source = measurement.get("source_type")
    if source not in ALLOWED_SOURCES:
        raise ValueError("Invalid source_type")

    timestamp = measurement.get("timestamp")
    if not _valid_timestamp(timestamp):
        raise ValueError("timestamp must be timezone-aware ISO 8601")

    calibration = measurement.get("calibration_status", "unknown")
    if calibration not in {
        "verified", "unverified", "expired",
        "not_applicable", "unknown",
    }:
        raise ValueError("Invalid calibration_status")

    method = measurement.get("method", "unknown")
    if not isinstance(method, str) or not method.strip():
        raise ValueError("method must be a non-empty string")

    return {
        "location_id": location_id,
        "parameter": "chloride",
        "chloride_mg_l": round(value * UNIT_FACTORS[unit], 6),
        "raw_value": value,
        "raw_unit": unit,
        "source_type": source,
        "is_simulated": source == "simulation",
        "calibration_status": calibration,
        "method": method,
        "timestamp": timestamp,
        "quality_flags": [],
    }


def calculate_chloride_baseline(
    observations,
    location_id,
    season_key,
    minimum_observations=5,
):
    """Calculate a median baseline from verified observations."""

    if not isinstance(observations, list):
        raise TypeError("observations must be a list")

    if not isinstance(location_id, str) or not location_id.strip():
        raise ValueError("location_id must be non-empty")

    if not isinstance(season_key, str) or not season_key.strip():
        raise ValueError("season_key must be non-empty")

    if (
        isinstance(minimum_observations, bool)
        or not isinstance(minimum_observations, int)
        or minimum_observations < 3
    ):
        raise ValueError("minimum_observations must be >= 3")

    eligible = []
    excluded = 0

    for item in observations:
        if not isinstance(item, dict):
            excluded += 1
            continue

        valid = (
            item.get("location_id") == location_id
            and item.get("season_key") == season_key
            and item.get("source_type") in {
                "physical_sensor", "laboratory", "public_dataset"
            }
            and item.get("calibration_status") == "verified"
            and _valid_timestamp(item.get("timestamp"))
        )

        value = item.get("chloride_mg_l")

        valid = valid and (
            isinstance(value, (int, float))
            and not isinstance(value, bool)
            and math.isfinite(value)
            and value > 0
        )

        if valid:
            eligible.append(float(value))
        else:
            excluded += 1

    result = {
        "location_id": location_id,
        "season_key": season_key,
        "sample_count": len(eligible),
        "excluded_count": excluded,
        "minimum_observations": minimum_observations,
        "baseline_status": "unavailable",
    }

    if len(eligible) < minimum_observations:
        result["reason"] = "Insufficient verified seasonal history"
        return result

    logs = [math.log(value) for value in eligible]
    median_log = statistics.median(logs)
    log_mad = statistics.median(
        abs(value - median_log) for value in logs
    )

    return {
        **result,
        "baseline_status": "calculated",
        "baseline_chloride_mg_l": round(
            statistics.median(eligible), 6
        ),
        "median_log_chloride": median_log,
        "log_mad": log_mad,
        "method": "median_and_log_median_absolute_deviation",
        "reason": None,
    }


def calculate_chloride_anomaly(current_mg_l, baseline):
    """Compare current chloride with its validated seasonal baseline."""

    current = _positive_number(current_mg_l, "current_mg_l")

    if not isinstance(baseline, dict):
        raise TypeError("baseline must be a dictionary")

    if baseline.get("baseline_status") != "calculated":
        return {
            "anomaly_status": "baseline_unavailable",
            "direction": "unknown",
            "percentage_deviation": None,
            "robust_z_score": None,
            "reason": baseline.get("reason"),
        }

    median = baseline.get("baseline_chloride_mg_l")
    median_log = baseline.get("median_log_chloride")
    log_mad = baseline.get("log_mad")

    values = (median, median_log, log_mad)
    if any(
        isinstance(v, bool)
        or not isinstance(v, (int, float))
        or not math.isfinite(v)
        for v in values
    ):
        raise ValueError("Invalid baseline statistics")

    if median <= 0 or log_mad < 0:
        raise ValueError("Invalid baseline values")

    deviation = (current - median) / median * 100

    direction = (
        "increased" if current > median
        else "decreased" if current < median
        else "unchanged"
    )

    robust_z = (
        (math.log(current) - median_log) / (1.4826 * log_mad)
        if log_mad > 0 else None
    )

    return {
        "anomaly_status": "calculated",
        "chloride_mg_l": current,
        "baseline_chloride_mg_l": median,
        "percentage_deviation": round(deviation, 4),
        "robust_z_score": (
            round(robust_z, 4) if robust_z is not None else None
        ),
        "direction": direction,
        "dispersion_status": (
            "calculated" if log_mad > 0 else "zero_baseline_dispersion"
        ),
        "reason": None,
    }


def assess_chloride_evidence(
    current_measurement,
    historical_observations,
    season_key,
    minimum_observations=5,
    force_simulated=False,
):
    """Orchestrate chloride processing, baseline and anomaly."""

    if not isinstance(force_simulated, bool):
        raise ValueError("force_simulated must be boolean")

    current = process_chloride_measurement(current_measurement)

    if not isinstance(historical_observations, list):
        raise TypeError("historical_observations must be a list")

    location_id = current["location_id"]

    if any(
        isinstance(item, dict)
        and item.get("location_id") != location_id
        for item in historical_observations
    ):
        raise ValueError("Historical observations contain another location")

    baseline = calculate_chloride_baseline(
        historical_observations,
        location_id,
        season_key,
        minimum_observations,
    )

    simulated = force_simulated or current["is_simulated"]

    eligible = (
        not simulated
        and current["source_type"] in {
            "physical_sensor", "laboratory", "public_dataset"
        }
        and current["calibration_status"] == "verified"
    )

    if simulated:
        status = "simulated_only"
        anomaly = {
            "anomaly_status": "not_assessed_simulated",
            "direction": "unknown",
            "percentage_deviation": None,
            "robust_z_score": None,
        }

    elif not eligible:
        status = "measurement_not_eligible"
        anomaly = {
            "anomaly_status": "not_assessed",
            "direction": "unknown",
            "percentage_deviation": None,
            "robust_z_score": None,
        }

    elif baseline["baseline_status"] != "calculated":
        status = "baseline_unavailable"
        anomaly = {
            "anomaly_status": "baseline_unavailable",
            "direction": "unknown",
            "percentage_deviation": None,
            "robust_z_score": None,
        }

    else:
        status = "assessed"
        anomaly = calculate_chloride_anomaly(
            current["chloride_mg_l"], baseline
        )

    return {
        "location_id": location_id,
        "evidence_type": "chloride",
        "assessment_status": status,
        "operationally_eligible": eligible,
        "is_simulated": simulated,
        "current_measurement": current,
        "baseline": baseline,
        "anomaly": anomaly,
        "interpretation": (
            "Chloride is salinity-related chemical evidence. "
            "An elevated value or anomaly alone does not confirm "
            "seawater intrusion."
        ),
    }
