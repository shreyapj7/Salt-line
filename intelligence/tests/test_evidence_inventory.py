import pytest

from intelligence.evidence_inventory import build_evidence_inventory


def make_assessment(
    location_id,
    elevation_grid="elev_1",
    rainfall_grid="rain_1",
    ndmi_grid="ndmi_1",
    ndmi_simulated=True,
):
    def layer(grid_id, source_type="public_dataset", data_status="public_dataset"):
        return {
            "match_count": 1,
            "matches": [{
                "evidence_class": (
                    "simulation_only" if source_type == "simulated_demo"
                    else "public_dataset"
                ),
                "properties": {
                    "grid_id": grid_id,
                    "source_type": source_type,
                    "data_status": data_status,
                    "source": "test source",
                    "mean_elevation_msl_m": 2.0,
                    "distance_to_coast_km": 0.5,
                    "topographic_class": "Coastal Lowland",
                    "coastal_salinity_susceptibility": "CRITICAL_LOW_ELEVATION",
                    "annual_normal_mm": 4000,
                    "dry_season_normal_mm": 40,
                    "dry_season_observed_mm": 20,
                    "recharge_deficit_pct": -50,
                },
            }],
        }

    ndmi_source = "simulated_demo" if ndmi_simulated else "public_dataset"

    return {
        "location_id": location_id,
        "name": location_id,
        "latitude": 13.3,
        "longitude": 74.7,
        "well_type": "open_well",
        "is_monitoring_station": False,
        "location_is_synthetic": False,
        "source_type": "public_dataset",
        "verification_status": "verified_authority",
        "groundwater_head_mbgl": 4.5,
        "last_measured_at": "2024-05-15T10:30:00Z",
        "distance_to_coast_m": 300,
        "gis": {
            "elevation": layer(elevation_grid),
            "rainfall": layer(rainfall_grid),
            "ndmi": layer(ndmi_grid, ndmi_source, ndmi_source),
        },
    }


def test_inventory_counts_locations_and_shared_grid_cells():
    assessments = [
        make_assessment("loc_1"),
        make_assessment("loc_2"),
        make_assessment("loc_3", elevation_grid="elev_2"),
    ]

    result = build_evidence_inventory(assessments)

    assert result["location_count"] == 3
    assert result["grid_usage"]["elevation"]["unique_grid_count"] == 2
    assert result["shared_grid_cells"]["elevation"]["elev_1"] == [
        "loc_1", "loc_2"
    ]


def test_simulated_ndmi_is_excluded_from_operational_coverage():
    result = build_evidence_inventory([make_assessment("loc_1")])

    assert result["locations"][0]["layers"]["ndmi"]["status"] == (
        "matched_excluded"
    )
    assert result["layer_counts"]["ndmi"]["matched_excluded"] == 1


def test_missing_salinity_measurements_are_reported():
    result = build_evidence_inventory([make_assessment("loc_1")])

    assert result["salinity_coverage"]["ec"]["not_provided"] == 1
    assert result["salinity_coverage"]["chloride"]["not_provided"] == 1
    assert result["salinity_coverage"]["tds"]["not_provided"] == 1


def test_ec_derived_tds_is_not_independent_evidence():
    salinity = {
        "loc_1": {
            "ec": {"status": "measured"},
            "tds": {
                "status": "derived_estimate",
                "method": "ec_estimate",
                "independent_evidence": False,
            },
        }
    }

    result = build_evidence_inventory(
        [make_assessment("loc_1")],
        salinity_evidence_by_location=salinity,
    )

    item = result["locations"][0]["salinity"]
    assert item["ec"]["status"] == "measured"
    assert item["tds"]["independent_evidence"] is False


def test_inventory_does_not_calculate_risk_or_priority():
    result = build_evidence_inventory([make_assessment("loc_1")])

    assert result["guardrails"]["risk_score_calculated"] is False
    assert result["guardrails"]["probability_estimated"] is False
    assert result["guardrails"]["monitoring_priority_calculated"] is False
    assert "risk_score" not in result["locations"][0]


def test_duplicate_location_ids_are_rejected():
    with pytest.raises(ValueError, match="Duplicate location_id"):
        build_evidence_inventory([
            make_assessment("loc_1"),
            make_assessment("loc_1"),
        ])


def test_empty_assessment_list_is_rejected():
    with pytest.raises(ValueError, match="must not be empty"):
        build_evidence_inventory([])
