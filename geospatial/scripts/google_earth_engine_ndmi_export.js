/**
 * Google Earth Engine (GEE) Script: Sentinel-2 NDMI for Udupi Pilot Corridor
 * 
 * Project: SALT-LINE
 * Product: NDMI (vegetation moisture indicator)
 * Purpose: Reproducible cloud-free dry-season extraction for coastal Karnataka
 */

// 1. Define Pilot Extent (Udupi Coastal Corridor)
var udupi_pilot = ee.Geometry.Polygon([
  [
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
]);

// 2. Filter Sentinel-2 Surface Reflectance (Level-2A)
// Dry season: March 2026 (Peak dry season in Udupi, cloud cover < 5%)
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(udupi_pilot)
  .filterDate('2026-03-01', '2026-03-25')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
  .sort('CLOUDY_PIXEL_PERCENTAGE')
  .first();

// Cloud masking using Scene Classification Layer (SCL)
var scl = s2.select('SCL');
var cloudMask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
var s2Clean = s2.updateMask(cloudMask);

// 3. Compute NDMI = (B8 - B11) / (B8 + B11)
// B8 = NIR (~842 nm, 10m native)
// B11 = SWIR-1 (~1610 nm, 20m native)
var nir = s2Clean.select('B8');
var swir1 = s2Clean.select('B11');
var ndmi = nir.subtract(swir1).divide(nir.add(swir1)).rename('ndmi_vegetation_moisture');

// Clip to pilot boundary
var ndmiPilot = ndmi.clip(udupi_pilot);

// 4. Visualisation Palette
var ndmiVis = {
  min: -0.1,
  max: 0.45,
  palette: ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641']
};

Map.centerObject(udupi_pilot, 11);
Map.addLayer(udupi_pilot, {color: 'blue'}, 'Udupi Pilot Boundary', false);
Map.addLayer(ndmiPilot, ndmiVis, 'NDMI (vegetation moisture indicator)');

// 5. Export Task to Google Drive / Asset for downstream vectorisation
Export.image.toDrive({
  image: ndmiPilot,
  description: 'Sentinel2_NDMI_Udupi_Pilot_20260312',
  scale: 20,
  region: udupi_pilot,
  fileFormat: 'GeoTIFF',
  maxPixels: 1e9
});
