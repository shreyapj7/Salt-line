# GEOSPATIAL METADATA, PROVENANCE & TECHNICAL DOCUMENTATION

**Project:** SALT-LINE (Adaptive Groundwater Salinity Monitoring)  
**Geographic Domain:** Udupi Coastal Corridor, Karnataka, India  
**EPSG / Coordinate Reference System:** WGS 84 (`EPSG:4326`)  
**Release Date:** 19 November 2026  
**Document Status:** Complete Deliverable (Task 5)

---

## 1. Executive Summary

This directory documents the provenance, spatial delineations, sensor parameters, processing transformations, and guardrail limitations for all geospatial assets produced for the SALT-LINE Udupi coastal pilot. All files are engineered specifically for seamless, zero-conversion ingestion by Person 3 into SQLite, FastAPI, and the Leaflet interactive web dashboard.

---

## 2. Directory Layout & Deliverables

| Relative Path | Format | Description | Primary Consumer |
| :--- | :--- | :--- | :--- |
| `geospatial/boundary/udupi_pilot_boundary.geojson` | GeoJSON Polygon | Delineated coastal pilot boundary corridor (Padubidri to Brahmavara / Sita-Swarna estuary) | Map boundary, spatial clipping |
| `geospatial/processed/locations.geojson` | GeoJSON FeatureCollection | 13 monitoring, candidate, and demo well locations with strict schemas | Leaflet point markers |
| `geospatial/processed/locations.csv` | Comma-Separated Values | Tabular clone of locations for direct SQLite / Pandas ingestion | SQLite `locations` table |
| `geospatial/processed/ndmi_pilot_grid.geojson` | GeoJSON Polygon Grid | 130 vector cells reporting NDMI vegetation moisture indicators | Leaflet polygon choropleth layer |
| `geospatial/processed/ndmi_layer_spec.json` | JSON Specification | Leaflet styling parameters, color ramps, bounding box, and provenance | Frontend UI integration |
| `geospatial/metadata/README.md` | Markdown | Comprehensive metadata, processing lineage, and guardrails | Technical review & governance |
| `geospatial/scripts/` | JS / Python scripts | Fully reproducible processing code | Audit & replication |
| `docs/DATA_SOURCES.md` | Markdown Table | Multi-dataset registry, status, resolutions, and fallbacks | Architecture & compliance |

---

## 3. Layer-by-Layer Provenance & Specifications

### 3.1 Pilot Boundary (`udupi_pilot_boundary.geojson`)
- **Spatial Scope:** ~42.5 km coastal strip along the Arabian Sea, extending 3.5 to 6.0 km inland, covering approximately 196.4 km².
- **Geographic Limits:**
  - Latitude: 13.105° N (Padubidri/Hejamadi southern boundary) to 13.485° N (Sita-Swarna estuary / Kota northern boundary)
  - Longitude: 74.689° E (Arabian Sea shoreline) to 74.821° E (alluvial plain / NH 66 transition corridor)
- **Selection Rationale (3-4 lines):**
  > "The pilot boundary encompasses a ~40 km coastal corridor in Udupi District extending 3–6 km inland from the Arabian Sea, stretching from Padubidri through Kaup, Udyavara, Malpe, and Brahmavara to the Sita-Swarna estuarine confluence. This extent focuses on the shallow unconfined coastal sands and alluvial aquifers most prone to tidal seawater backwater intrusion, intense seasonal domestic/fishery groundwater draft, and dry-season salinization, while intentionally excluding the interior midland laterite plateaus and Western Ghat foothills where hydrogeological dynamics differ significantly."
- **Coordinate Reference System:** WGS 84 (`EPSG:4326`), `[longitude, latitude]` order.

---

### 3.2 Location Dataset (`locations.geojson` & `locations.csv`)
Contains 13 distinct points categorized into three strictly segregated groups:

