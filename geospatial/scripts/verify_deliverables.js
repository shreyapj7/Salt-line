const fs = require('fs');
const path = require('path');

console.log("==================================================");
console.log("SALT-LINE PERSON 2 - VERIFICATION & AUDIT SUITE");
console.log("==================================================\n");

let passed = true;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    passed = false;
  }
}

// 1. Check Files Existence
const filesToCheck = [
  'geospatial/boundary/udupi_pilot_boundary.geojson',
  'docs/DATA_SOURCES.md',
  'geospatial/processed/locations.geojson',
  'geospatial/processed/locations.csv',
  'geospatial/processed/ndmi_pilot_grid.geojson',
  'geospatial/processed/ndmi_layer_spec.json',
  'geospatial/metadata/README.md',
  'geospatial/scripts/google_earth_engine_ndmi_export.js',
  'geospatial/scripts/process_geospatial_layers.py'
];

console.log("--- 1. File Existence & Integrity Check ---");
for (const rel of filesToCheck) {
  const fullPath = path.resolve(__dirname, '../../', rel);
  const exists = fs.existsSync(fullPath);
  assert(exists, `File exists: ${rel}`);
  if (exists) {
    const size = fs.statSync(fullPath).size;
    assert(size > 100, `File is non-empty (${size} bytes): ${rel}`);
  }
}

// 2. Boundary Verification
console.log("\n--- 2. Boundary Integrity Check ---");
const boundaryPath = path.resolve(__dirname, '../boundary/udupi_pilot_boundary.geojson');
const boundary = JSON.parse(fs.readFileSync(boundaryPath, 'utf-8'));
assert(boundary.type === 'FeatureCollection', "Boundary is a FeatureCollection");
assert(boundary.features.length === 1, "Boundary contains exactly 1 feature");
const boundaryPoly = boundary.features[0].geometry.coordinates[0];
assert(boundaryPoly.length >= 10, `Boundary polygon has ${boundaryPoly.length} vertices`);
assert(boundary.features[0].properties.name.includes("Udupi"), "Boundary name specifies Udupi");

// Ray-casting point-in-polygon
function pointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// 3. Locations Dataset Verification
console.log("\n--- 3. Locations Dataset Verification ---");
const locationsGeoPath = path.resolve(__dirname, '../processed/locations.geojson');
const locGeo = JSON.parse(fs.readFileSync(locationsGeoPath, 'utf-8'));
assert(locGeo.type === 'FeatureCollection', "Locations is a FeatureCollection");
assert(locGeo.features.length >= 8 && locGeo.features.length <= 15, `Location count (${locGeo.features.length}) is within requested range 8-15`);

const allowedSourceTypes = ["public_dataset", "authority_verified", "community_report", "simulated_demo"];
let realCount = 0;
let candidateCount = 0;
let demoCount = 0;
let insideBoundaryCount = 0;

locGeo.features.forEach((f, idx) => {
  const p = f.properties;
  const geom = f.geometry;

  // Coordinate order: [lon, lat]
  const lon = geom.coordinates[0];
  const lat = geom.coordinates[1];
  assert(p.latitude === lat && p.longitude === lon, `Coordinates match between geometry and properties for ${p.id}`);

  // Point in boundary check
  const inside = pointInPolygon([lon, lat], boundaryPoly);
  if (inside) insideBoundaryCount++;
  assert(inside, `Location ${p.id} (${p.name}) is INSIDE coastal pilot boundary`);

  // Source type check
  assert(allowedSourceTypes.includes(p.source_type), `Source type '${p.source_type}' is an allowed label for ${p.id}`);

  // Group counters
  if (p.source_type === 'public_dataset' || p.source_type === 'authority_verified') {
    realCount++;
  } else if (p.source_type === 'community_report') {
    candidateCount++;
  } else if (p.source_type === 'simulated_demo') {
    demoCount++;
    assert(p.name.includes("DEMO"), `Demo location ${p.id} has 'DEMO' in name: ${p.name}`);
  }

  // Boolean check
  assert(typeof p.is_monitoring_station === 'boolean', `is_monitoring_station is boolean for ${p.id}`);

  // last_measured_at check: null or valid ISO string, never 0 or empty string in GeoJSON
  if (p.last_measured_at !== null) {
    assert(p.last_measured_at !== 0 && p.last_measured_at !== "0" && p.last_measured_at !== "", `last_measured_at is not 0 for ${p.id}`);
    assert(!isNaN(Date.parse(p.last_measured_at)), `last_measured_at is valid ISO date for ${p.id}: ${p.last_measured_at}`);
  }
});

