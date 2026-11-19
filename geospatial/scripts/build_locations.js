const fs = require('fs');
const path = require('path');

// 1. Definition of locations
const locations = [
  // Group 1: Sourced Locations (Real Monitoring Stations / Verified Wells)
  {
    id: "udupi_loc_01",
    name: "CGWB Hydrograph Station Malpe Fishery Port",
    latitude: 13.3512,
    longitude: 74.7045,
    well_type: "open_well",
    source_type: "public_dataset",
    is_monitoring_station: true,
    last_measured_at: "2024-05-15T10:30:00Z"
  },
  {
    id: "udupi_loc_02",
    name: "India-WRIS Piezometer Kaup Light House Road",
    latitude: 13.2248,
    longitude: 74.7389,
    well_type: "borewell",
    source_type: "public_dataset",
    is_monitoring_station: true,
    last_measured_at: "2024-05-18T11:15:00Z"
  },
  {
    id: "udupi_loc_03",
    name: "CGWB Observation Well Udyavara Bridge",
    latitude: 13.3105,
    longitude: 74.7392,
    well_type: "open_well",
    source_type: "public_dataset",
    is_monitoring_station: true,
    last_measured_at: "2023-11-20T09:45:00Z"
  },
  {
    id: "udupi_loc_04",
    name: "District GW Office Station Brahmavara Agri Complex",
    latitude: 13.4356,
    longitude: 74.7478,
    well_type: "borewell",
    source_type: "authority_verified",
    is_monitoring_station: true,
    last_measured_at: "2024-10-12T14:00:00Z"
  },
  {
    id: "udupi_loc_05",
    name: "Minor Irrigation Observation Point Padubidri Coastal Plain",
    latitude: 13.1362,
    longitude: 74.7815,
    well_type: "open_well",
    source_type: "authority_verified",
    is_monitoring_station: true,
    last_measured_at: "2024-04-29T11:00:00Z"
  },

  // Group 2: Candidate Monitoring Points (Community Reports / Unmonitored Wells)
  {
    id: "udupi_loc_06",
    name: "Padukere Coastal Strip Domestic Well",
    latitude: 13.3325,
    longitude: 74.7061,
    well_type: "open_well",
    source_type: "community_report",
    is_monitoring_station: false,
    last_measured_at: "2026-11-14T16:45:00Z"
  },
  {
    id: "udupi_loc_07",
    name: "Thottam Beach Community Dug Well",
    latitude: 13.3685,
    longitude: 74.7082,
    well_type: "open_well",
    source_type: "community_report",
    is_monitoring_station: false,
    last_measured_at: "2026-11-10T08:20:00Z"
  },
  {
    id: "udupi_loc_08",
    name: "Mattu Gulla Farm Borewell (Saline Creek Fringe)",
    latitude: 13.2620,
    longitude: 74.7295,
    well_type: "borewell",
    source_type: "community_report",
    is_monitoring_station: false,
    last_measured_at: "2026-11-05T07:30:00Z"
  },
  {
    id: "udupi_loc_09",
    name: "Kalyanpura Estuarine Agricultural Well",
    latitude: 13.3895,
    longitude: 74.7312,
    well_type: "open_well",
    source_type: "community_report",
    is_monitoring_station: false,
    last_measured_at: null // Missing stays missing
  },
  {
    id: "udupi_loc_10",
    name: "Pangala River Mouth Community Well",
    latitude: 13.2485,
    longitude: 74.7342,
    well_type: "open_well",
    source_type: "community_report",
    is_monitoring_station: false,
    last_measured_at: null // Missing stays missing
  },

  // Group 3: Demo Points (Simulated Demo Points)
  {
    id: "udupi_loc_11",
    name: "DEMO Malpe Port Ice Plant Test Well",
    latitude: 13.3570,
    longitude: 74.7018,
    well_type: "borewell",
    source_type: "simulated_demo",
    is_monitoring_station: false,
    last_measured_at: "2026-11-19T18:00:00Z"
  },
  {
    id: "udupi_loc_12",
    name: "DEMO Bengre Sandspit Candidate Sensor Node",
    latitude: 13.3812,
    longitude: 74.6985,
    well_type: "open_well",
    source_type: "simulated_demo",
    is_monitoring_station: false,
    last_measured_at: null // Missing stays missing
  },
  {
    id: "udupi_loc_13",
    name: "DEMO Kaup Beach Resort Boundary Well",
    latitude: 13.2195,
    longitude: 74.7350,
    well_type: "open_well",
    source_type: "simulated_demo",
    is_monitoring_station: false,
    last_measured_at: "2026-11-18T12:00:00Z"
  }
];

// 2. Generate GeoJSON
const geojson = {
  type: "FeatureCollection",
  name: "udupi_pilot_locations",
  crs: {
    type: "name",
    properties: {
      name: "urn:ogc:def:crs:OGC:1.3:CRS84"
    }
  },
  features: locations.map(loc => ({
    type: "Feature",
    properties: {
      id: loc.id,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      well_type: loc.well_type,
      source_type: loc.source_type,
      is_monitoring_station: loc.is_monitoring_station,
      last_measured_at: loc.last_measured_at
    },
    geometry: {
      type: "Point",
      coordinates: [loc.longitude, loc.latitude]
    }
  }))
};

// 3. Generate CSV
const csvHeaders = ["id", "name", "latitude", "longitude", "well_type", "source_type", "is_monitoring_station", "last_measured_at"];
const csvRows = locations.map(loc => {
  const measured = loc.last_measured_at ? `"${loc.last_measured_at}"` : "";
  return `"${loc.id}","${loc.name}",${loc.latitude},${loc.longitude},"${loc.well_type}","${loc.source_type}",${loc.is_monitoring_station},${measured}`;
});
const csvContent = [csvHeaders.join(",")].concat(csvRows).join("\n") + "\n";

// Write outputs
const geojsonPath = path.resolve(__dirname, '../processed/locations.geojson');
const csvPath = path.resolve(__dirname, '../processed/locations.csv');

fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 2), 'utf-8');
fs.writeFileSync(csvPath, csvContent, 'utf-8');

console.log(`Saved GeoJSON to ${geojsonPath}`);
console.log(`Saved CSV to ${csvPath}`);
