"""Read-only inventory of SALT-LINE evidence and spatial coverage."""

from collections import defaultdict

from intelligence.indicators.geospatial_evidence import (
    extract_geospatial_evidence,
)
from intelligence.indicators.susceptibility_evidence import (
    extract_susceptibility_evidence,
)


LAYERS = ("elevation", "rainfall", "ndmi")
SALINITY_TYPES = ("ec", "chloride", "tds")


def _layer_record(evidence, layer_name):
    layer = evidence.get(layer_name) or {}
    status = layer.get("status", "unavailable")
    eligible = layer.get("operational_eligible") is True

    if status == "matched" and eligible:
        inventory_status = "matched_operational"
    elif status == "matched":
        inventory_status = "matched_excluded"
    else:
        inventory_status = status

    raw_grid_ids = [
        grid_id for grid_id in (layer.get("grid_ids") or [])
        if isinstance(grid_id, str) and grid_id
    ]

    return {
        "status": inventory_status,
        "match_count": layer.get("match_count", 0),
        "grid_ids": (
            raw_grid_ids if status == "matched" else []
        ),
        "candidate_grid_ids": (
            raw_grid_ids if status == "ambiguous" else []
        ),
        "quality_flags": list(layer.get("quality_flags") or []),
        "source": (layer.get("provenance") or {}).get("source"),
        "data_status": (layer.get("provenance") or {}).get("data_status"),
    }


def _salinity_record(location_id, supplied):
    supplied = supplied or {}
    result = {}

    for measurement_type in SALINITY_TYPES:
        record = supplied.get(measurement_type)

        if not isinstance(record, dict):
            result[measurement_type] = {
                "status": "not_provided",
                "independent_evidence": None,
            }
            continue

        status = record.get("status", "status_not_specified")
        independent = record.get("independent_evidence")

        if measurement_type == "tds" and record.get("method") == "ec_estimate":
            independent = False

        result[measurement_type] = {
            "status": status,
            "independent_evidence": independent,
        }

    return result


def _gap_reasons(groundwater, layers, salinity):
    gaps = []

    if groundwater.get("measurement_available"):
        if groundwater.get("freshness_status") == "not_assessed":
            gaps.append("GROUNDWATER_FRESHNESS_NOT_ASSESSED")
        if not groundwater.get("source_verified"):
            gaps.append("GROUNDWATER_SOURCE_NOT_AUTHORITY_VERIFIED")   

    if groundwater.get("freshness_status") == "not_assessed":
        gaps.append("GROUNDWATER_FRESHNESS_NOT_ASSESSED")

    if not groundwater.get("trend_available"):
        gaps.append("GROUNDWATER_TREND_UNAVAILABLE")

    for layer_name, layer in layers.items():
        if layer["status"] == "unmatched":
            gaps.append(f"{layer_name.upper()}_SPATIAL_MATCH_MISSING")
        elif layer["status"] == "ambiguous":
            gaps.append(f"{layer_name.upper()}_SPATIAL_MATCH_AMBIGUOUS")
        elif layer["status"] == "matched_excluded":
            gaps.append(f"{layer_name.upper()}_EVIDENCE_EXCLUDED")

    for measurement_type, record in salinity.items():
        if record["status"] == "not_provided":
            gaps.append(f"{measurement_type.upper()}_MEASUREMENT_NOT_PROVIDED")

    return gaps


