import pytest

from intelligence.adaptive_monitoring_inputs import build_monitoring_needs


def make_inventory():
    return {
        "locations": [
            {
                "location_id": "loc_1",
                "groundwater": {
                    "value_m_bgl": 4.8,
                    "measured_at": "2024-05-15T10:30:00Z",
                    "freshness_status": "not_assessed",
                    "trend": {"status": "insufficient_history"},
                },
                "layers": {
                    "rainfall": {"status": "matched_operational"},
                    "ndmi": {"status": "matched_excluded"},
                },
                "salinity": {
                    "ec": {"status": "not_provided"},
                    "chloride": {"status": "not_provided"},
                    "tds": {"status": "not_provided"},
                },
            },
            {
                "location_id": "loc_2",
                "groundwater": {
                    "value_m_bgl": None,
                    "freshness_status": "not_assessed",
                    "trend": {"status": "insufficient_history"},
                },
                "layers": {
                    "rainfall": {"status": "unmatched"},
                    "ndmi": {
                        "status": "ambiguous",
                        "candidate_grid_ids": ["ndmi_1", "ndmi_2"],
                    },
                },
                "salinity": {
                    "ec": {"status": "not_provided"},
                    "chloride": {"status": "not_provided"},
                    "tds": {"status": "not_provided"},
                },
            },
        ],
        "shared_grid_cells": {"elevation": {"elev_1": ["loc_1", "loc_2"]}},
        "ambiguous_grid_candidates": {"ndmi": {"ndmi_1": ["loc_2"]}},
    }


def test_generates_location_specific_recommendations():
    result = build_monitoring_needs(make_inventory())

    actions = {
        item["action"]
        for item in result["location_recommendations"]
        if item["location_id"] == "loc_1"
    }

    assert "verify_and_refresh_groundwater_observation" in actions
    assert "measure_electrical_conductivity" in actions
    assert "measure_chloride" in actions


def test_missing_groundwater_gets_collection_recommendation():
    result = build_monitoring_needs(make_inventory())

    actions = {
        item["action"]
        for item in result["location_recommendations"]
        if item["location_id"] == "loc_2"
    }

    assert "collect_groundwater_level" in actions
    assert "establish_comparable_groundwater_series" in actions


def test_ambiguous_spatial_matches_are_not_treated_as_confirmed():
    result = build_monitoring_needs(make_inventory())

    recommendation = next(
        item for item in result["location_recommendations"]
        if item["action"] == "resolve_ndmi_spatial_assignment"
    )

    assert recommendation["details"]["candidate_grid_ids"] == [
        "ndmi_1", "ndmi_2"
    ]


def test_collection_actions_deduplicate_locations():
    result = build_monitoring_needs(make_inventory())

    ec_action = next(
        item for item in result["collection_actions"]
        if item["action"] == "measure_electrical_conductivity"
    )

    assert ec_action["affected_location_count"] == 2
    assert ec_action["affected_location_ids"] == ["loc_1", "loc_2"]


def test_no_numeric_ranking_or_risk_score_is_created():
    result = build_monitoring_needs(make_inventory())

    assert result["ranking_status"] == "not_ranked"
    assert result["ranking_score"] is None
    assert result["guardrails"]["risk_score_calculated"] is False


def test_invalid_inventory_is_rejected():
    with pytest.raises(ValueError):
        build_monitoring_needs({})
