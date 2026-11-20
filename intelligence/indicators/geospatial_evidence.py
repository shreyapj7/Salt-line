"""Extract traceable geospatial evidence without calculating risk scores."""

import math


SCHEMA_VERSION = "1.0"

ELEVATION_FIELDS = (
    "mean_elevation_msl_m",
    "distance_to_coast_km",
    "topographic_class",
    "coastal_salinity_susceptibility",
)

RAINFALL_FIELDS = (
    "annual_normal_mm",
    "dry_season_normal_mm",
    "dry_season_observed_mm",
    "recharge_deficit_pct",
)

PROVENANCE_FIELDS = (
    "source",
    "source_type",
    "data_status",
    "source_document",
    "source_url",
    "acquisition_date",
    "last_updated",
)


def _finite_number(value):
    """Return a finite float, or None for missing/invalid values."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None

    value = float(value)
    return value if math.isfinite(value) else None


def _extract_fields(properties, fields):
    """Extract known fields while preserving their original values."""
    return {
        field: properties.get(field)
        for field in fields
        if field in properties
    }


def _layer_evidence(layer):
    """Classify a spatial match without silently accepting ambiguity."""
    layer = layer or {}
    matches = layer.get("matches") or []
    reported_count = layer.get("match_count")

    actual_count = len(matches)
    flags = []

    if reported_count is not None and reported_count != actual_count:
        flags.append("MATCH_COUNT_MISMATCH")

    if actual_count == 0:
        return {
            "status": "unmatched",
            "match_count": actual_count,
            "operational_eligible": False,
            "grid_ids": [],
            "properties": None,
            "provenance": {},
            "quality_flags": flags + ["NO_SPATIAL_MATCH"],
        }

    if actual_count > 1:
        return {
            "status": "ambiguous",
            "match_count": actual_count,
            "operational_eligible": False,
            "grid_ids": [
                (m.get("properties") or {}).get("grid_id")
                for m in matches
            ],
            "properties": None,
            "provenance": {},
            "quality_flags": flags + ["MULTIPLE_SPATIAL_MATCHES"],
        }

    match = matches[0]
    properties = match.get("properties") or {}
    evidence_class = match.get("evidence_class")

    simulated = (
        evidence_class == "simulation_only"
        or properties.get("source_type") == "simulated_demo"
        or properties.get("data_status") == "simulated_demo"
    )

    if simulated:
        flags.append("SIMULATED_LAYER")

    if not isinstance(properties, dict):
        properties = {}
        flags.append("INVALID_PROPERTIES")

    provenance = {
        field: properties[field]
        for field in PROVENANCE_FIELDS
        if properties.get(field) is not None
    }

    return {
        "status": "matched",
        "match_count": 1,
        "operational_eligible": not simulated and not flags,
        "grid_ids": [properties.get("grid_id")],
        "properties": properties,
        "provenance": provenance,
        "quality_flags": flags,
    }


def extract_geospatial_evidence(assessment):
    """
    Convert one geospatial assessment into structured evidence.

    This function does not normalize indicators, infer trends,
    calculate risk, or interpret salinity.
    """
    if not isinstance(assessment, dict):
        raise TypeError("assessment must be a dictionary")

    gis = assessment.get("gis") or {}

    location_id = assessment.get("location_id")
    if not location_id:
        raise ValueError("assessment is missing location_id")

    is_synthetic = assessment.get("location_is_synthetic") is True
    verification_status = assessment.get("verification_status")
    source_type = assessment.get("source_type")

    head = _finite_number(assessment.get("groundwater_head_mbgl"))
    head_timestamp = assessment.get("last_measured_at")

    if head is None:
        head_status = "unavailable"
        head_flags = ["GROUNDWATER_HEAD_MISSING_OR_INVALID"]
    else:
        head_status = "available"
        head_flags = []

    if is_synthetic:
        head_flags.append("SYNTHETIC_LOCATION")

    # A single head reading is a snapshot, never a groundwater trend.
    source_verified = verification_status == "verified_authority"
    measurement_available = head is not None
    freshness_status = "not_assessed"

    head_eligible = (
        measurement_available
        and bool(head_timestamp)
        and source_verified
        and not is_synthetic
        and freshness_status != "not_assessed"
    )   

    if head is not None and not head_timestamp:
        head_flags.append("GROUNDWATER_HEAD_TIMESTAMP_MISSING")

    if head is not None and verification_status != "verified_authority":
        head_flags.append("GROUNDWATER_HEAD_PROVENANCE_NOT_AUTHORITY_VERIFIED")

    distance = _finite_number(assessment.get("distance_to_coast_m"))

    elevation = _layer_evidence(gis.get("elevation"))
    rainfall = _layer_evidence(gis.get("rainfall"))
    ndmi = _layer_evidence(gis.get("ndmi"))

    elevation_properties = elevation["properties"] or {}
    rainfall_properties = rainfall["properties"] or {}

    elevation_values = _extract_fields(
        elevation_properties, ELEVATION_FIELDS
    )
    rainfall_values = _extract_fields(
        rainfall_properties, RAINFALL_FIELDS
    )

    # Numeric fields are parsed only when valid. Raw properties remain
    # available in the layer records for audit and later validation.
    elevation_numeric = {
        key: _finite_number(value)
        for key, value in elevation_values.items()
        if key != "topographic_class"
    }

    rainfall_numeric = {
        key: _finite_number(value)
        for key, value in rainfall_values.items()
    }

    return {
        "schema_version": SCHEMA_VERSION,
        "location": {
            "location_id": location_id,
            "name": assessment.get("name"),
            "latitude": _finite_number(assessment.get("latitude")),
            "longitude": _finite_number(assessment.get("longitude")),
            "well_type": assessment.get("well_type"),
            "is_monitoring_station": assessment.get(
                "is_monitoring_station"
            ),
            "is_synthetic": is_synthetic,
            "source_type": source_type,
            "verification_status": verification_status,
        },
        "groundwater_head": {
            "value_m_bgl": head,
            "measured_at": head_timestamp,
            "status": head_status,
            "operational_eligible": head_eligible,
            "source_verified": source_verified,
            "measurement_available": measurement_available,
            "freshness_status": freshness_status,
            "trend_available": False,
            "quality_flags": head_flags,
            "source_document": assessment.get("source_document"),
            "source_url": assessment.get("source_url"),
        },
        "coastal_distance": {
            "value_m": distance,
            "status": "available" if distance is not None else "unavailable",
            "quality_flags": (
                [] if distance is not None
                else ["COASTAL_DISTANCE_MISSING_OR_INVALID"]
            ),
        },
        "elevation": {
            **elevation,
            "values": elevation_numeric,
            "topographic_class": elevation_values.get("topographic_class"),
            "source_classification": _finite_number(
                elevation_properties.get("coastal_salinity_susceptibility")
            ),
        },
        "rainfall": {
            **rainfall,
            "values": rainfall_numeric,
            "observation_period": rainfall_properties.get(
                "observation_period"
            ),
        },
        "ndmi": {
            **ndmi,
            "operational_eligible": False,
            "note": "Environmental context only; not direct salinity evidence.",
        },
        "interpretation": {
            "risk_score_calculated": False,
            "salinity_confirmed": False,
            "groundwater_trend_inferred": False,
        },
    }
