"""Build traceable susceptibility evidence without inventing risk scores."""

from datetime import datetime
import math


def _number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    value = float(value)
    return value if math.isfinite(value) else None


def _parse_timestamp(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return None
        return parsed
    except ValueError:
        return None


def _head_trend(location_id, observations):
    """Estimate a descriptive trend only from comparable verified readings."""
    if not observations:
        return {
            "status": "insufficient_history",
            "observation_count": 0,
            "depth_change_m_per_year": None,
            "interpretation": "No historical series supplied.",
            "quality_flags": ["NO_GROUNDWATER_HISTORY"],
        }

    valid = []
    flags = []

    for item in observations:
        if item.get("location_id") != location_id:
            continue

        value = _number(item.get("groundwater_head_mbgl"))
        timestamp = _parse_timestamp(item.get("measured_at"))

        if value is None or timestamp is None:
            flags.append("INVALID_HEAD_OBSERVATION")
            continue

        if item.get("verification_status") != "verified_authority":
            flags.append("UNVERIFIED_HEAD_OBSERVATION")
            continue

        if item.get("is_synthetic") is True:
            flags.append("SYNTHETIC_HEAD_OBSERVATION")
            continue

        reference = item.get("measurement_reference")
        season = item.get("season_key")

        if not reference or not season:
            flags.append("MISSING_COMPARABILITY_METADATA")
            continue

        valid.append({
            "value": value,
            "timestamp": timestamp,
            "reference": reference,
            "season": season,
        })

    if len(valid) < 2:
        return {
            "status": "insufficient_history",
            "observation_count": len(valid),
            "depth_change_m_per_year": None,
            "interpretation": (
                "At least two verified, comparable observations are required."
            ),
            "quality_flags": list(dict.fromkeys(flags + [
                "INSUFFICIENT_COMPARABLE_OBSERVATIONS"
            ])),
        }

    references = {item["reference"] for item in valid}
    seasons = {item["season"] for item in valid}

    if len(references) != 1 or len(seasons) != 1:
        return {
            "status": "not_comparable",
            "observation_count": len(valid),
            "depth_change_m_per_year": None,
            "interpretation": (
                "Observations use different measurement references or seasons."
            ),
            "quality_flags": list(dict.fromkeys(flags + [
                "INCOMPARABLE_HEAD_OBSERVATIONS"
            ])),
        }

    valid.sort(key=lambda item: item["timestamp"])

    first = valid[0]
    last = valid[-1]
    elapsed_seconds = (
        last["timestamp"] - first["timestamp"]
    ).total_seconds()

    if elapsed_seconds <= 0:
        return {
            "status": "invalid_time_order",
            "observation_count": len(valid),
            "depth_change_m_per_year": None,
            "interpretation": "Observation timestamps are not distinct.",
            "quality_flags": list(dict.fromkeys(flags + [
                "NON_POSITIVE_TIME_INTERVAL"
            ])),
        }

    elapsed_years = elapsed_seconds / (365.2425 * 24 * 60 * 60)
    rate = (last["value"] - first["value"]) / elapsed_years

    if rate > 0:
        interpretation = (
            "Depth below ground increased; water level became deeper "
            "between the endpoint observations."
        )
    elif rate < 0:
        interpretation = (
            "Depth below ground decreased; water level became shallower "
            "between the endpoint observations."
        )
    else:
        interpretation = "No endpoint change in measured depth."

    return {
        "status": "descriptive_trend",
        "observation_count": len(valid),
        "first_observation_at": first["timestamp"].isoformat(),
        "last_observation_at": last["timestamp"].isoformat(),
        "depth_change_m_per_year": rate,
        "interpretation": interpretation,
        "quality_flags": list(dict.fromkeys(flags)),
        "classification": None,
        "risk_score": None,
    }


def extract_susceptibility_evidence(
    geospatial_evidence,
    groundwater_history=None,
):
    """
    Build a susceptibility evidence record.

    No weights, thresholds, probabilities, or risk scores are calculated.
    """
    if not isinstance(geospatial_evidence, dict):
        raise TypeError("geospatial_evidence must be a dictionary")

    location = geospatial_evidence.get("location") or {}
    location_id = location.get("location_id")

    if not location_id:
        raise ValueError("geospatial_evidence is missing location_id")

    head = geospatial_evidence.get("groundwater_head") or {}
    elevation = geospatial_evidence.get("elevation") or {}
    rainfall = geospatial_evidence.get("rainfall") or {}
    coastal = geospatial_evidence.get("coastal_distance") or {}

    elevation_values = elevation.get("values") or {}
    rainfall_values = rainfall.get("values") or {}

    location_distance = _number(coastal.get("value_m"))
    polygon_distance = _number(
        elevation_values.get("distance_to_coast_km")
    )
    elevation_m = _number(
        elevation_values.get("mean_elevation_msl_m")
    )

    terrain_available = (
        elevation.get("status") == "matched"
        and elevation.get("operational_eligible") is True
        and elevation_m is not None
    )

    rainfall_available = (
        rainfall.get("status") == "matched"
        and rainfall.get("operational_eligible") is True
        and bool(rainfall_values)
    )

    return {
        "schema_version": "1.0",
        "location_id": location_id,
        "groundwater": {
            "latest_observation_m_bgl": _number(head.get("value_m_bgl")),
            "measured_at": head.get("measured_at"),
            "source_verified": head.get("source_verified", False),
            "freshness_status": head.get(
                "freshness_status", "not_assessed"
            ),
            "trend": _head_trend(
                location_id, groundwater_history or []
            ),
            "risk_score": None,
        },
        "terrain": {
            "status": "context_available" if terrain_available else (
                elevation.get("status", "unavailable")
            ),
            "grid_ids": elevation.get("grid_ids", []),
            "mean_elevation_msl_m": elevation_m,
            "topographic_class": elevation.get("topographic_class"),
            "source_classification": elevation.get(
                "source_classification"
            ),
            "provenance": elevation.get("provenance", {}),
            "risk_score": None,
        },
        "recharge": {
            "status": "regional_context_available" if rainfall_available
            else rainfall.get("status", "unavailable"),
            "grid_ids": rainfall.get("grid_ids", []),
            "values": rainfall_values,
            "observation_period": rainfall.get("observation_period"),
            "provenance": rainfall.get("provenance", {}),
            "site_specific": False,
            "risk_score": None,
        },
        "coastal_proximity": {
            "location_distance_m": location_distance,
            "polygon_distance_km": polygon_distance,
            "reconciliation_status": "not_reconciled",
            "quality_flags": (
                ["DISTANCE_DEFINITIONS_REQUIRE_REVIEW"]
                if location_distance is not None
                and polygon_distance is not None
                else ["ONE_OR_MORE_DISTANCE_VALUES_UNAVAILABLE"]
            ),
            "risk_score": None,
        },
        "coverage": {
            "groundwater_observation_available": (
                _number(head.get("value_m_bgl")) is not None
            ),
            "groundwater_trend_available": (
                _head_trend(location_id, groundwater_history or [])[
                    "status"
                ] == "descriptive_trend"
            ),
            "terrain_context_available": terrain_available,
            "recharge_context_available": rainfall_available,
            "coastal_distance_available": (
                location_distance is not None
                or polygon_distance is not None
            ),
        },
        "interpretation": {
            "susceptibility_score": None,
            "intrusion_confirmed": False,
            "probability_estimated": False,
            "weights_applied": False,
        },
    }
