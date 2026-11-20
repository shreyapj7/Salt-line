
import json
from pathlib import Path

from intelligence.validation.geospatial_validation import (
    validate_geojson_layer,
)

ROOT = Path(__file__).resolve().parents[2]
GEO = ROOT / "geospatial" / "processed"

FILES = {
    "locations": GEO / "locations.geojson",
    "rainfall": GEO / "rainfall_layer.geojson",
    "elevation": GEO / "elevation_layer.geojson",
    "ndmi": GEO / "ndmi_pilot_grid.geojson",
}


def load_layer_data(name):
    path = FILES[name]
    with path.open(encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, dict) or data.get("type") != "FeatureCollection":
        raise ValueError(f"{name} is not a GeoJSON FeatureCollection")

    return data


def load_layer(name):
    return load_layer_data(name).get("features", [])


def point_on_segment(lon, lat, a, b, epsilon=1e-10):
    x1, y1 = a[:2]
    x2, y2 = b[:2]

    cross = (lon - x1) * (y2 - y1) - (lat - y1) * (x2 - x1)

    if abs(cross) > epsilon:
        return False

    return (
        min(x1, x2) - epsilon <= lon <= max(x1, x2) + epsilon
        and min(y1, y2) - epsilon <= lat <= max(y1, y2) + epsilon
    )


def point_in_ring(lon, lat, ring):
    inside = False
    j = len(ring) - 1

    for i in range(len(ring)):
        a = ring[i]
        b = ring[j]

        if point_on_segment(lon, lat, a, b):
            return True

        xi, yi = a[:2]
        xj, yj = b[:2]

        if (yi > lat) != (yj > lat):
            cross = (xj - xi) * (lat - yi) / (yj - yi) + xi
            if lon < cross:
                inside = not inside

        j = i

    return inside


def point_in_polygon(lon, lat, coordinates):
    if not coordinates:
        return False

    if not point_in_ring(lon, lat, coordinates[0]):
        return False

    return not any(
        point_in_ring(lon, lat, hole)
        for hole in coordinates[1:]
    )


def feature_contains(feature, lon, lat):
    geometry = feature.get("geometry") or {}
    kind = geometry.get("type")
    coordinates = geometry.get("coordinates", [])

    if kind == "Polygon":
        return point_in_polygon(lon, lat, coordinates)

    if kind == "MultiPolygon":
        return any(
            point_in_polygon(lon, lat, polygon)
            for polygon in coordinates
        )

    return False


def get_location_context(location_id):
    locations = load_layer("locations")

    location = next(
        (
            feature
            for feature in locations
            if feature.get("properties", {}).get("id") == location_id
        ),
        None,
    )

    if location is None:
        raise KeyError(f"Unknown location_id: {location_id}")

    props = location["properties"]
    lon = float(props["longitude"])
    lat = float(props["latitude"])

    context = {
        "location": props,
        "layers": {},
        "layer_validation": {},
    }

    for layer_name in ("rainfall", "elevation", "ndmi"):
        layer_data = load_layer_data(layer_name)
        features = layer_data.get("features", [])

        validation = validate_geojson_layer(layer_data, layer_name)

        matches = [
            feature["properties"]
            for feature in features
            if feature_contains(feature, lon, lat)
        ]

        match_count = len(matches)

        if match_count == 0:
            match_status = "unmatched"
        elif match_count == 1:
            match_status = "matched"
        else:
            match_status = "ambiguous"

        match_flags = (
            ["NO_SPATIAL_MATCH"]
            if match_status == "unmatched"
            else ["MULTIPLE_SPATIAL_MATCHES"]
            if match_status == "ambiguous"
            else []
        )

        simulated = any(
            item.get("data_status") == "simulated_demo"
            or item.get("source_type") == "simulated_demo"
            for item in matches
        )

        context["layers"][layer_name] = matches

        context["layer_validation"][layer_name] = {
            **validation,
            "match_status": match_status,
            "match_count": match_count,
            "is_simulated": simulated,
            "eligible_for_demo": (
                validation.get("eligible_for_demo", False)
                and match_status != "unmatched"
            ),
            "eligible_for_operational_assessment": (
                validation.get(
                    "eligible_for_operational_assessment", False
                )
                and match_status == "matched"
                and not simulated
            ),
            "quality_flags": list(dict.fromkeys(
                validation.get("quality_flags", [])
                + match_flags
                + (["SIMULATED_LAYER"] if simulated else [])
            )),
        }

    context["simulation_present"] = (
        props.get("source_type") == "simulated_demo"
        or any(
            layer["is_simulated"]
            for layer in context["layer_validation"].values()
        )
    )

    return context


def list_locations():
    return [
        feature["properties"]
        for feature in load_layer("locations")
    ]
