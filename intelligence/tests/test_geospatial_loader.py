from backend.app.geospatial_loader import get_location_context


def test_udupi_loc_13_preserves_both_ndmi_matches():
    context = get_location_context("udupi_loc_13")
    ndmi = context["layer_validation"]["ndmi"]

    assert ndmi["match_count"] == 2
    assert ndmi["match_status"] == "ambiguous"
    assert ndmi["is_simulated"] is True
    assert ndmi["eligible_for_operational_assessment"] is False

    grid_ids = {
        item["grid_id"]
        for item in context["layers"]["ndmi"]
    }
    assert grid_ids == {"ndmi_cell_035", "ndmi_cell_036"}


def test_unmatched_rainfall_is_not_demo_eligible():
    context = get_location_context("udupi_loc_08")
    rainfall = context["layer_validation"]["rainfall"]

    assert rainfall["match_count"] == 0
    assert rainfall["match_status"] == "unmatched"
    assert rainfall["eligible_for_demo"] is False
    assert rainfall["eligible_for_operational_assessment"] is False