console.log(`\nLocation Group Summary:`);
console.log(`- Sourced / Verified Stations: ${realCount}`);
console.log(`- Candidate / Community Points: ${candidateCount}`);
console.log(`- Demo / Simulated Points: ${demoCount}`);
console.log(`- Total Points Inside Boundary: ${insideBoundaryCount} / ${locGeo.features.length}`);
assert(realCount >= 3, `Sourced locations >= 3 (Found ${realCount})`);
assert(candidateCount >= 3, `Candidate locations >= 3 (Found ${candidateCount})`);
assert(demoCount >= 3, `Demo locations >= 3 (Found ${demoCount})`);

// 4. Locations CSV Verification
console.log("\n--- 4. Locations CSV Verification ---");
const csvPath = path.resolve(__dirname, '../processed/locations.csv');
const csvLines = fs.readFileSync(csvPath, 'utf-8').trim().split('\n');
assert(csvLines.length === locGeo.features.length + 1, `CSV has header + ${locGeo.features.length} data rows`);
const header = csvLines[0];
const expectedHeader = "id,name,latitude,longitude,well_type,source_type,is_monitoring_station,last_measured_at";
assert(header === expectedHeader, `CSV header matches required fields: ${expectedHeader}`);

// 5. Environmental Layer Verification (NDMI)
console.log("\n--- 5. Environmental Layer (NDMI) Verification ---");
const ndmiPath = path.resolve(__dirname, '../processed/ndmi_pilot_grid.geojson');
const ndmi = JSON.parse(fs.readFileSync(ndmiPath, 'utf-8'));
assert(ndmi.type === 'FeatureCollection', "NDMI is a FeatureCollection");
assert(ndmi.features.length > 50, `NDMI grid contains ${ndmi.features.length} vector cells`);
const sampleCell = ndmi.features[0].properties;
assert(sampleCell.layer_name.toLowerCase().includes("ndmi"), "Layer name includes NDMI");
assert(!sampleCell.layer_name.toLowerCase().includes("salinity"), "Layer name is neutral and does NOT call itself salinity");
assert(typeof sampleCell.ndmi_mean === 'number', `ndmi_mean is numeric: ${sampleCell.ndmi_mean}`);
assert(sampleCell.scene_date === '2026-03-12', "Scene date is 2026-03-12");
assert(sampleCell.resolution_m === 20, "Resolution is 20m");

const specPath = path.resolve(__dirname, '../processed/ndmi_layer_spec.json');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
assert(spec.layer_title.includes("NDMI"), "Spec title mentions NDMI");
assert(spec.leaflet_integration.legend.length >= 3, "Spec contains Leaflet legend definitions");

// 6. Metadata and Guardrails Check
console.log("\n--- 6. Metadata and Guardrails Check ---");
const metaPath = path.resolve(__dirname, '../metadata/README.md');
const metaText = fs.readFileSync(metaPath, 'utf-8');
assert(metaText.includes("Sentinel-2") && metaText.includes("underground salinity"), "Guardrail note 1 present: Sentinel-2 does not measure underground salinity");
assert(metaText.includes("Vegetation stress is non-specific"), "Guardrail note 2 present: Vegetation stress is non-specific");
assert(metaText.includes("supporting indicator only"), "Guardrail note 3 present: Layer is a supporting indicator only");
assert(metaText.includes("simulated_demo"), "Documentation explicitly distinguishes real vs illustrative demo data");

// 7. Data Sources Inventory Check
console.log("\n--- 7. Data Sources Inventory Check ---");
const dsPath = path.resolve(__dirname, '../../docs/DATA_SOURCES.md');
const dsText = fs.readFileSync(dsPath, 'utf-8');
assert(dsText.includes("Sentinel-2"), "DATA_SOURCES.md includes Sentinel-2");
assert(dsText.includes("IMD") || dsText.includes("CHIRPS"), "DATA_SOURCES.md includes IMD / CHIRPS rainfall");
assert(dsText.includes("SRTM") || dsText.includes("Copernicus DEM"), "DATA_SOURCES.md includes DEM elevation");
assert(dsText.includes("OpenStreetMap") || dsText.includes("Natural Earth"), "DATA_SOURCES.md includes Coastline");
assert(dsText.includes("CGWB") || dsText.includes("India-WRIS"), "DATA_SOURCES.md includes Groundwater data");
assert(dsText.includes("got it") && dsText.includes("can get it"), "DATA_SOURCES.md includes access status column");

console.log("\n==================================================");
console.log(`FINAL RESULT: ${passed ? 'ALL CHECKS PASSED SUCCESSFULLY!' : 'SOME CHECKS FAILED'}`);
console.log("==================================================");

process.exit(passed ? 0 : 1);
