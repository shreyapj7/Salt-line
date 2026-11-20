# SALT-LINE Data Validation

## 1. Purpose

Validate sensor, geospatial and community data before evidence
is considered by SALT-LINE.

Validation does not calculate groundwater salinity or risk scores.

## 2. Evidence modes

### Demo mode
Allows structurally valid simulated data to demonstrate the
complete SALT-LINE workflow.

Examples:
- Wokwi sensor readings
- Synthetic integration readings
- Simulated NDMI
- Sample community reports

Demo eligibility does not establish real-world evidence.

### Operational mode
Requires validated provenance, measurement quality,
location association and applicable verification.

Simulated data is never operational evidence.

## 3. Sensor validation

- Raw ADC range: 0–4095.
- ADC values are not calibrated TDS.
- Voltage range: 0–3.3 V.
- TDS units: ppm or mg/L.
- Calibration profiles must be explicitly supplied and validated.
- Timestamps must contain timezone information.
- Future timestamps are rejected.
- Stale readings are flagged.
- Sensor registration and location association are required.
- Wokwi and synthetic sources remain demo-only.

No calibration formula is assumed.

## 4. Geospatial validation

- Location coordinates use longitude/latitude.
- Project GeoJSON datasets declare CRS84.
- Supported geometries: Point, Polygon and MultiPolygon.
- Missing and invalid geometries are flagged.
- Multiple polygon matches remain ambiguous.
- Missing matches remain unmatched.
- NDMI is simulation-only and is not salinity evidence.
- Missing groundwater head remains unknown.

## 5. Community validation

- Reports retain their original IDs.
- Location IDs must exist in the authoritative registry.
- Timestamps must be timezone-aware and not future-dated.
- Verification status is preserved.
- Unverified reports remain unverified.
- Duplicate submissions are identified without deleting records.
- Conflicting observations are flagged for review.
- Categories are optional because the current API schema
  does not persist a category field.

## 6. Provenance

Original source information must be preserved.

A successful validation does not automatically establish
the reliability of the underlying measurement.

## 7. Known limitations

- Community conflict detection currently uses keyword rules.
- Geometry validation currently performs structural checks,
  not complete topological validation.
- TDS calibration requires externally validated profiles.
- Staleness thresholds are configurable.
- Simulated NDMI cannot establish groundwater salinity.

## 8. Test coverage

Tests cover sensor, GIS and community validation, including
invalid, missing, simulated, stale, duplicate, conflicting
and ambiguous inputs.
