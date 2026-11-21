import type {
  AssessmentRequest,
  AssessmentResponse,
  CommunityReport,
  IndicatorContribution,
  IndicatorExplanation,
  MonitoringLocation,
  SensorDevice,
  XAIResponse,
  AssessmentOutcome,
} from '@/types';

/**
 * FastAPI backend integration layer.
 * Preserves documented endpoints and normalizes GeoJSON, arrays, or { items } wrappers.
 * Gracefully falls back without throwing when the backend is offline.
 */

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export interface ApiResult<T> {
  data: T | null;
  live: boolean;
  error: string | null;
}

export interface CommunityReportSubmission {
  reporterId: string;
  locationId: string;
  latitude: number;
  longitude: number;
  observation: string;
}

async function getJson(path: string, timeoutMs = 4500): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${API_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
}

function httpError(path: string, status: number): string {
  return `HTTP ${status} · ${path}`;
}

function networkError(path: string): string {
  return `Backend unreachable · ${path}`;
}

function errResult<T>(error: string): ApiResult<T> {
  return { data: null, live: false, error };
}

export async function fetchSensorReadings(): Promise<ApiResult<unknown>> {
  try {
    const res = await getJson('/api/v1/sensor-readings');
    if (!res.ok) return errResult(httpError('/api/v1/sensor-readings', res.status));
    return { data: await res.json(), live: true, error: null };
  } catch {
    return errResult(networkError('/api/v1/sensor-readings'));
  }
}

export async function fetchLocations(): Promise<ApiResult<unknown>> {
  try {
    const res = await getJson('/api/v1/geospatial/locations');
    if (!res.ok) return errResult(httpError('/api/v1/geospatial/locations', res.status));
    return { data: await res.json(), live: true, error: null };
  } catch {
    return errResult(networkError('/api/v1/geospatial/locations'));
  }
}

export async function fetchLocationContext(locationId: string): Promise<ApiResult<unknown>> {
  const path = `/api/v1/geospatial/locations/${encodeURIComponent(locationId)}/context`;
  try {
    const res = await getJson(path);
    if (!res.ok) return errResult(httpError(path, res.status));
    return { data: await res.json(), live: true, error: null };
  } catch {
    return errResult(networkError(path));
  }
}

export async function fetchCommunityReports(): Promise<ApiResult<unknown>> {
  try {
    const res = await getJson('/api/v1/community/reports');
    if (!res.ok) return errResult(httpError('/api/v1/community/reports', res.status));
    return { data: await res.json(), live: true, error: null };
  } catch {
    return errResult(networkError('/api/v1/community/reports'));
  }
}

export async function postCommunityReport(
  report: CommunityReportSubmission,
): Promise<ApiResult<unknown>> {
  const path = '/api/v1/community/reports';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        reporter_id: report.reporterId,
        location_id: report.locationId,
        latitude: report.latitude,
        longitude: report.longitude,
        observation: report.observation,
      }),
    });
    if (!res.ok) return errResult(httpError(path, res.status));
    return { data: await res.json(), live: true, error: null };
  } catch {
    return errResult(networkError(path));
  } finally {
    clearTimeout(timer);
  }
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nullableNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : undefined;
}

function parseContribution(value: unknown): IndicatorContribution | null {
  const item = objectValue(value);
  if (!item) return null;
  const indicator = typeof item.indicator === 'string' ? item.indicator : undefined;
  const name = typeof item.name === 'string' ? item.name : undefined;
  return {
    indicator,
    name,
    value: nullableNumber(item.value),
    weight: nullableNumber(item.weight),
    contribution_points: nullableNumber(item.contribution_points),
  };
}

function parseExplanation(value: unknown): IndicatorExplanation | null {
  const item = objectValue(value);
  if (!item) return null;
  const contributions = Array.isArray(item.contributions)
    ? item.contributions.map(parseContribution).filter(
        (contribution): contribution is IndicatorContribution => contribution !== null,
      )
    : undefined;
  return {
    score: nullableNumber(item.score),
    status: typeof item.status === 'string' ? item.status : undefined,
    coverage: nullableNumber(item.coverage),
    contributions,
    missing_inputs: stringArray(item.missing_inputs),
    explanation: typeof item.explanation === 'string' ? item.explanation : undefined,
  };
}

