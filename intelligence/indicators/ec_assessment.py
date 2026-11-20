"""Orchestrate EC measurement, baseline, and anomaly assessment."""

from intelligence.indicators.ec_measurement import (
    process_ec_measurement,
)
from intelligence.indicators.ec_baseline import (
    calculate_ec_baseline,
)
from intelligence.indicators.ec_anomaly import (
    calculate_ec_anomaly,
)


OPERATIONAL_SOURCES = {
    "physical_sensor",
    "laboratory",
    "public_dataset",
}


def assess_ec_evidence(
    current_measurement: dict,
    historical_observations: list[dict],
    season_key: str,
    minimum_observations: int = 5,
    force_simulated: bool = False,
) -> dict:
    """
    Produce EC salinity evidence for one location.

    Historical observations must already be processed EC measurements
    enriched with an explicit season_key.

    The current observation is deliberately excluded from its baseline.
    """

    if not isinstance(historical_observations, list):
        raise TypeError("historical_observations must be a list")

    if not isinstance(season_key, str) or not season_key.strip():
        raise ValueError("season_key must be a non-empty string")

    if not isinstance(force_simulated, bool):
        raise ValueError("force_simulated must be a boolean")

    current = process_ec_measurement(current_measurement)

    location_id = current["location_id"]

    # Do not silently combine observations from another location.
    if any(
        isinstance(item, dict)
        and item.get("location_id") != location_id
        for item in historical_observations
    ):
        raise ValueError(
            "Historical observations must belong to the current location"
        )

    baseline = calculate_ec_baseline(
        observations=historical_observations,
        location_id=location_id,
        season_key=season_key,
        minimum_observations=minimum_observations,
    )

    simulated = (
        force_simulated
        or current["is_simulated"]
    )

    operationally_eligible = (
        not simulated
        and current["source_type"] in OPERATIONAL_SOURCES
        and current["calibration_status"] == "verified"
        and current["ec25_uS_cm"] is not None
    )

    if simulated:
        anomaly = {
            "anomaly_status": "not_assessed_simulated",
            "direction": "unknown",
            "percentage_deviation": None,
            "robust_z_score": None,
            "reason": (
                "Simulated observations cannot generate "
                "operational anomaly conclusions."
            ),
        }

        assessment_status = "simulated_only"

    elif not operationally_eligible:
        anomaly = {
            "anomaly_status": "not_assessed",
            "direction": "unknown",
            "percentage_deviation": None,
            "robust_z_score": None,
            "reason": (
                "The current measurement is not eligible for "
                "operational assessment. Check calibration, provenance, "
                "and EC25 availability."
            ),
        }

        assessment_status = "measurement_not_eligible"

    elif baseline["baseline_status"] != "calculated":
        anomaly = {
            "anomaly_status": "baseline_unavailable",
            "direction": "unknown",
            "percentage_deviation": None,
            "robust_z_score": None,
            "reason": baseline.get("reason"),
        }

        assessment_status = "baseline_unavailable"

    else:
        anomaly = calculate_ec_anomaly(
            current_ec25_uS_cm=current["ec25_uS_cm"],
            baseline=baseline,
        )

        assessment_status = "assessed"

    return {
        "location_id": location_id,
        "evidence_type": "electrical_conductivity",
        "assessment_status": assessment_status,
        "operationally_eligible": operationally_eligible,
        "is_simulated": simulated,
        "current_measurement": current,
        "baseline": baseline,
        "anomaly": anomaly,
        "interpretation": (
            "EC indicates dissolved ionic conductivity. An elevated "
            "EC anomaly is salinity-related evidence, not proof of "
            "seawater intrusion."
        ),
    }
