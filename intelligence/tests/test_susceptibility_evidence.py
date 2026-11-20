import pytest

from intelligence.indicators.susceptibility_evidence import (
    extract_susceptibility_evidence,
)


def make_evidence():
    return {
        "location": {"location_id": "well_01"},
        "groundwater_head": {
            "value_m_bgl": 4.82,
            "measured_at": "2024-05-15T10:30:00Z",
            "source_verified": True,
            "freshness_status": "not_assessed",
        },
        "elevation": {
            "status": "matched",
            "operational_eligible": True,
            "grid_ids": ["elev_cell_036"],
            "values": {
                "mean_elevation_msl_m": 1.9,
                "distance_to_coast_km": 0.1,
            },
            "topographic_class": "Coastal Lowland (<3m MSL)",
            "source_classification": "CRITICAL_LOW_ELEVATION",
            "provenance": {"source": "SRTM"},
        },
        "rainfall": {
            "status": "matched",
            "operational_eligible": True,
            "grid_ids": ["rain_cell_007"],
            "values": {"recharge_deficit_pct": -66.6},
            "observation_period": "Jan-Apr 2024-2026",
            "provenance": {"source": "IMD"},
        },
        "coastal_distance": {"value_m": 380.0},
    }


def history():
    return [
        {
            "location_id": "well_01",
            "groundwater_head_mbgl": 4.0,
            "measured_at": "2023-05-15T10:00:00Z",
            "verification_status": "verified_authority",
            "is_synthetic": False,
            "measurement_reference": "ground_level",
            "season_key": "pre_monsoon",
        },
        {
            "location_id": "well_01",
            "groundwater_head_mbgl": 5.0,
            "measured_at": "2024-05-15T10:00:00Z",
            "verification_status": "verified_authority",
            "is_synthetic": False,
            "measurement_reference": "ground_level",
            "season_key": "pre_monsoon",
        },
    ]


def test_extracts_terrain_context():
    result = extract_susceptibility_evidence(make_evidence())

    assert result["terrain"]["mean_elevation_msl_m"] == 1.9
    assert result["terrain"]["source_classification"] == (
        "CRITICAL_LOW_ELEVATION"
    )
    assert result["terrain"]["grid_ids"] == ["elev_cell_036"]


def test_rainfall_is_regional_context_not_site_specific():
    result = extract_susceptibility_evidence(make_evidence())

    assert result["recharge"]["site_specific"] is False
    assert result["recharge"]["values"]["recharge_deficit_pct"] == -66.6
    assert result["recharge"]["observation_period"] == "Jan-Apr 2024-2026"


def test_keeps_coastal_distance_sources_separate():
    result = extract_susceptibility_evidence(make_evidence())

    assert result["coastal_proximity"]["location_distance_m"] == 380.0
    assert result["coastal_proximity"]["polygon_distance_km"] == 0.1
    assert result["coastal_proximity"]["reconciliation_status"] == (
        "not_reconciled"
    )


def test_no_history_means_no_trend():
    result = extract_susceptibility_evidence(make_evidence())

    assert result["groundwater"]["trend"]["status"] == "insufficient_history"
    assert result["groundwater"]["trend"]["depth_change_m_per_year"] is None


def test_comparable_history_produces_descriptive_trend():
    result = extract_susceptibility_evidence(
        make_evidence(), groundwater_history=history()
    )

    trend = result["groundwater"]["trend"]
    assert trend["status"] == "descriptive_trend"
    assert trend["depth_change_m_per_year"] > 0
    assert trend["classification"] is None
    assert trend["risk_score"] is None


def test_different_seasons_are_not_compared():
    observations = history()
    observations[1]["season_key"] = "post_monsoon"

    result = extract_susceptibility_evidence(
        make_evidence(), groundwater_history=observations
    )

    assert result["groundwater"]["trend"]["status"] == "not_comparable"


def test_unverified_history_is_excluded():
    observations = history()
    observations[1]["verification_status"] = "unverified_community"

    result = extract_susceptibility_evidence(
        make_evidence(), groundwater_history=observations
    )

    assert result["groundwater"]["trend"]["status"] == (
        "insufficient_history"
    )


def test_simulated_history_is_excluded():
    observations = history()
    observations[1]["is_synthetic"] = True

    result = extract_susceptibility_evidence(
        make_evidence(), groundwater_history=observations
    )

    assert result["groundwater"]["trend"]["status"] == (
        "insufficient_history"
    )


def test_missing_comparability_metadata_blocks_trend():
    observations = history()
    observations[0]["measurement_reference"] = None

    result = extract_susceptibility_evidence(
        make_evidence(), groundwater_history=observations
    )

    assert result["groundwater"]["trend"]["status"] == (
        "insufficient_history"
    )


def test_no_risk_score_or_probability_is_created():
    result = extract_susceptibility_evidence(make_evidence())

    assert result["interpretation"]["susceptibility_score"] is None
    assert result["interpretation"]["intrusion_confirmed"] is False
    assert result["interpretation"]["probability_estimated"] is False


def test_invalid_input_raises():
    with pytest.raises(TypeError):
        extract_susceptibility_evidence(None)


def test_missing_location_id_raises():
    with pytest.raises(ValueError):
        extract_susceptibility_evidence({"location": {}})
