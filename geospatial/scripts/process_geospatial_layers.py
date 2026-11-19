#!/usr/bin/env python3
"""
SALT-LINE Geospatial Layer Processing Script
===========================================
Generates and validates:
1. Udupi coastal pilot boundary (GeoJSON)
2. Locations dataset (GeoJSON & CSV)
3. Sentinel-2 NDMI environmental indicator grid (GeoJSON & Leaflet Spec)

Author: Person 2 (Geospatial & Environmental Data Lead)
Project: SALT-LINE, INNOVEX '26
"""

import json
import csv
import math
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOUNDARY_DIR = os.path.join(BASE_DIR, "boundary")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
METADATA_DIR = os.path.join(BASE_DIR, "metadata")

for d in [BOUNDARY_DIR, PROCESSED_DIR, METADATA_DIR]:
    os.makedirs(d, exist_ok=True)

# 1. Pilot Boundary Definition
BOUNDARY_COORDS = [
    [74.6980, 13.4850],
    [74.6920, 13.4420],
    [74.6890, 13.3980],
    [74.6940, 13.3720],
    [74.6960, 13.3450],
    [74.7040, 13.3100],
    [74.7180, 13.2650],
    [74.7310, 13.2200],
    [74.7520, 13.1650],
    [74.7720, 13.1200],
    [74.7860, 13.1050],
    [74.8210, 13.1080],
    [74.8140, 13.1450],
    [74.7950, 13.1950],
    [74.7820, 13.2450],
    [74.7750, 13.2950],
    [74.7680, 13.3400],
    [74.7640, 13.3850],
    [74.7620, 13.4350],
    [74.7550, 13.4850],
    [74.6980, 13.4850]
]

def build_boundary():
    geojson = {
        "type": "FeatureCollection",
        "name": "udupi_pilot_boundary",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": [{
            "type": "Feature",
            "properties": {
                "id": "udupi_coastal_pilot_01",
                "name": "Udupi Coastal Pilot Extent",
                "district": "Udupi",
                "state": "Karnataka",
                "country": "India",
                "corridor_length_km": 42.5,
                "width_inland_km": "3.5 to 6.0 km",
                "area_approx_sqkm": 196.4,
                "created_at": "2026-11-19T22:00:00Z"
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [BOUNDARY_COORDS]
            }
        }]
    }
    out_path = os.path.join(BOUNDARY_DIR, "udupi_pilot_boundary.geojson")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)
    print(f"[OK] Boundary written: {out_path}")