def _build_evidence_inventory_base(
    assessments,
    groundwater_history=None,
    salinity_evidence_by_location=None,
):
    if not isinstance(assessments, list):
        raise TypeError("assessments must be a list")

    if not assessments:
        raise ValueError("assessments must not be empty")

    groundwater_history = groundwater_history or []
    salinity_evidence_by_location = salinity_evidence_by_location or {}

    if not isinstance(groundwater_history, list):
        raise TypeError("groundwater_history must be a list")

    if not isinstance(salinity_evidence_by_location, dict):
        raise TypeError("salinity_evidence_by_location must be a dictionary")

    locations = []
    seen_ids = set()
    grid_usage = {
        layer_name: defaultdict(list) for layer_name in LAYERS
    }
    ambiguous_grid_candidates = {
        layer_name: defaultdict(list) for layer_name in LAYERS
    }   
    layer_counts = {
        layer_name: defaultdict(int) for layer_name in LAYERS
    }

    for assessment in assessments:
        geo = extract_geospatial_evidence(assessment)
        location = geo["location"]
        location_id = location["location_id"]

        if location_id in seen_ids:
            raise ValueError(f"Duplicate location_id: {location_id}")
        seen_ids.add(location_id)

        susceptibility = extract_susceptibility_evidence(
            geo,
            groundwater_history=groundwater_history,
        )

        layers = {
            name: _layer_record(geo, name)
            for name in LAYERS
        }

        for layer_name, layer in layers.items():
            layer_counts[layer_name][layer["status"]] += 1

            for grid_id in layer["grid_ids"]:
                grid_usage[layer_name][grid_id].append(location_id)

            for grid_id in layer["candidate_grid_ids"]:
                ambiguous_grid_candidates[layer_name][grid_id].append(
                    location_id
                )   

        groundwater = geo["groundwater_head"]
        groundwater["trend_available"] = (
            susceptibility["groundwater"]["trend"]["status"]
            == "descriptive_trend"
        )
        salinity = _salinity_record(
            location_id,
            salinity_evidence_by_location.get(location_id),
        )

        gaps = _gap_reasons(groundwater, layers, salinity)

        locations.append({
            "location_id": location_id,
            "name": location.get("name"),
            "coordinates": {
                "latitude": location.get("latitude"),
                "longitude": location.get("longitude"),
            },
            "well_type": location.get("well_type"),
            "is_monitoring_station": location.get("is_monitoring_station"),
            "groundwater": {
                "value_m_bgl": groundwater.get("value_m_bgl"),
                "measured_at": groundwater.get("measured_at"),
                "source_verified": groundwater.get("source_verified"),
                "freshness_status": groundwater.get("freshness_status"),
                "trend": susceptibility["groundwater"]["trend"],
            },
            "layers": layers,
            "terrain": susceptibility["terrain"],
            "recharge": susceptibility["recharge"],
            "coastal_proximity": susceptibility["coastal_proximity"],
            "salinity": salinity,
            "data_gaps": gaps,
        })

    shared_grid_cells = {}
    for layer_name, cells in grid_usage.items():
        shared_grid_cells[layer_name] = {
            grid_id: sorted(location_ids)
            for grid_id, location_ids in sorted(cells.items())
            if len(location_ids) > 1
        }

    grid_usage_summary = {
        layer_name: {
            "unique_grid_count": len(cells),
            "grid_location_counts": {
                grid_id: len(location_ids)
                for grid_id, location_ids in sorted(cells.items())
            },
        }
        for layer_name, cells in grid_usage.items()
    }

    return {
        "schema_version": "1.0",
        "inventory_type": "descriptive_evidence_inventory",
        "location_count": len(locations),
        "layer_counts": {
            layer_name: dict(counts)
            for layer_name, counts in layer_counts.items()
        },
        "grid_usage": grid_usage_summary,
        "shared_grid_cells": shared_grid_cells,
        "ambiguous_grid_candidates": {
            layer_name: {
                grid_id: sorted(location_ids)
                for grid_id, location_ids in sorted(cells.items())
            }
            for layer_name, cells in ambiguous_grid_candidates.items()
        },   
        "salinity_coverage": {
            measurement_type: {
                "provided": sum(
                    item["salinity"][measurement_type]["status"]
                    != "not_provided"
                    for item in locations
                ),
                "not_provided": sum(
                    item["salinity"][measurement_type]["status"]
                    == "not_provided"
                    for item in locations
                ),
            }
            for measurement_type in SALINITY_TYPES
        },
        "locations": locations,
        "guardrails": {
            "risk_score_calculated": False,
            "probability_estimated": False,
            "monitoring_priority_calculated": False,
            "simulated_evidence_counted_as_operational": False,
            "shared_grid_cells_treated_as_independent": False,
        },
    }


def build_evidence_inventory(
    assessments,
    groundwater_history=None,
    salinity_evidence_by_location=None,
):
    """Build the evidence inventory and attach adaptive monitoring needs."""

    inventory = _build_evidence_inventory_base(
        assessments,
        groundwater_history=groundwater_history,
        salinity_evidence_by_location=salinity_evidence_by_location,
    )

    from intelligence.adaptive_monitoring_inputs import (
        build_monitoring_needs,
    )

    inventory["monitoring_needs"] = build_monitoring_needs(inventory)

    return inventory
