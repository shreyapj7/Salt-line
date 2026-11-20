"""Location-specific, seasonally comparable EC baselines."""

from datetime import datetime
import math
import statistics


ALLOWED_SOURCES = {
    "physical_sensor",
    "laboratory",
    "public_dataset",
}


def _valid_timestamp(value):
    if not isinstance(value, str):
        return False

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.tzinfo is not None and parsed.utcoffset() is not None
    except ValueError:
        return False


def _valid_ec(value):
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and value > 0
    )


def calculate_ec_baseline(
    observations: list[dict],
    location_id: str,
    season_key: str,
    minimum_observations: int = 5,
) -> dict:
    """Calculate a baseline from verified, real EC25 observations.

    season_key must be assigned using an explicit local seasonal policy.
    Synthetic and unverified observations are never eligible.
    """

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
        raise ValueError("minimum_observations must be an integer >= 3")

    eligible = []
    excluded = {
        "wrong_location": 0,
        "wrong_season": 0,
        "simulated_or_unsupported_source": 0,
        "unverified_calibration": 0,
        "invalid_measurement": 0,
    }

    for item in observations:
        if not isinstance(item, dict):
            excluded["invalid_measurement"] += 1
            continue

        if item.get("location_id") != location_id:
            excluded["wrong_location"] += 1
            continue

        if item.get("season_key") != season_key:
            excluded["wrong_season"] += 1
            continue

        source = item.get("source_type")

        if source not in ALLOWED_SOURCES:
            excluded["simulated_or_unsupported_source"] += 1
            continue

        calibration = item.get("calibration_status")

        if calibration != "verified":
            excluded["unverified_calibration"] += 1
            continue

        ec25 = item.get("ec25_uS_cm")

        if (
            not _valid_ec(ec25)
            or not _valid_timestamp(item.get("timestamp"))
        ):
            excluded["invalid_measurement"] += 1
            continue

        eligible.append(float(ec25))

    base_result = {
        "location_id": location_id,
        "season_key": season_key,
        "reference_temperature_c": 25.0,
        "sample_count": len(eligible),
        "minimum_observations": minimum_observations,
        "excluded_observations": excluded,
        "baseline_status": "unavailable",
    }

    if len(eligible) < minimum_observations:
        base_result["reason"] = (
            "Insufficient verified, seasonally comparable EC history"
        )
        return base_result

    log_values = [math.log(value) for value in eligible]
    median_log = statistics.median(log_values)
    log_mad = statistics.median(
        abs(value - median_log) for value in log_values
    )

    return {
        **base_result,
        "baseline_status": "calculated",
        "baseline_ec25_uS_cm": round(statistics.median(eligible), 6),
        "median_log_ec": median_log,
        "log_mad": log_mad,
        "baseline_method": "median",
        "dispersion_method": "median_absolute_deviation",
        "reason": None,
    }
