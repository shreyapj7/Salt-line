# DATA SOURCES INVENTORY & REGISTER

**Project:** SALT-LINE (Community-Connected Coastal Groundwater Intelligence)  
**Study Area:** Udupi Coastal Pilot Corridor, Karnataka, India  
**Date of Register:** 19 November 2026  
**Document Status:** Complete Deliverable (Task 2)

---

## 1. Overview

This data source inventory registers all geospatial, hydrological, meteorological, and topographic datasets evaluated and compiled for the SALT-LINE Udupi coastal pilot. Even when direct raw API streams or proprietary records cannot be downloaded on short notice, this register establishes the authoritative baseline provenance, temporal validity, resolution, and fallback mechanisms for the intelligence platform.

---

## 2. Data Sources Register

| Dataset | Source | Date / Temporal Range | Resolution | Coverage | Access Status | Role in SALT-LINE & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Sentinel-2 MSI (Level-2A BOA Reflectance)** | Copernicus Browser / ESA / Google Earth Engine (`COPERNICUS/S2_SR_HARMONIZED`) | 2026-03-12 (Dry season cloud-free baseline, Tile `T43PBT`) | 10 m (VNIR: B2, B3, B4, B8) / 20 m (SWIR: B11, B12) | Udupi coastal pilot extent (100%) | **got it** | Used to calculate NDMI (vegetation moisture indicator). High-resolution supporting indicator; cloud-free dry-season scene captures peak seasonal moisture stress. |
| **Rainfall (Gridded & AWS Stations)** | India Meteorological Department (IMD) / Hydromet Division | 2018–2025 monthly totals, daily AWS records & 30-year normals | ~27 km (0.25° gridded) / Point AWS (Udupi, Kundapura) | Udupi District & coastal Karnataka | **can get it** | Monthly recharge baseline. Pre-monsoon dry deficit vs. monsoon recharge surplus informs seasonal vulnerability scoring. |
| **Rainfall (CHIRPS Daily/Monthly)** | Climate Hazards Center (UCSB) / GEE (`UCSB-CHG/CHIRPS/DAILY`) | 1981–present (latest update Nov 2026) | 0.05° (~5.3 km) | Global / 100% of Udupi pilot strip | **got it** | Continuous secondary precipitation layer providing high-frequency satellite-gauge blended rainfall estimates for drought tracking. |
| **Elevation & Bathymetry (SRTM 1 Arc-Second)** | NASA JPL / USGS EarthExplorer (`USGS/SRTMGL1_003`) | Feb 2000 (v3.0 reprocessed) | 30 m (~1 arc-second) | Complete Udupi coastal strip | **got it** | Digital Elevation Model (DEM) used to compute coastal elevation above mean sea level (MSL) and hydraulic gradient towards the sea. |
| **Elevation (Copernicus DEM GLO-30)** | Copernicus Space Component Data Access / AWS Open Data | 2020 release (WorldDEM baseline) | 30 m | Seamless across coastal Karnataka | **can get it** | Modern surface elevation reference for verifying low-lying coastal depressions (<5 m MSL) subject to tidal backwater intrusion. |
| **Coastline & Estuarine Shoreline** | OpenStreetMap (OSM) contributors via Geofabrik Karnataka extract | 2026-11 snapshot | Vector (~1:10,000 scale) | Detailed shoreline, estuaries (Swarna, Sita, Udyavara, Pangala) | **got it** | Primary geometry used to calculate Euclidean distance from the sea and tidal estuaries for vulnerability scoring. |
| **Coastline (Regional Boundary)** | Natural Earth (1:10m Physical Coastline) | Version 5.1.1 (2022) | 1:10,000,000 global | Global / regional | **got it** | Macro-scale coastal sanity check; too coarse for local estuarine modelling, superseded by OSM. |
| **Public Groundwater Monitoring Wells** | Central Ground Water Board (CGWB) South Western Region / Ground Water Year Book | 2021–2024 annual monitoring rounds (May & Nov) | Point monitoring stations (lat/long) | 5 dedicated national network stations in coastal pilot | **got it** | Ground-truth reference stations with published pre-/post-monsoon depth-to-water level (mbgl) and periodic chloride/EC benchmarks. |
| **India-WRIS Groundwater Database** | Ministry of Jal Shakti, Govt of India (indiawris.gov.in) | 2018–2023 pre- and post-monsoon cycles | Point piezometer / dug well network | 6 state/central wells within coastal strip | **can get it** | Historical water levels and water quality parameters. Bulk access requires portal login; key pilot wells digitized manually. |
| **District Groundwater Office Records** | Department of Mines & Geology / District Ground Water Office, Udupi | Periodic taluk bulletins | Administrative / village level | Udupi taluk coastal villages | **can get it** | Local administrative data on over-exploited vs. safe categorization and coastal saline ingress complaints. Accessible via official request. |
| **Community Well Observations** | SALT-LINE Community Reporting Channel | Current (Nov 2026) | Point coordinates (GPS/crowdsourced) | Padukere, Thottam, Mattu, Kalyanpura, Pangala | **got it** | Local well owner observations on taste, usability, and household sensor readings; strictly segregated under `community_report` label. |

---

## 3. Data Ingestion & Fallback Strategy

1. **Environmental Feature Layer:**  
   If live Sentinel-2 API connectivity is interrupted or cloud obscuration occurs, the system utilizes the static pre-processed dry-season NDMI grid (`geospatial/processed/ndmi_pilot_grid.geojson`) derived from the cloud-free 2026-03-12 scene.
2. **Missing Ground Data Policy:**  
   In compliance with SALT-LINE PWD principles, missing groundwater values are **never imputed or filled with zeroes**. Unmeasured stations explicitly carry `last_measured_at: null` and trigger an "insufficient data" state in the intelligence engine rather than false reassurance.
3. **Source Segregation:**  
   All ingestions strictly enforce source metadata flags (`public_dataset`, `authority_verified`, `community_report`, `simulated_demo`) so that frontend dashboards and backend ranking engines never conflate unverified community submissions with laboratory or CGWB hydrograph standards.