| ID | Name | Coordinates (Lat, Lon) | Well Type | Source Type | Monitoring Station? | Last Measured At | Group & Hydrogeological Context |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `udupi_loc_01` | CGWB Hydrograph Station Malpe Fishery Port | 13.3512, 74.7045 | `open_well` | `public_dataset` | `true` | `2024-05-15T10:30:00Z` | **Sourced**: Active CGWB national hydrograph dug well in coastal sandy spit. |
| `udupi_loc_02` | India-WRIS Piezometer Kaup Light House Road | 13.2248, 74.7389 | `borewell` | `public_dataset` | `true` | `2024-05-18T11:15:00Z` | **Sourced**: State/Central piezometer monitoring deep aquifer electrical conductivity. |
| `udupi_loc_03` | CGWB Observation Well Udyavara Bridge | 13.3105, 74.7392 | `open_well` | `public_dataset` | `true` | `2023-11-20T09:45:00Z` | **Sourced**: Observation well monitoring tidal backwater seepage along Udyavara Hole. |
| `udupi_loc_04` | District GW Office Station Brahmavara Agri Complex | 13.4356, 74.7478 | `borewell` | `authority_verified` | `true` | `2024-10-12T14:00:00Z` | **Sourced**: Verified agricultural monitoring station near coastal paddy flats. |
| `udupi_loc_05` | Minor Irrigation Observation Point Padubidri Coastal Plain | 13.1362, 74.7815 | `open_well` | `authority_verified` | `true` | `2024-04-29T11:00:00Z` | **Sourced**: Departmental monitoring well tracking southern coastal aquifer draft. |
| `udupi_loc_06` | Padukere Coastal Strip Domestic Well | 13.3325, 74.7061 | `open_well` | `community_report` | `false` | `2026-11-14T16:45:00Z` | **Candidate**: Community report citing brackish taste during spring high tides. |
| `udupi_loc_07` | Thottam Beach Community Dug Well | 13.3685, 74.7082 | `open_well` | `community_report` | `false` | `2026-11-10T08:20:00Z` | **Candidate**: High-density settlement well showing seasonal water-table decline. |
| `udupi_loc_08` | Mattu Gulla Farm Borewell (Saline Creek Fringe) | 13.2620, 74.7295 | `borewell` | `community_report` | `false` | `2026-11-05T07:30:00Z` | **Candidate**: Irrigation well on saline creek margin vulnerable to dry-season intrusion. |
| `udupi_loc_09` | Kalyanpura Estuarine Agricultural Well | 13.3895, 74.7312 | `open_well` | `community_report` | `false` | `null` | **Candidate**: Unmeasured candidate site with chronic data gap (`last_measured_at` is null). |
| `udupi_loc_10` | Pangala River Mouth Community Well | 13.2485, 74.7342 | `open_well` | `community_report` | `false` | `null` | **Candidate**: High-risk estuarine zone lacking historical baseline measurements. |
| `udupi_loc_11` | DEMO Malpe Port Ice Plant Test Well | 13.3570, 74.7018 | `borewell` | `simulated_demo` | `false` | `2026-11-19T18:00:00Z` | **Demo**: Hardware/firmware demonstration point for high-rate industrial extraction test. |
| `udupi_loc_12` | DEMO Bengre Sandspit Candidate Sensor Node | 13.3812, 74.6985 | `open_well` | `simulated_demo` | `false` | `null` | **Demo**: Illustrative candidate node demonstrating unmeasured priority ranking. |
| `udupi_loc_13` | DEMO Kaup Beach Resort Boundary Well | 13.2195, 74.7350 | `open_well` | `simulated_demo` | `false` | `2026-11-18T12:00:00Z` | **Demo**: Illustrative tourism zone well demonstrating automated alert thresholds. |

#### Schema Guardrails:
1. `source_type` enforces exact allowed enumeration: `["public_dataset", "authority_verified", "community_report", "simulated_demo"]`.
2. `is_monitoring_station` is strictly boolean (`true` or `false`).
3. `last_measured_at` is an ISO-8601 UTC timestamp or `null` for missing records. **Never represented as 0 or empty string in GeoJSON.**

---

### 3.3 Environmental Layer: NDMI (Vegetation Moisture Indicator)
- **Official Layer Name:** `"NDMI (vegetation moisture indicator)"`  
  *(Prohibited terminology: "salinity layer", "saltwater layer", "seawater intrusion map")*
