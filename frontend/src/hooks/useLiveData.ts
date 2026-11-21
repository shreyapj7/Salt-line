import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AssessmentPayload,
  AssessmentRequest,
  CommunityReport,
  MonitoringLocation,
  SensorDevice,
} from '@/types';
import { COMMUNITY_REPORTS, LOCATIONS, SENSOR_DEVICES } from '@/data/demoData';
import {
  fetchCommunityReports,
  fetchLocations,
  fetchSensorReadings,
  normalizeLocations,
  normalizeReports,
  normalizeSensorDevices,
  postAssessment,
} from '@/services/api';

export interface LiveState {
  locations: MonitoringLocation[];
  sensors: SensorDevice[];
  reports: CommunityReport[];
  locationsLive: boolean;
  sensorsLive: boolean;
  reportsLive: boolean;
  checked: boolean;
  refreshing: boolean;
  lastRefreshAt: string | null;
  lastSuccessAt: string | null;
  errorMessage: string | null;
  retry: () => void;
  submitAssessment: (
    locationId: string,
    payload: AssessmentPayload,
  ) => Promise<{ ok: boolean; live: boolean }>;
}

/**
 * Queries FastAPI endpoints on mount and at the configured interval.
 * Never replaces valid previously loaded live data with empty arrays on failure,
 * and falls back cleanly to clearly-labelled demonstration data when offline.
 */
export function useLiveData(autoRefreshMs = 60000): LiveState {
  const [state, setState] = useState<Omit<LiveState, 'retry' | 'submitAssessment'>>({
    locations: LOCATIONS,
    sensors: SENSOR_DEVICES,
    reports: COMMUNITY_REPORTS,
    locationsLive: false,
    sensorsLive: false,
    reportsLive: false,
    checked: false,
    refreshing: false,
    lastRefreshAt: null,
    lastSuccessAt: null,
    errorMessage: null,
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, refreshing: true }));

    const [locRes, sensRes, repRes] = await Promise.all([
      fetchLocations(),
      fetchSensorReadings(),
      fetchCommunityReports(),
    ]);

    if (!mountedRef.current) return;

    const locs = locRes.live ? normalizeLocations(locRes.data) : null;
    const sens = sensRes.live ? normalizeSensorDevices(sensRes.data) : null;
    const reps = repRes.live ? normalizeReports(repRes.data) : null;
    const nowIso = new Date().toISOString();
    const sourceErrors = [
      locRes.error ? `Locations: ${locRes.error}` : null,
      sensRes.error ? `Sensors: ${sensRes.error}` : null,
      repRes.error ? `Community reports: ${repRes.error}` : null,
    ].filter((error): error is string => error !== null);

    const anyLiveSuccess = Boolean(
      (locs && locs.length > 0) || (sens && sens.length > 0) || (reps && reps.length > 0),
    );

    setState((prev) => ({
      locations: locs && locs.length > 0 ? locs : prev.locations,
      sensors: sens && sens.length > 0 ? sens : prev.sensors,
      reports: reps && reps.length > 0 ? reps : prev.reports,
      locationsLive: Boolean(locs && locs.length > 0) || prev.locationsLive,
      sensorsLive: Boolean(sens && sens.length > 0) || prev.sensorsLive,
      reportsLive: Boolean(reps && reps.length > 0) || prev.reportsLive,
      checked: true,
      refreshing: false,
      lastRefreshAt: nowIso,
      lastSuccessAt: anyLiveSuccess ? nowIso : prev.lastSuccessAt,
      errorMessage: sourceErrors.length ? sourceErrors.join(' · ') : null,
    }));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (autoRefreshMs <= 0) return;
    const id = window.setInterval(() => {
      void load();
    }, autoRefreshMs);
    return () => window.clearInterval(id);
  }, [autoRefreshMs, load]);

  const submitAssessment = useCallback(
    async (locationId: string, _payload: AssessmentPayload) => {
      const request: AssessmentRequest = {
        risk_indicators: { E: null, G: null, P: null, V: null, C: null },
        confidence_indicators: { Q: null, F: null, C: null, S: null },
        monitoring_indicators: { N: null, D: null, M: null },
      };
      const res = await postAssessment(locationId, request);
      return { ok: res.live, live: res.live };
    },
    [],
  );

  return { ...state, retry: () => void load(), submitAssessment };
}
