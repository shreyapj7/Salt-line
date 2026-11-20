import type { Lang, MonitoringLocation, RiskLevel } from '@/types';

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#4D9B89',
  moderate: '#A7B68A',
  elevated: '#A75030',
  high: '#B4483C',
};

export function riskColorForScore(score: number): string {
  if (score < 0.25) return RISK_COLORS.low;
  if (score < 0.5) return RISK_COLORS.moderate;
  if (score < 0.72) return RISK_COLORS.elevated;
  return RISK_COLORS.high;
}

/** Continuous priority heat colour: blue/cyan -> yellow -> orange/coral. */
export function heatColor01(v01: number): string {
  const t = Math.min(1, Math.max(0, v01));
  const stops: [number, number, number][] = [
    [77, 155, 137],
    [167, 182, 138],
    [214, 197, 165],
    [180, 72, 60],
  ];
  const seg = Math.min(2, Math.floor(t * 3));
  const local = t * 3 - seg;
  const a = stops[seg];
  const b = stops[seg + 1];
  const mix = a.map((av, i) => Math.round(av + (b[i] - av) * local));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

/** Normalise a demonstration grid of a given field to 0–1 for colouring. */
export function normalizeValues(values: number[]): number[] {
  if (values.length === 0) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  return values.map((v) => (v - min) / span);
}

export function fmtNum(v: number | undefined | null, digits = 1): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return '—';
  return v.toFixed(digits);
}

export function fmtPct(v: number | undefined | null, digits = 0): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtCoord(lat: number, lng: number): string {
  return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
}

export function fmtRefreshTime(iso: string | null, lang: Lang = 'en'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(lang === 'kn' ? 'kn-IN' : 'en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function localizedLocationName(
  loc: Pick<MonitoringLocation, 'name' | 'nameKn'>,
  lang: Lang,
): string {
  if ((lang === 'kn' || lang === 'tul') && loc.nameKn) return loc.nameKn;
  return loc.name;
}

const EVIDENCE_LABEL_KEYS: Record<string, string> = {
  '1 community report': 'evidenceItem.oneCommunityReport',
  'Elevation & coast distance': 'evidenceItem.elevationCoastDistance',
  'Simulated NDMI': 'evidenceItem.simulatedNdmi',
  'Groundwater head': 'evidenceItem.groundwaterHead',
  'Calibrated EC / TDS': 'evidenceItem.calibratedEcTds',
  'Verified station log': 'evidenceItem.verifiedStationLog',
  'Authority well log': 'evidenceItem.authorityWellLog',
  'Simulated sensor feed': 'evidenceItem.simulatedSensorFeed',
  'Rainfall deficit': 'evidenceItem.rainfallDeficit',
  'Calibrated TDS lab sample': 'evidenceItem.calibratedTdsSample',
  'Multi-season trend series': 'evidenceItem.multiSeasonTrend',
  'Verified community report': 'evidenceItem.verifiedCommunityReport',
  'Rainfall deficit cell': 'evidenceItem.rainfallDeficitCell',
  'Instrument EC / TDS': 'evidenceItem.instrumentEcTds',
  'Authority record': 'evidenceItem.authorityRecord',
  'Rainfall context': 'evidenceItem.rainfallContext',
  'Continuous EC series': 'evidenceItem.continuousEcSeries',
  'Community observation': 'evidenceItem.communityObservation',
  'Chloride / EC reading': 'evidenceItem.chlorideEcReading',
  'Degraded simulated sensor': 'evidenceItem.degradedSimulatedSensor',
  'Validated water-level probe reading': 'evidenceItem.validatedWaterLevelReading',
};

export function localizedEvidenceLabel(value: string, t: (key: string) => string): string {
  const key = EVIDENCE_LABEL_KEYS[value];
  return key ? t(key) : value;
}