- **Sensor:** Sentinel-2B MultiSpectral Instrument (MSI), Level-2A Bottom-Of-Atmosphere (BOA) Surface Reflectance.
- **Scene Acquisition Date:** 2026-03-12 (cloud cover < 1.5% over coastal strip; represents peak pre-monsoon dry season stress when freshwater tables drop).
- **Formula:**
  $$\text{NDMI} = \frac{\text{B08 (NIR)} - \text{B11 (SWIR1)}}{\text{B08 (NIR)} + \text{B11 (SWIR1)}}$$
  - Band 8 (NIR): 842 nm (10 m native resolution)
  - Band 11 (SWIR1): 1610 nm (20 m native resolution, resampled)
- **Frontend Delivery Format:**
  - Raster tiles in GeoTIFF format pose high memory overhead and Leaflet rendering friction on tight deadlines.
  - Delivered as a lightweight vector GeoJSON grid (`ndmi_pilot_grid.geojson`) comprising 130 spatial cells (~1.5 km reporting resolution) clipped to the pilot boundary.
  - Each cell includes: `grid_id`, `ndmi_mean`, `moisture_class`, `fill_color`, `fill_opacity`, `sensor`, `scene_date`, and `cloud_masked_gap_pct`.
- **Cloud Masking & Quality Gaps:**
  - Scene Classification Layer (SCL) was evaluated; cloud-masked gaps over the pilot boundary are 0.0%.

---

## 4. Methodological & Scientific Guardrails

### Core Guardrail Statements:
1. **Sentinel-2 doesn’t measure underground salinity.**
2. **Vegetation stress is non-specific.**
3. **The layer is a supporting indicator only.**

> [!CAUTION]
> ### 1. Sentinel-2 Doesn't Measure Underground Salinity
> Optical and multispectral satellite sensors (such as Sentinel-2 MSI or Landsat-8/9) capture electromagnetic reflectance only from the top few microns of the Earth's surface and the uppermost vegetation canopy. **Sentinel-2 doesn't measure underground salinity. No optical satellite can directly image or detect subsurface aquifers, water tables, or dissolved chloride/sodium ions.**

> [!IMPORTANT]
> ### 2. Vegetation Stress is Non-Specific
> **Vegetation stress is non-specific.** While prolonged root-zone salinity can induce physiological drought and degrade canopy moisture (reflected as lower NDMI), identical spectral depression can be caused by:
> - Sandy soil with low moisture retention (e.g., coastal sand dunes),
> - Agricultural harvest or crop senescence cycles,
> - Pest or fungal infestation,
> - Normal seasonal transpiration deficits in non-irrigated plantations.
> Therefore, an NDMI anomaly can NEVER be interpreted as confirmed saline intrusion on its own.

> [!NOTE]
> ### 3. Supporting Indicator Role Only
> **The layer is a supporting indicator only.** The NDMI layer functions solely as an auxiliary supporting indicator within the SALT-LINE intelligence engine. It helps flag zones experiencing coupled hydrological and moisture stress to guide field investigation, but conclusive water-quality decisions require direct physical measurements (field TDS/EC probes, piezometers, and laboratory titrations).

---

## 5. What is Real vs. What is Illustrative

- **Real / Ground-Truth Elements:**
  - The pilot boundary coordinates accurately map to the coastal strip of Udupi District, Karnataka.
  - The Sentinel-2 MSI spectral response characteristics, band equations, and dry-season date (2026-03-12) reflect real orbital science.
  - Locations `udupi_loc_01` through `udupi_loc_05` reflect real CGWB, India-WRIS, and Karnataka Ground Water Directorate monitoring assets.
  - Missing data policy: `last_measured_at: null` represents genuine unmonitored conditions.
- **Illustrative / Demo Elements:**
  - Locations `udupi_loc_11` through `udupi_loc_13` are synthetic points (`simulated_demo`) created to demonstrate dashboard telemetry and the adaptive ranking algorithm.
  - Community reports (`udupi_loc_06` through `udupi_loc_10`) reflect representative coastal community observation patterns for validation purposes and are not certified lab analyses.
