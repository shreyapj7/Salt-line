import pytest

from intelligence.indicators.geospatial_evidence import (
    extract_geospatial_evidence,
)


def make_assessment():
    return {
        "location_id": "WELL-001",
        "name": "Test well",
        "latitude": 13.0,
        "longitude": 74.8,
        "well_type": "observation_well",
        "source_type": "government_dataset",
        "verification_status": "verified_authority",
        "is_monitoring_station": True,
        "location_is_synthetic": False,
        "last_measured_at": "2024-05-15",
        "groundwater_head_mbgl": 4.82,
        "distance_to_coast_m": 380.0,
        "source_document": "Example source",
        "source_url": None,
        "gis": {
            "elevation": {
                "match_count": 1,
                "matches": [{
                    "evidence_class": "spatial_context",
                    "properties": {
                        "grid_id": "elev_cell_036",
                        "mean_elevation_msl_m": 3.5,
                        "distance_to_coast_km": 0.38,
                        "topographic_class": "low_lying",
                        "coastal_salinity_susceptibility": "CRITICAL_LOW_ELEVATION",
                        "source": "SRTM",
                    },
                }],
            },
            "rainfall": {
                "match_count": 1,
                "matches": [{
                    "evidence_class": "baseline_context",
                    "properties": {
                        "grid_id": "rain_cell_007",
                        "dry_season_normal_mm": 42.5,
                        "dry_season_observed_mm": 14.2,
                        "recharge_deficit_pct": -66.6,
                        "source": "IMD",
                    },
                }],
            },
            "ndmi": {
                "match_count": 1,
                "matches": [{
                    "evidence_class": "simulation_only",
                    "properties": {
                        "source_type": "simulated_demo",
                        "data_status": "simulated_demo",
                        "ndmi": 0.25,
                    },
                }],
            },
        },
    }


def test_extracts_location_and_head():
    result = extract_geospatial_evidence(make_assessment())

    assert result["location"]["location_id"] == "WELL-001"
    assert result["groundwater_head"]["value_m_bgl"] == 4.82
    assert result["groundwater_head"]["operational_eligible"] is False
    assert result["groundwater_head"]["source_verified"] is True
    assert result["groundwater_head"]["measurement_available"] is True
    assert result["groundwater_head"]["freshness_status"] == "not_assessed"
    assert result["groundwater_head"]["trend_available"] is False


def test_extracts_rainfall_and_elevation_context():
    result = extract_geospatial_evidence(make_assessment())

    assert result["rainfall"]["values"]["recharge_deficit_pct"] == -66.6
    assert result["elevation"]["values"]["distance_to_coast_km"] == 0.38


def test_simulated_ndmi_is_not_operational():
    result = extract_geospatial_evidence(make_assessment())

    assert result["ndmi"]["status"] == "matched"
    assert result["ndmi"]["operational_eligible"] is False
    assert "SIMULATED_LAYER" in result["ndmi"]["quality_flags"]


def test_ambiguous_layer_is_not_eligible():
    assessment = make_assessment()
    assessment["gis"]["rainfall"]["matches"].append(
        assessment["gis"]["rainfall"]["matches"][0]
    )
    assessment["gis"]["rainfall"]["match_count"] = 2

    result = extract_geospatial_evidence(assessment)

    assert result["rainfall"]["status"] == "ambiguous"
    assert result["rainfall"]["operational_eligible"] is False
    assert result["rainfall"]["values"] == {}


def test_unmatched_layer_is_not_eligible():
    assessment = make_assessment()
    assessment["gis"]["rainfall"] = {
        "match_count": 0,
        "matches": [],
    }

    result = extract_geospatial_evidence(assessment)

    assert result["rainfall"]["status"] == "unmatched"
    assert result["rainfall"]["operational_eligible"] is False


def test_missing_head_is_not_eligible():
    assessment = make_assessment()
    assessment["groundwater_head_mbgl"] = None

    result = extract_geospatial_evidence(assessment)

    assert result["groundwater_head"]["status"] == "unavailable"
    assert result["groundwater_head"]["operational_eligible"] is False


def test_synthetic_location_head_is_not_eligible():
    assessment = make_assessment()
    assessment["location_is_synthetic"] = True

    result = extract_geospatial_evidence(assessment)

    assert result["groundwater_head"]["operational_eligible"] is False


def test_non_authority_head_requires_review():
    assessment = make_assessment()
    assessment["verification_status"] = "unverified"

    result = extract_geospatial_evidence(assessment)

    assert result["groundwater_head"]["operational_eligible"] is False


def test_invalid_numeric_values_become_none():
    assessment = make_assessment()
    assessment["groundwater_head_mbgl"] = float("nan")
    assessment["distance_to_coast_m"] = "unknown"

    result = extract_geospatial_evidence(assessment)

    assert result["groundwater_head"]["value_m_bgl"] is None
    assert result["coastal_distance"]["value_m"] is None


def test_does_not_calculate_risk():
    result = extract_geospatial_evidence(make_assessment())

    assert result["interpretation"]["risk_score_calculated"] is False
    assert result["interpretation"]["salinity_confirmed"] is False


def test_requires_location_id():
    with pytest.raises(ValueError):
        extract_geospatial_evidence({"gis": {}})

def test_preserves_elevation_grid_and_classification():
    result = extract_geospatial_evidence(make_assessment())

    assert result["elevation"]["grid_ids"] == ["elev_cell_036"]
    assert result["elevation"]["source_classification"] == "CRITICAL_LOW_ELEVATION"


def test_preserves_rainfall_grid_and_observation_period():
    result = extract_geospatial_evidence(make_assessment())

    assert result["rainfall"]["grid_ids"] == ["rain_cell_007"]
    assert result["rainfall"]["observation_period"] is None


def test_ambiguous_layer_preserves_grid_ids():
    assessment = make_assessment()
    assessment["gis"]["rainfall"]["matches"].append(
        assessment["gis"]["rainfall"]["matches"][0]
    )
    assessment["gis"]["rainfall"]["match_count"] = 2

    result = extract_geospatial_evidence(assessment)

    assert result["rainfall"]["grid_ids"] == [
        "rain_cell_007", "rain_cell_007"
    ]

def test_preserves_elevation_classification_as_string():
    result = extract_geospatial_evidence(make_assessment())

    assert result["elevation"]["source_classification"] == "CRITICAL_LOW_ELEVATION"
    assert result["elevation"]["values"]["mean_elevation_msl_m"] == 3.5
    assert result["elevation"]["values"]["distance_to_coast_km"] == 0.38
    assert "coastal_salinity_susceptibility" not in result["elevation"]["values"]


def test_moderate_elevation_classification_preserved():
    assessment = make_assessment()
    assessment["gis"]["elevation"]["matches"][0]["properties"][
        "coastal_salinity_susceptibility"
    ] = "MODERATE_ELEVATION"

    result = extract_geospatial_evidence(assessment)

    assert result["elevation"]["source_classification"] == "MODERATE_ELEVATION"