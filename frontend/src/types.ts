// ── Domain types ─────────────────────────────────────────────────────

export type Lang = 'en' | 'kn';

export type VerificationStatus = 'authority' | 'community' | 'candidate' | 'pending';

export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high';

export type DataOrigin = 'live' | 'demo';

export interface MonitoringLocation {
  id: string;
  name: string;
  nameKn?: string;
  lat: number;
  lng: number;
  type: 'station' | 'community';
  verification: VerificationStatus;
  /** Local body / Grama Panchayat */
  admin: string;
  /** Metres above sea level */
  elevation?: number;
  /** Kilometres to shoreline */
  distanceToCoast?: number;
  /** % departure from normal seasonal rainfall */
  rainfallDeficitPct?: number;
  /** Normalized Difference Moisture Index (vegetation moisture proxy, NOT groundwater salinity) */
  ndmi?: number;
  ndmiSimulated: boolean;
  /** Metres above sea level, groundwater head */
  gwHeadM?: number;
  risk?: RiskLevel;
  confidence?: number;
  coverage?: number;
  source: string;
  dataOrigin?: DataOrigin;
  lastObservation?: string;
  provisionalPriority?: number;
  priorityReason?: string;
  priorityReasonKey?: string;
  availableEvidence?: string[];
  missingEvidence?: string[];
  suggestedMeasurement?: string;
  suggestedMeasurementKey?: string;
}

export interface GridCell {
  id: string;
  /** SW corner */
  lat: number;
  lng: number;
  /** Degrees */
  sizeDeg: number;
  value: number;
  provisional: boolean;
}

export interface SensorDevice {
  deviceId: string;
  label: string;
  site: string;
  locationId?: string;
  status: 'online' | 'degraded' | 'offline';
  simulated: boolean;
  dataOrigin?: DataOrigin;
  latest: {
    receivedAt: string;
    tdsAdcRaw: number | null;
    waterLevelAdcRaw: number | null;
    temperatureC: number | null;
    warnings: string[];
    source: string;
  } | null;
}

export interface CommunityReport {
  id: string;
  locationId?: string;
  locationName: string;
  lat: number;
  lng: number;
  category: string;
  categoryKey?: string;
  submittedAt: string;
  submittedBy?: string;
  verification: 'verified' | 'unverified' | 'rejected';
  details: string;
  detailsKey?: string;
  dataOrigin?: DataOrigin;
}

export interface TimelineEvent {
  id: string;
  kind: 'rainfall' | 'sensor' | 'community' | 'assessment' | 'monitoring';
  label: string;
  labelKey?: string;
  detail: string;
  detailKey?: string;
  at: string;
  locationId?: string;
  dataOrigin?: DataOrigin;
}

export interface AdaptiveCandidate {
  locationId: string;
  name: string;
  nameKn?: string;
  verification: VerificationStatus;
  priority: number;
  reason: string;
  reasonKey?: string;
  availableEvidence: string[];
  missingEvidence: string[];
  confidence: number;
  coverage: number;
  suggestedMeasurement: string;
  suggestedMeasurementKey?: string;
  lastObservation?: string;
  provisional: boolean;
}

export interface AssessmentPayload {
  notes: string;
  fieldEcUsCm?: number;
  waterLevelM?: number;
  observer?: string;
}
