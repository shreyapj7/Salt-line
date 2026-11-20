
from intelligence.geospatial_adapter import (
    _point_in_ring,
    _point_in_polygon,
    load_geospatial_assessments,
    get_location_assessment,
)


def test_point_inside_polygon():
    ring = [
        [74.0, 13.0],
        [75.0, 13.0],
        [75.0, 14.0],
        [74.0, 14.0],
        [74.0, 13.0],
    ]

    assert _point_in_ring((74.5, 13.5), ring)


def test_point_outside_polygon():
    ring = [
        [74.0, 13.0],
        [75.0, 13.0],
        [75.0, 14.0],
        [74.0, 14.0],
        [74.0, 13.0],
    ]

    assert not _point_in_ring((76.0, 13.5), ring)


def test_polygon_hole_is_excluded():
    exterior = [
        [74.0, 13.0],
        [75.0, 13.0],
        [75.0, 14.0],
        [74.0, 14.0],
        [74.0, 13.0],
    ]

    hole = [
        [74.3, 13.3],
        [74.7, 13.3],
        [74.7, 13.7],
        [74.3, 13.7],
        [74.3, 13.3],
    ]

    assert _point_in_polygon(
        (74.1, 13.1),
        [exterior, hole],
    )

    assert not _point_in_polygon(
        (74.5, 13.5),
        [exterior, hole],
    )


def test_all_location_ids_are_loaded():
    assessments = load_geospatial_assessments()

    assert len(assessments) == 13

    ids = {item["location_id"] for item in assessments}

    assert len(ids) == 13


def test_simulated_ndmi_is_labelled():
    assessments = load_geospatial_assessments()

    for assessment in assessments:
        for match in assessment["gis"]["ndmi"]["matches"]:
            assert match["evidence_class"] == "simulation_only"


def test_synthetic_locations_are_identified():
    assessment = get_location_assessment("udupi_loc_11")

    assert assessment["location_is_synthetic"] is True


def test_missing_groundwater_head_stays_none():
    assessment = get_location_assessment("udupi_loc_06")

    assert assessment["groundwater_head_mbgl"] is None
