import pytest

from intelligence.validation.geospatial_validation import (
    validate_geojson_layer,
    validate_geospatial_assessments,
)


def feature(geometry=None, properties=None):
    return {
        "type": "Feature",
        "geometry": geometry or {
            "type": "Polygon",
            "coordinates": [[
                [74, 13], [75, 13], [75, 14],
                [74, 14], [74, 13]
            ]]
        },
        "properties": properties or {
            "grid_id": "grid_01",
            "source_type": "public_dataset",
            "data_status": "public_dataset",
            "source": "test",
        },
    }


def collection(features):
    return {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        "features": features,
    }


def test_valid_geojson_layer():
    result = validate_geojson_layer(
        collection([feature()]), "rainfall"
    )
    assert result["valid_features"] == 1
    assert result["status"] == "valid"


def test_invalid_geometry():
    result = validate_geojson_layer(
        collection([feature({"type": "Polygon", "coordinates": []})])
    )
    assert result["invalid_features"] == 1


def test_missing_geometry():
    item = feature()
    item["geometry"] = None

    result = validate_geojson_layer(collection([item]))

    assert result["invalid_features"] == 1
    assert "MISSING_GEOMETRY" in result["features"][0]["quality_flags"]


def test_simulated_ndmi():
    result = validate_geojson_layer(
        collection([feature(properties={
            "grid_id": "ndmi_01",
            "source_type": "simulated_demo",
            "data_status": "simulated_demo",
            "source": "demo",
        })]),
        "ndmi",
    )
    assert result["features"][0]["evidence_class"] == "simulation_only"
    assert result["eligible_for_operational_assessment"] is False


def test_unknown_crs():
    data = collection([feature()])
    data["crs"]["properties"]["name"] = "unknown"
    result = validate_geojson_layer(data)
    assert "UNKNOWN_OR_UNSUPPORTED_CRS" in result["quality_flags"]


def test_ambiguous_matches_are_preserved():
    result = validate_geospatial_assessments([{
        "location_id": "udupi_loc_13",
        "groundwater_head_mbgl": None,
        "gis": {
            "ndmi": {
                "match_count": 2,
                "matches": [
                    {"grid_id": "a", "evidence_class": "simulation_only"},
                    {"grid_id": "b", "evidence_class": "simulation_only"},
                ],
            }
        }
    }])

    layer = result[0]["layers"]["ndmi"]
    assert layer["status"] == "ambiguous"
    assert layer["match_count"] == 2
    assert result[0]["groundwater_head_status"] == "unknown"


def test_wrong_input_type():
    with pytest.raises(TypeError):
        validate_geospatial_assessments({})
