import json
import csv
from pathlib import Path

def load_geojson(path: Path):
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)

def load_csv(path: Path):
    with path.open('r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def merge_data(geojson_data, csv_data):
    # Assume both have an 'id' field to match
    csv_by_id = {row['id']: row for row in csv_data}
    merged = []
    for feature in geojson_data.get('features', []):
        props = feature.get('properties', {})
        fid = str(props.get('id') or props.get('ID') or props.get('name'))
        csv_entry = csv_by_id.get(fid, {})
        merged_props = {**props, **csv_entry}
        merged.append({
            'type': 'Feature',
            'geometry': feature.get('geometry'),
            'properties': merged_props
        })
    return merged

def write_json(output_path: Path, data):
    with output_path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def write_csv(output_path: Path, data):
    if not data:
        return
    fieldnames = list(data[0].keys())
    with output_path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)

def main():
    base_dir = Path(__file__).resolve().parents[1]  # geospatial folder
    geojson_path = base_dir / 'processed' / 'locations.geojson'
    csv_path = base_dir / 'processed' / 'locations.csv'
    out_json_path = base_dir / 'processed' / 'locations_full.json'
    out_csv_path = base_dir / 'processed' / 'locations_full.csv'

    geojson_data = load_geojson(geojson_path)
    csv_data = load_csv(csv_path)
    merged = merge_data(geojson_data, csv_data)
    # Write as a FeatureCollection for JSON
    write_json(out_json_path, {'type': 'FeatureCollection', 'features': merged})
    # Flatten for CSV
    flat_records = [feat['properties'] for feat in merged]
    write_csv(out_csv_path, flat_records)

if __name__ == '__main__':
    main()