function parseXai(value: unknown): XAIResponse | null {
  const item = objectValue(value);
  if (!item) return null;
  return {
    risk_explanation: parseExplanation(item.risk_explanation),
    confidence_explanation: parseExplanation(item.confidence_explanation),
    monitoring_explanation: parseExplanation(item.monitoring_explanation),
    limitations: stringArray(item.limitations),
    disclaimer: typeof item.disclaimer === 'string' ? item.disclaimer : undefined,
  };
}

function parseOutcome(value: unknown): AssessmentOutcome | null {
  const item = objectValue(value);
  if (!item) return null;
  return {
    score: nullableNumber(item.score),
    priority_score: nullableNumber(item.priority_score),
    status: typeof item.status === 'string' ? item.status : undefined,
    coverage: nullableNumber(item.coverage),
    missing_inputs: stringArray(item.missing_inputs),
    reasons: stringArray(item.reasons),
  };
}

function parseAssessmentResponse(value: unknown): AssessmentResponse | null {
  const item = objectValue(value);
  if (!item) return null;
  return {
    location_id: typeof item.location_id === 'string' ? item.location_id : undefined,
    assessment_mode: typeof item.assessment_mode === 'string' ? item.assessment_mode : undefined,
    risk: parseOutcome(item.risk),
    confidence: parseOutcome(item.confidence),
    monitoring: parseOutcome(item.monitoring),
    xai: parseXai(item.xai),
    notice: typeof item.notice === 'string' ? item.notice : undefined,
    recommendation: objectValue(item.recommendation) ?? undefined,
    geospatial_context: objectValue(item.geospatial_context) ?? undefined,
  };
}

