"""SALT-LINE geospatial data quality validation."""

import math

EXPECTED_CRS = {
    "urn:ogc:def:crs:OGC:1.3:CRS84",
    "OGC:CRS84",
    "EPSG:4326",
}


def _valid_position(position):
    if not isinstance(position, (list, tuple)) or len(position) < 2:
        return False

    lon, lat = position[:2]

    return (
        not isinstance(lon, bool)
        and not isinstance(lat, bool)
        and isinstance(lon, (int, float))
        and isinstance(lat, (int, float))
        and math.isfinite(lon)
        and math.isfinite(lat)
        and -180 <= lon <= 180
        and -90 <= lat <= 90
    )


def _valid_ring(ring):
    if not isinstance(ring, list) or len(ring) < 4:
        return False

    if not all(_valid_position(p) for p in ring):
        return False

    return ring[0][:2] == ring[-1][:2]


def _valid_polygon(coordinates):
    return (
        isinstance(coordinates, list)
        and len(coordinates) > 0
        and all(_valid_ring(ring) for ring in coordinates)
    )


def _valid_geometry(geometry):
    if not isinstance(geometry, dict):
        return False

    kind = geometry.get("type")
    coordinates = geometry.get("coordinates")

    if kind == "Point":
        return _valid_position(coordinates)

    if kind == "Polygon":
        return _valid_polygon(coordinates)

    if kind == "MultiPolygon":
        return (
            isinstance(coordinates, list)
            and len(coordinates) > 0
            and all(_valid_polygon(p) for p in coordinates)
        )

    return False


def validate_geojson_layer(data, layer_name="unknown"):
    if not isinstance(data, dict) or data.get("type") != "FeatureCollection":
        return {
            "layer": layer_name,
            "status": "invalid",
            "feature_count": 0,
            "valid_features": 0,
            "invalid_features": 0,
            "quality_flags": ["INVALID_FEATURE_COLLECTION"],
            "features": [],
        }

    crs = (
        data.get("crs", {})
        .get("properties", {})
        .get("name")
    )

    flags = []

    if crs not in EXPECTED_CRS:
        flags.append("UNKNOWN_OR_UNSUPPORTED_CRS")

    raw_features = data.get("features")

    if not isinstance(raw_features, list):
        raw_features = []
        flags.append("INVALID_FEATURE_LIST")

    results = []

    for index, feature in enumerate(raw_features):
        feature_flags = []

        if not isinstance(feature, dict) or feature.get("type") != "Feature":
            feature_flags.append("INVALID_FEATURE")
            properties = {}
            geometry = None
        else:
            properties = feature.get("properties") or {}
            geometry = feature.get("geometry")

            if not isinstance(properties, dict):
                properties = {}
                feature_flags.append("INVALID_PROPERTIES")

            if geometry is None:
                feature_flags.append("MISSING_GEOMETRY")
            elif not _valid_geometry(geometry):
                feature_flags.append("INVALID_GEOMETRY")

        for field in ("source_type", "data_status", "source"):
            if not properties.get(field):
                feature_flags.append(f"MISSING_{field.upper()}")

        simulated = (
            properties.get("source_type") == "simulated_demo"
            or properties.get("data_status") == "simulated_demo"
        )

        if simulated:
            feature_flags.append("SIMULATED_LAYER")

        valid = not any(
            flag in feature_flags
            for flag in (
                "INVALID_FEATURE",
                "INVALID_PROPERTIES",
                "MISSING_GEOMETRY",
                "INVALID_GEOMETRY",
            )
        )

        results.append({
            "feature_index": index,
            "grid_id": properties.get("grid_id"),
            "valid": valid,
            "is_simulated": simulated,
            "evidence_class": (
                "simulation_only" if simulated else "unclassified"
            ),
            "quality_flags": list(dict.fromkeys(feature_flags)),
        })

    invalid_count = sum(not item["valid"] for item in results)

    if invalid_count or flags:
        status = "review_required"
    else:
        status = "valid"

    return {
        "layer": layer_name,
        "status": status,
        "crs": crs,
        "feature_count": len(results),
        "valid_features": len(results) - invalid_count,
        "invalid_features": invalid_count,
        "quality_flags": flags,
        "features": results,
        "eligible_for_demo": True,
        "eligible_for_operational_assessment": (
            status == "valid"
            and not any(item["is_simulated"] for item in results)
            and not flags
        ),
    }


def validate_geospatial_assessments(assessments):
    if not isinstance(assessments, list):
        raise TypeError("assessments must be a list")

    results = []

    for assessment in assessments:
        location_id = assessment.get("location_id")
        layers = assessment.get("gis", {})
        layer_results = {}

        for name, layer in layers.items():
            matches = layer.get("matches", [])
            count = layer.get("match_count", len(matches))

            if count == 0:
                status = "unmatched"
            elif count == 1:
                status = "matched"
            else:
                status = "ambiguous"

            simulated = any(
                match.get("evidence_class") == "simulation_only"
                for match in matches
            )

            layer_results[name] = {
                "status": status,
                "match_count": count,
                "matches": matches,
                "is_simulated": simulated,
                "eligible_for_demo": True,
                "eligible_for_operational_assessment": (
                    status == "matched" and not simulated
                ),
                "quality_flags": (
                    ["MULTIPLE_SPATIAL_MATCHES"]
                    if status == "ambiguous"
                    else ["NO_SPATIAL_MATCH"]
                    if status == "unmatched"
                    else []
                ) + (["SIMULATED_LAYER"] if simulated else []),
            }

        results.append({
            "location_id": location_id,
            "layers": layer_results,
            "groundwater_head_mbgl": assessment.get(
                "groundwater_head_mbgl"
            ),
            "groundwater_head_status": (
                "unknown"
                if assessment.get("groundwater_head_mbgl") is None
                else "available"
            ),
        })

    return results
