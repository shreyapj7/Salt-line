
import csv
import json
import math
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parent.parent
GEO_DIR = PROJECT_ROOT / "geospatial"
PROCESSED_DIR = GEO_DIR / "processed"


def _validate_coordinate(value: float, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be numeric")

    value = float(value)

    if not math.isfinite(value):
        raise ValueError(f"{name} must be finite")

    return value


def _point_on_segment(point, start, end, epsilon=1e-10):
    x, y = point
    x1, y1 = start
    x2, y2 = end

    cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1)

    if abs(cross) > epsilon:
        return False

    return (
        min(x1, x2) - epsilon <= x <= max(x1, x2) + epsilon
        and min(y1, y2) - epsilon <= y <= max(y1, y2) + epsilon
    )


def _point_in_ring(point, ring):
    """Return True when a point lies inside or on a ring boundary."""

    x, y = point
    inside = False

    if len(ring) < 4:
        raise ValueError("Polygon ring must contain at least 4 coordinates")

    for index in range(len(ring) - 1):
        start = ring[index]
        end = ring[index + 1]

        x1, y1 = start[:2]
        x2, y2 = end[:2]

        if _point_on_segment(point, (x1, y1), (x2, y2)):
            return True

        if (y1 > y) != (y2 > y):
            intersection_x = (
                (x2 - x1) * (y - y1) / (y2 - y1) + x1
            )

            if x < intersection_x:
                inside = not inside

    return inside


def _point_in_polygon(point, polygon_coordinates):
    """
    First ring is the exterior.
    Remaining rings are holes.
    """

    if not polygon_coordinates:
        return False

    exterior = polygon_coordinates[0]

    if not _point_in_ring(point, exterior):
        return False

    for hole in polygon_coordinates[1:]:
        if _point_in_ring(point, hole):
            return False

    return True


def _geometry_contains_point(geometry, longitude, latitude):
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates")

    point = (longitude, latitude)

    if geometry_type == "Polygon":
        return _point_in_polygon(point, coordinates)

    if geometry_type == "MultiPolygon":
        return any(
            _point_in_polygon(point, polygon)
            for polygon in coordinates
        )

    raise ValueError(
        f"Unsupported geometry type: {geometry_type}"
    )


def _load_geojson(filename):
    path = PROCESSED_DIR / filename

    with path.open(encoding="utf-8") as file:
        data = json.load(file)

    if data.get("type") != "FeatureCollection":
        raise ValueError(f"{filename} must be a FeatureCollection")

    return data


def _load_locations():
    path = PROCESSED_DIR / "locations.csv"

    with path.open(encoding="utf-8", newline="") as file:
        locations = list(csv.DictReader(file))

    seen_ids = set()

    for location in locations:
        location_id = location.get("id")

        if not location_id:
            raise ValueError("Location is missing an ID")

        if location_id in seen_ids:
            raise ValueError(f"Duplicate location ID: {location_id}")

        seen_ids.add(location_id)

        latitude = _validate_coordinate(
            float(location["latitude"]), "latitude"
        )
        longitude = _validate_coordinate(
            float(location["longitude"]), "longitude"
        )

        if not -90 <= latitude <= 90:
            raise ValueError(f"Invalid latitude: {location_id}")

        if not -180 <= longitude <= 180:
            raise ValueError(f"Invalid longitude: {location_id}")

        location["_latitude"] = latitude
        location["_longitude"] = longitude

        head = location.get("groundwater_head_mbgl", "").strip()

        location["groundwater_head_mbgl"] = (
            float(head) if head else None
        )

        location["is_monitoring_station"] = (
            location["is_monitoring_station"].lower() == "true"
        )

    return locations


def _match_layer(location, filename):
    data = _load_geojson(filename)

    matches = []

    for feature in data.get("features", []):
        geometry = feature.get("geometry")

        if not geometry:
            continue

        if _geometry_contains_point(
            geometry,
            location["_longitude"],
            location["_latitude"],
        ):
            properties = feature.get("properties", {})

            matches.append({
                "grid_id": properties.get("grid_id"),
                "properties": properties,
                "geometry_type": geometry.get("type"),
            })

    return matches


def _classify_layer_match(filename, properties):
    status = properties.get("data_status")
    source_type = properties.get("source_type")

    if status == "simulated_demo" or source_type == "simulated_demo":
        return "simulation_only"

    if filename == "rainfall_layer.geojson":
        return "baseline_context"

    if filename == "elevation_layer.geojson":
        return "spatial_context"

    return "unclassified"


def load_geospatial_assessments():
    """
    Load all pilot locations and attach matching GIS polygon attributes.

    This function extracts spatial evidence only.
    It does not calculate risk or convert GIS values into
    normalised intelligence indicators.
    """

    locations = _load_locations()

    layers = {
        "elevation": "elevation_layer.geojson",
        "rainfall": "rainfall_layer.geojson",
        "ndmi": "ndmi_pilot_grid.geojson",
    }

    assessments = []

    for location in locations:
        result = {
            "location_id": location["id"],
            "name": location["name"],
            "latitude": location["_latitude"],
            "longitude": location["_longitude"],
            "well_type": location["well_type"],
            "source_type": location["source_type"],
            "verification_status": location["verification_status"],
            "is_monitoring_station": location["is_monitoring_station"],
            "last_measured_at": location["last_measured_at"] or None,
            "groundwater_head_mbgl": location["groundwater_head_mbgl"],
            "distance_to_coast_m": (
                float(location["distance_to_coast_m"])
                if location["distance_to_coast_m"]
                else None
            ),
            "source_document": location["source_document"],
            "source_url": location["source_url"],
            "gis": {},
        }

        for layer_name, filename in layers.items():
            matches = _match_layer(location, filename)

            result["gis"][layer_name] = {
                "match_count": len(matches),
                "matches": [
                    {
                        **match,
                        "evidence_class": _classify_layer_match(
                            filename,
                            match["properties"],
                        ),
                    }
                    for match in matches
                ],
            }

        result["location_is_synthetic"] = (
            location["source_type"] == "simulated_demo"
            or location["verification_status"] == "synthetic_demo"
        )

        assessments.append(result)

    return assessments


def get_location_assessment(location_id):
    assessments = load_geospatial_assessments()

    for assessment in assessments:
        if assessment["location_id"] == location_id:
            return assessment

    raise KeyError(f"Unknown location ID: {location_id}")