export async function postAssessment(
  locationId: string,
  body: AssessmentRequest,
): Promise<ApiResult<AssessmentResponse>> {
  const path = `/api/v1/assessments/${encodeURIComponent(locationId)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return errResult(httpError(path, res.status));
    const data = parseAssessmentResponse(await res.json());
    if (!data) return errResult(`Invalid assessment response · ${path}`);
    return { data, live: true, error: null };
  } catch {
    return errResult(networkError(path));
  } finally {
    clearTimeout(timer);
  }
}

// ── Normalizers ──────────────────────────────────────────────────────

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function extractArray(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.locations)) return obj.locations;
  if (Array.isArray(obj.readings)) return obj.readings;
  if (Array.isArray(obj.reports)) return obj.reports;
  if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) return obj.features;
  return null;
}

function mapLocationRecord(raw: Record<string, unknown>, i: number): MonitoringLocation | null {
  // Support GeoJSON Feature { geometry: { coordinates: [lng, lat] }, properties: {...} }
  const props =
    raw.type === 'Feature' && raw.properties && typeof raw.properties === 'object'
      ? (raw.properties as Record<string, unknown>)
      : raw;
  const geom =
    raw.type === 'Feature' && raw.geometry && typeof raw.geometry === 'object'
      ? (raw.geometry as Record<string, unknown>)
      : null;
  const coords = geom && Array.isArray(geom.coordinates) ? geom.coordinates : null;

  const lat = num(props.lat ?? props.latitude ?? (coords ? coords[1] : undefined));
  const lng = num(props.lng ?? props.lon ?? props.longitude ?? (coords ? coords[0] : undefined));
  if (lat === undefined || lng === undefined) return null;

  const type = props.type === 'community' ? 'community' : 'station';
  const ver = props.verification;
  const riskRaw = typeof props.risk === 'string' ? props.risk.toLowerCase() : undefined;

  return {
    id: str(props.id ?? props.location_id ?? raw.id, `live-${i}`),
    name: str(props.name, 'Unnamed site'),
    nameKn: typeof props.name_kn === 'string' ? props.name_kn : undefined,
    lat,
    lng,
    type,
    verification: (ver === 'authority' || ver === 'community' || ver === 'candidate' || ver === 'pending'
      ? ver
      : 'pending') as MonitoringLocation['verification'],
    admin: str(props.admin ?? props.admin_unit, 'Udupi District'),
    elevation: num(props.elevation),
    distanceToCoast: num(props.distance_to_coast ?? props.distanceToCoast),
    rainfallDeficitPct: num(props.rainfall_deficit_pct ?? props.rainfallDeficitPct),
    ndmi: num(props.ndmi),
    ndmiSimulated: props.ndmi_simulated !== false,
    gwHeadM: num(props.gw_head_m ?? props.gwHeadM),
    risk: (riskRaw && ['low', 'moderate', 'elevated', 'high'].includes(riskRaw)
      ? riskRaw
      : undefined) as MonitoringLocation['risk'],
    confidence: num(props.confidence),
    coverage: num(props.coverage),
    source: str(props.source, 'Live backend API'),
    dataOrigin: 'live',
    lastObservation: typeof props.last_observation === 'string' ? props.last_observation : undefined,
    provisionalPriority: num(props.provisional_priority ?? props.provisionalPriority),
    priorityReason:
      typeof (props.priority_reason ?? props.priorityReason) === 'string'
        ? String(props.priority_reason ?? props.priorityReason)
        : undefined,
    availableEvidence: Array.isArray(props.available_evidence)
      ? props.available_evidence.filter((e): e is string => typeof e === 'string')
      : undefined,
    missingEvidence: Array.isArray(props.missing_evidence)
      ? props.missing_evidence.filter((e): e is string => typeof e === 'string')
      : undefined,
    suggestedMeasurement:
      typeof (props.suggested_measurement ?? props.suggestedMeasurement) === 'string'
        ? String(props.suggested_measurement ?? props.suggestedMeasurement)
        : undefined,
  };
}

export function normalizeLocations(payload: unknown): MonitoringLocation[] | null {
  const arr = extractArray(payload);
  if (!arr) return null;
  return arr
    .filter((it): it is Record<string, unknown> => it !== null && typeof it === 'object')
    .map(mapLocationRecord)
    .filter((x): x is MonitoringLocation => x !== null);
}

export function normalizeLocationContext(payload: unknown): Partial<MonitoringLocation> | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as Record<string, unknown>;
  const ctx =
    raw.context && typeof raw.context === 'object' ? (raw.context as Record<string, unknown>) : raw;
  const out: Partial<MonitoringLocation> = { dataOrigin: 'live' };

  const elev = num(ctx.elevation);
  const coast = num(ctx.distance_to_coast ?? ctx.distanceToCoast);
  const rain = num(ctx.rainfall_deficit_pct ?? ctx.rainfallDeficitPct);
  const ndmi = num(ctx.ndmi);
  const gw = num(ctx.gw_head_m ?? ctx.gwHeadM);
  const conf = num(ctx.confidence);
  const cov = num(ctx.coverage);
  const prio = num(ctx.provisional_priority ?? ctx.provisionalPriority);

  if (elev !== undefined) out.elevation = elev;
  if (coast !== undefined) out.distanceToCoast = coast;
  if (rain !== undefined) out.rainfallDeficitPct = rain;
  if (ndmi !== undefined) out.ndmi = ndmi;
  if (gw !== undefined) out.gwHeadM = gw;
  if (conf !== undefined) out.confidence = conf;
  if (cov !== undefined) out.coverage = cov;
  if (prio !== undefined) out.provisionalPriority = prio;
  if (typeof ctx.source === 'string') out.source = ctx.source;
  if (typeof ctx.priority_reason === 'string') out.priorityReason = ctx.priority_reason;
  if (typeof ctx.suggested_measurement === 'string') out.suggestedMeasurement = ctx.suggested_measurement;
  if (Array.isArray(ctx.missing_evidence)) {
    out.missingEvidence = ctx.missing_evidence.filter((e): e is string => typeof e === 'string');
  }
  if (Array.isArray(ctx.available_evidence)) {
    out.availableEvidence = ctx.available_evidence.filter((e): e is string => typeof e === 'string');
  }

  return out;
}

export function normalizeSensorDevices(payload: unknown): SensorDevice[] | null {
  const arr = extractArray(payload);
  if (!arr) return null;
  return arr
    .filter((it): it is Record<string, unknown> => it !== null && typeof it === 'object')
    .map((it, i) => {
      const latestRaw =
        it.latest && typeof it.latest === 'object' ? (it.latest as Record<string, unknown>) : it;
      const hasTelemetry =
        num(latestRaw.tds_adc_raw ?? latestRaw.tdsAdcRaw) !== undefined ||
        num(latestRaw.water_level_adc_raw ?? latestRaw.waterLevelAdcRaw) !== undefined;
      const sourceStr = str(latestRaw.source ?? it.source, 'Live backend');
      return {
        deviceId: str(it.device_id ?? it.deviceId, `device-${i}`),
        label: str(it.label, str(it.device_id ?? it.deviceId, `Device ${i + 1}`)),
        site: str(it.site ?? it.location_name, '—'),
        locationId: typeof it.location_id === 'string' ? it.location_id : undefined,
        status: (it.status === 'online' || it.status === 'degraded' || it.status === 'offline'
          ? it.status
          : hasTelemetry
            ? 'online'
            : 'offline') as SensorDevice['status'],
        simulated: it.simulated === true || sourceStr.toLowerCase().includes('wokwi'),
        dataOrigin: 'live' as const,
        latest: hasTelemetry || it.latest
          ? {
              receivedAt: str(latestRaw.received_at ?? latestRaw.receivedAt, new Date().toISOString()),
              tdsAdcRaw: num(latestRaw.tds_adc_raw ?? latestRaw.tdsAdcRaw) ?? null,
              waterLevelAdcRaw: num(latestRaw.water_level_adc_raw ?? latestRaw.waterLevelAdcRaw) ?? null,
              temperatureC: num(latestRaw.temperature_c ?? latestRaw.temperatureC) ?? null,
              warnings: Array.isArray(latestRaw.warnings)
                ? latestRaw.warnings.filter((w): w is string => typeof w === 'string')
                : [],
              source: sourceStr,
            }
          : null,
      } satisfies SensorDevice;
    });
}

export function normalizeReports(payload: unknown): CommunityReport[] | null {
  const arr = extractArray(payload);
  if (!arr) return null;
  return arr
    .filter((it): it is Record<string, unknown> => it !== null && typeof it === 'object')
    .map((it, i): CommunityReport | null => {
      const lat = num(it.lat ?? it.latitude);
      const lng = num(it.lng ?? it.lon ?? it.longitude);
      if (lat === undefined || lng === undefined) return null;
      const observation = str(it.details ?? it.description ?? it.observation, '—');
      const categoryFromObservation = observation.match(/^Category:\s*([^\r\n]+)/)?.[1];
      const ver = it.verification_status ?? it.verification;
      const reportId = it.id ?? it.report_id;
      return {
        id: typeof reportId === 'string' || typeof reportId === 'number'
          ? String(reportId)
          : `cr-live-${i}`,
        locationId: typeof it.location_id === 'string' ? it.location_id : undefined,
        locationName: str(it.location_name ?? it.locationName ?? it.location_id, 'Location not recorded'),
        lat,
        lng,
        category: str(it.category, categoryFromObservation ?? 'Community report'),
        submittedAt: str(it.submitted_at ?? it.submittedAt ?? it.reported_at, ''),
        submittedBy: typeof (it.submitted_by ?? it.reporter_id) === 'string'
          ? String(it.submitted_by ?? it.reporter_id)
          : undefined,
        verification: (ver === 'verified' || ver === 'unverified' || ver === 'rejected'
          ? ver
          : 'unverified') as CommunityReport['verification'],
        details: observation,
        dataOrigin: 'live' as const,
      };
    })
    .filter((report): report is CommunityReport => report !== null);
}