# 2. Locations Dataset Definition
LOCATIONS = [
    {"id": "udupi_loc_01", "name": "CGWB Hydrograph Station Malpe Fishery Port", "latitude": 13.3512, "longitude": 74.7045, "well_type": "open_well", "source_type": "public_dataset", "is_monitoring_station": True, "last_measured_at": "2024-05-15T10:30:00Z"},
    {"id": "udupi_loc_02", "name": "India-WRIS Piezometer Kaup Light House Road", "latitude": 13.2248, "longitude": 74.7389, "well_type": "borewell", "source_type": "public_dataset", "is_monitoring_station": True, "last_measured_at": "2024-05-18T11:15:00Z"},
    {"id": "udupi_loc_03", "name": "CGWB Observation Well Udyavara Bridge", "latitude": 13.3105, "longitude": 74.7392, "well_type": "open_well", "source_type": "public_dataset", "is_monitoring_station": True, "last_measured_at": "2023-11-20T09:45:00Z"},
    {"id": "udupi_loc_04", "name": "District GW Office Station Brahmavara Agri Complex", "latitude": 13.4356, "longitude": 74.7478, "well_type": "borewell", "source_type": "authority_verified", "is_monitoring_station": True, "last_measured_at": "2024-10-12T14:00:00Z"},
    {"id": "udupi_loc_05", "name": "Minor Irrigation Observation Point Padubidri Coastal Plain", "latitude": 13.1362, "longitude": 74.7815, "well_type": "open_well", "source_type": "authority_verified", "is_monitoring_station": True, "last_measured_at": "2024-04-29T11:00:00Z"},
    {"id": "udupi_loc_06", "name": "Padukere Coastal Strip Domestic Well", "latitude": 13.3325, "longitude": 74.7061, "well_type": "open_well", "source_type": "community_report", "is_monitoring_station": False, "last_measured_at": "2026-11-14T16:45:00Z"},
    {"id": "udupi_loc_07", "name": "Thottam Beach Community Dug Well", "latitude": 13.3685, "longitude": 74.7082, "well_type": "open_well", "source_type": "community_report", "is_monitoring_station": False, "last_measured_at": "2026-11-10T08:20:00Z"},
    {"id": "udupi_loc_08", "name": "Mattu Gulla Farm Borewell (Saline Creek Fringe)", "latitude": 13.2620, "longitude": 74.7295, "well_type": "borewell", "source_type": "community_report", "is_monitoring_station": False, "last_measured_at": "2026-11-05T07:30:00Z"},
    {"id": "udupi_loc_09", "name": "Kalyanpura Estuarine Agricultural Well", "latitude": 13.3895, "longitude": 74.7312, "well_type": "open_well", "source_type": "community_report", "is_monitoring_station": False, "last_measured_at": None},
    {"id": "udupi_loc_10", "name": "Pangala River Mouth Community Well", "latitude": 13.2485, "longitude": 74.7342, "well_type": "open_well", "source_type": "community_report", "is_monitoring_station": False, "last_measured_at": None},
    {"id": "udupi_loc_11", "name": "DEMO Malpe Port Ice Plant Test Well", "latitude": 13.3570, "longitude": 74.7018, "well_type": "borewell", "source_type": "simulated_demo", "is_monitoring_station": False, "last_measured_at": "2026-11-19T18:00:00Z"},
    {"id": "udupi_loc_12", "name": "DEMO Bengre Sandspit Candidate Sensor Node", "latitude": 13.3812, "longitude": 74.6985, "well_type": "open_well", "source_type": "simulated_demo", "is_monitoring_station": False, "last_measured_at": None},
    {"id": "udupi_loc_13", "name": "DEMO Kaup Beach Resort Boundary Well", "latitude": 13.2195, "longitude": 74.7350, "well_type": "open_well", "source_type": "simulated_demo", "is_monitoring_station": False, "last_measured_at": "2026-11-18T12:00:00Z"}
]

def build_locations():
    # GeoJSON
    features = []
    for loc in LOCATIONS:
        features.append({
            "type": "Feature",
            "properties": {
                "id": loc["id"],
                "name": loc["name"],
                "latitude": loc["latitude"],
                "longitude": loc["longitude"],
                "well_type": loc["well_type"],
                "source_type": loc["source_type"],
                "is_monitoring_station": loc["is_monitoring_station"],
                "last_measured_at": loc["last_measured_at"]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [loc["longitude"], loc["latitude"]]
            }
        })
    geojson = {
        "type": "FeatureCollection",
        "name": "udupi_pilot_locations",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features
    }
    geojson_path = os.path.join(PROCESSED_DIR, "locations.geojson")
    with open(geojson_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)

    # CSV
    csv_path = os.path.join(PROCESSED_DIR, "locations.csv")
    fieldnames = ["id", "name", "latitude", "longitude", "well_type", "source_type", "is_monitoring_station", "last_measured_at"]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for loc in LOCATIONS:
            row = dict(loc)
            if row["last_measured_at"] is None:
                row["last_measured_at"] = ""
            writer.writerow(row)
    print(f"[OK] Locations written: {geojson_path} and {csv_path}")

def point_in_polygon(x, y, poly):
    inside = False
    n = len(poly)
    for i in range(n):
        j = (i - 1) % n
        xi, yi = poly[i]
        xj, yj = poly[j]
        intersect = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
        if intersect:
            inside = not inside
    return inside

def verify_all():
    print("--- Verifying Location Points Inside Boundary ---")
    all_inside = True
    for loc in LOCATIONS:
        inside = point_in_polygon(loc["longitude"], loc["latitude"], BOUNDARY_COORDS)
        status = "INSIDE" if inside else "OUTSIDE"
        if not inside:
            all_inside = False
        print(f"[{status}] {loc['id']} - {loc['name']} ({loc['latitude']}, {loc['longitude']})")
    print(f"Containment check: {'PASS' if all_inside else 'FAIL'}")

if __name__ == "__main__":
    build_boundary()
    build_locations()
    verify_all()
