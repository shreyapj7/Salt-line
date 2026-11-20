import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GEO = ROOT / "geospatial" / "processed"

FILES = {
    "locations": GEO / "locations.geojson",
    "rainfall": GEO / "rainfall_layer.geojson",
    "elevation": GEO / "elevation_layer.geojson",
    "ndmi": GEO / "ndmi_pilot_grid.geojson",
}


def load_layer(name):
    path = FILES[name]
    with path.open(encoding="utf-8") as file:
        data = json.load(file)
    if data.get("type") != "FeatureCollection":
        raise ValueError(f"{name} is not a GeoJSON FeatureCollection")
    return data.get("features", [])


def point_in_ring(lon, lat, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][:2]
        xj, yj = ring[j][:2]
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
        (f for f in locations if f.get("properties", {}).get("id") == location_id),
        None,
    )
    if location is None:
        raise KeyError(f"Unknown location_id: {location_id}")

    props = location["properties"]
    lon = float(props["longitude"])
    lat = float(props["latitude"])

    context = {"location": props, "layers": {}}

    for layer_name in ("rainfall", "elevation", "ndmi"):
        matches = [
            feature["properties"]
            for feature in load_layer(layer_name)
            if feature_contains(feature, lon, lat)
        ]
        context["layers"][layer_name] = matches

    context["simulation_present"] = (
        props.get("source_type") == "simulated_demo"
        or any(
            item.get("data_status") == "simulated_demo"
            or item.get("source_type") == "simulated_demo"
            for items in context["layers"].values()
            for item in items
        )
    )
    return context


def list_locations():
    return [
        feature["properties"]
        for feature in load_layer("locations")
    ]
