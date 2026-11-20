"""Generate explainable monitoring needs from the evidence inventory.

This module does not calculate risk, probabilities, or numeric priorities.
"""

from collections import defaultdict


def build_monitoring_needs(inventory):
    if not isinstance(inventory, dict):
        raise TypeError("inventory must be a dictionary")

    locations = inventory.get("locations")
    if not isinstance(locations, list):
        raise ValueError("inventory must contain a locations list")

    recommendations = []
    action_groups = defaultdict(list)

    def add(location_id, action, reason, details=None):
        item = {
            "location_id": location_id,
            "action": action,
            "reason": reason,
            "details": details or {},
        }
        recommendations.append(item)
        action_groups[action].append(location_id)

    for location in locations:
        location_id = location["location_id"]
        groundwater = location.get("groundwater") or {}
        layers = location.get("layers") or {}
        salinity = location.get("salinity") or {}

        # Groundwater observations
        head_value = groundwater.get("value_m_bgl")

        if head_value is None:
            add(
                location_id,
                "collect_groundwater_level",
                "No groundwater-level snapshot is available.",
                {"measurement": "depth_to_water", "unit": "m_bgl"},
            )
        elif groundwater.get("freshness_status") == "not_assessed":
            add(
                location_id,
                "verify_and_refresh_groundwater_observation",
                "A historical snapshot exists, but its freshness has not been assessed.",
                {"existing_measurement_date": groundwater.get("measured_at")},
            )

        trend = groundwater.get("trend") or {}
        if trend.get("status") != "descriptive_trend":
            add(
                location_id,
                "establish_comparable_groundwater_series",
                "A groundwater trend cannot be established from the available history.",
                {
                    "require_same_well": True,
                    "record_measurement_reference": True,
                    "record_season_key": True,
                    "minimum_comparable_observations": 2,
                },
            )

        # Direct salinity evidence
        ec = salinity.get("ec") or {}
        if ec.get("status") == "not_provided":
            add(
                location_id,
                "measure_electrical_conductivity",
                "No EC measurement is supplied for this location.",
                {
                    "record_water_temperature": True,
                    "record_calibration_status": True,
                    "standard_reference_temperature_c": 25,
                },
            )

        chloride = salinity.get("chloride") or {}
        if chloride.get("status") == "not_provided":
            add(
                location_id,
                "measure_chloride",
                "No chloride measurement is supplied for this location.",
                {"preferred_method": "documented_laboratory_analysis"},
            )

        tds = salinity.get("tds") or {}
        if tds.get("status") == "not_provided":
            add(
                location_id,
                "optional_direct_tds_follow_up",
                "No TDS measurement is supplied. Direct TDS is optional supporting evidence.",
                {
                    "optional": True,
                    "ec_derived_tds_is_not_independent": True,
                },
            )

        # Spatial evidence gaps
        rainfall = layers.get("rainfall") or {}
        if rainfall.get("status") == "unmatched":
            add(
                location_id,
                "review_rainfall_spatial_assignment",
                "No rainfall grid cell is assigned to this location.",
            )
        elif rainfall.get("status") == "ambiguous":
            add(
                location_id,
                "resolve_rainfall_spatial_assignment",
                "More than one rainfall grid cell matches this location.",
                {"candidate_grid_ids": rainfall.get("candidate_grid_ids", [])},
            )

        ndmi = layers.get("ndmi") or {}
        if ndmi.get("status") == "ambiguous":
            add(
                location_id,
                "resolve_ndmi_spatial_assignment",
                "Multiple NDMI grid cells match this location.",
                {"candidate_grid_ids": ndmi.get("candidate_grid_ids", [])},
            )
        elif ndmi.get("status") == "matched_excluded":
            add(
                location_id,
                "replace_simulated_ndmi_with_processed_imagery",
                "The matched NDMI layer is simulated and cannot be used as operational evidence.",
            )

    collection_actions = [
        {
            "action": action,
            "affected_location_ids": sorted(set(location_ids)),
            "affected_location_count": len(set(location_ids)),
        }
        for action, location_ids in sorted(action_groups.items())
    ]

    shared_cells = inventory.get("shared_grid_cells") or {}
    candidate_cells = inventory.get("ambiguous_grid_candidates") or {}

    shared_grid_review = {
        "shared_confirmed_cells": shared_cells,
        "ambiguous_candidate_cells": candidate_cells,
        "note": (
            "Shared cells identify common spatial evidence. "
            "They are not independent observations."
        ),
    }

    return {
        "schema_version": "1.0",
        "method": "transparent_rules_based_needs",
        "ranking_status": "not_ranked",
        "ranking_score": None,
        "location_recommendations": recommendations,
        "collection_actions": collection_actions,
        "shared_grid_review": shared_grid_review,
        "guardrails": {
            "risk_score_calculated": False,
            "probability_estimated": False,
            "numeric_priority_assigned": False,
            "simulated_data_accepted_as_operational": False,
            "ec_derived_tds_counted_as_independent": False,
        },
    }