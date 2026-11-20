import { X, AlertTriangle, Send, CheckCircle2, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import type { MonitoringLocation } from '@/types';
import type { LiveState } from '@/hooks/useLiveData';
import { fetchLocationContext, normalizeLocationContext } from '@/services/api';
import {
  fmtNum,
  fmtPct,
  fmtCoord,
  RISK_COLORS,
  localizedLocationName,
} from '@/lib/format';

interface Props {
  location: MonitoringLocation | null;
  live: LiveState;
  onClose: () => void;
}

function Row({
  label,
  value,
  mono = true,
  muted = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-1 hover:bg-ink-800/60 transition-colors">
      <span className="text-[11px] text-ink-400 shrink-0">{label}</span>
      <span
        className={`text-[11px] text-right ${muted ? 'text-ink-400 italic' : 'text-ink-100'} ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function verificationBadge(v: MonitoringLocation['verification'], label: string) {
  const styles: Record<MonitoringLocation['verification'], string> = {
    authority: 'border-success-bright/50 text-success-pale bg-success-deep/50',
    community: 'border-teal-400/50 text-teal-300 bg-teal-850/60',
    candidate: 'border-earth-sand/50 text-earth-sand bg-earth-clay/15',
    pending: 'border-ink-500 text-ink-300 bg-ink-800',
  };
  return (
    <span className={`px-1.5 py-px rounded-sm border text-[10px] tracking-wide ${styles[v]}`}>
      {label}
    </span>
  );
}

export default function LocationPanel({ location, live, onClose }: Props) {
  const { t, lang } = useI18n();
  const [ctxState, setCtxState] = useState<{
    loading: boolean;
    live: boolean;
    patch: Partial<MonitoringLocation> | null;
    error: string | null;
  }>({ loading: false, live: false, patch: null, error: null });

  const [ecInput, setEcInput] = useState('');
  const [wlInput, setWlInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'none' | 'live' | 'local'>('none');

  useEffect(() => {
    setSubmitStatus('none');
    setEcInput('');
    setWlInput('');
    setNotesInput('');
    if (!location) return;
    let cancelled = false;
    setCtxState({ loading: true, live: false, patch: null, error: null });
    fetchLocationContext(location.id).then((res) => {
      if (cancelled) return;
      const patch = res.live ? normalizeLocationContext(res.data) : null;
      setCtxState({ loading: false, live: res.live, patch, error: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [location?.id]);

  if (!location) {
    return (
      <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-earth-gold/60 bg-ink-900">
        <PanelHeader title={t('right.title')} onClose={onClose} closable={false} />
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-2">
          <Info size={20} className="text-ink-500" />
          <p className="text-[12px] leading-[1.6] text-ink-300">{t('right.empty')}</p>
        </div>
      </aside>
    );
  }

  const merged: MonitoringLocation = ctxState.patch ? { ...location, ...ctxState.patch } : location;

  const missing: string[] = merged.missingEvidence?.length ? [...merged.missingEvidence] : [];
  if (!merged.missingEvidence?.length) {
    if (merged.gwHeadM === undefined) missing.push(t('right.gwHead'));
    if (merged.ndmi === undefined) missing.push(t('right.ndmi'));
    if (merged.distanceToCoast === undefined) missing.push(t('right.coastDist'));
    if (merged.rainfallDeficitPct === undefined) missing.push(t('right.rainfall'));
    if (merged.verification !== 'authority') missing.push(t('ver.authority'));
  }

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesInput.trim() && !ecInput.trim() && !wlInput.trim()) return;
    setSubmitting(true);
    const ecVal = ecInput.trim() ? Number(ecInput) : undefined;
    const wlVal = wlInput.trim() ? Number(wlInput) : undefined;
    const res = await live.submitAssessment(merged.id, {
      notes: notesInput.trim() || t('right.defaultAssessmentNote'),
      fieldEcUsCm: Number.isFinite(ecVal) ? ecVal : undefined,
      waterLevelM: Number.isFinite(wlVal) ? wlVal : undefined,
    });
    setSubmitting(false);
    setSubmitStatus(res.live ? 'live' : 'local');
    setNotesInput('');
  };

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col overflow-y-auto border-l border-earth-gold/60 bg-ink-900">
      <PanelHeader title={t('right.title')} onClose={onClose} closable />

      <div className="px-3 py-2.5 border-b border-ink-700">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-ink-100 leading-snug">
            {localizedLocationName(merged, lang)}
          </h3>
          <span className="font-mono text-[10px] text-ink-400 shrink-0">{merged.id}</span>
        </div>
        {lang === 'en' && merged.nameKn && (
          <div className="text-[11px] text-ink-400 mt-0.5">{merged.nameKn}</div>
        )}
        <p className="text-[11px] text-ink-300 mt-0.5">{merged.admin}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {verificationBadge(merged.verification, t(`ver.${merged.verification}`))}
          {merged.ndmiSimulated && (
            <span className="px-1.5 py-px rounded-sm border border-risk-moderate/60 text-risk-moderate text-[10px] tracking-wide">
              NDMI {t('layers.simulated')}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-ink-800 border-b border-ink-700 py-0.5">
        <Row label={t('right.id')} value={merged.id} />
        <Row label={t('right.coords')} value={fmtCoord(merged.lat, merged.lng)} />
        <Row label={t('right.verification')} mono={false} value={t(`ver.${merged.verification}`)} />
        <Row label={t('right.source')} value={merged.source} mono={false} />
        <Row
          label={t('right.gwHead')}
          value={merged.gwHeadM !== undefined ? `${fmtNum(merged.gwHeadM)} m` : t('right.notAvailable')}
          muted={merged.gwHeadM === undefined}
        />
        <Row
          label={t('right.rainfall')}
          value={
            merged.rainfallDeficitPct !== undefined
              ? `${fmtNum(merged.rainfallDeficitPct)}%`
              : t('right.notAvailable')
          }
          muted={merged.rainfallDeficitPct === undefined}
        />
        <Row
          label={t('right.elevation')}
          value={merged.elevation !== undefined ? `${merged.elevation} m` : t('right.notAvailable')}
          muted={merged.elevation === undefined}
        />
        <Row
          label={t('right.coastDist')}
          value={
            merged.distanceToCoast !== undefined
              ? `${merged.distanceToCoast} km`
              : t('right.notAvailable')
          }
          muted={merged.distanceToCoast === undefined}
        />
        <Row
          label={t('right.ndmi')}
          value={
            merged.ndmi !== undefined
              ? `${fmtNum(merged.ndmi, 2)} (${t('layers.simulated')})`
              : t('right.notAvailable')
          }
          muted={merged.ndmi === undefined}
        />
      </div>

      {/* Provisional risk assessment */}
      {merged.risk && (
        <div className="px-3 py-2 border-b border-ink-700">
          <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-1">
            {t('right.risk')}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-sm text-[11px] font-semibold text-ink-950"
              style={{ background: RISK_COLORS[merged.risk] }}
            >
              {t(`risk.${merged.risk}`)}
            </span>
            <span className="text-[10px] text-ink-400">
              {merged.dataOrigin === 'live' ? t('common.live') : t('layers.demo')}
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-ink-400 leading-snug">
            {t('right.singleObsNote')}
          </p>
        </div>
      )}

      {/* Confidence & evidence coverage */}
      <div className="px-3 py-2.5 border-b border-ink-700 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-ink-400 mb-1">{t('right.confidence')}</div>
          <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-forest-bright"
              style={{ width: fmtPct(merged.confidence ?? 0) }}
            />
          </div>
          <div className="font-mono text-[10px] text-ink-200 mt-1">
            {merged.confidence !== undefined ? fmtPct(merged.confidence) : t('right.notAvailable')}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-ink-400 mb-1">{t('right.coverage')}</div>
          <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
            <div className="h-full bg-teal-400" style={{ width: fmtPct(merged.coverage ?? 0) }} />
          </div>
          <div className="font-mono text-[10px] text-ink-200 mt-1">
            {merged.coverage !== undefined ? fmtPct(merged.coverage) : t('right.notAvailable')}
          </div>
        </div>
      </div>

      {/* Missing evidence */}
      <div className="px-3 py-2 border-b border-ink-700">
        <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-1">
          {t('right.missing')}
        </div>
        {missing.length === 0 ? (
          <p className="text-[11px] text-forest-pale">{t('common.none')}</p>
        ) : (
          <ul className="space-y-0.5">
            {missing.map((m) => (
              <li key={m} className="text-[11px] text-risk-moderate flex items-center gap-1.5">
                <AlertTriangle size={10} className="shrink-0" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recommended next measurement */}
      <div className="px-3 py-2.5 border-b border-ink-700 space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider text-ink-400">
          {t('right.next')}
        </div>
        <div className="border border-forest-light/50 bg-forest-deep/35 rounded-sm p-2 space-y-1">
          <div className="text-[11px] font-medium text-forest-pale">
            {merged.suggestedMeasurementKey
              ? t(merged.suggestedMeasurementKey)
              : (merged.suggestedMeasurement ?? t('adaptive.suggested'))}
          </div>
          <div className="text-[10px] text-ink-300 leading-relaxed">
            <span className="text-ink-400">{t('right.whyNext')}: </span>
            {merged.priorityReasonKey
              ? t(merged.priorityReasonKey)
              : (merged.priorityReason ?? t('adaptive.provisional'))}
          </div>
        </div>
        {ctxState.loading && <p className="text-[10px] text-ink-400">{t('common.loading')}</p>}
        {!ctxState.loading && ctxState.live && (
          <p className="text-[10px] text-success-bright">{t('right.contextLive')}</p>
        )}
        {!ctxState.loading && !ctxState.live && (
          <p className="text-[10px] text-earth-clay">{t('right.contextFallback')}</p>
        )}
        {ctxState.error && (
          <p role="status" className="text-[9px] leading-relaxed text-ink-500">
            {t('common.errorDetail', { detail: ctxState.error })}
          </p>
        )}
      </div>

      {/* Interactive assessment logging (POST /api/v1/assessments/{location_id}) */}
      <form onSubmit={handleAssessmentSubmit} className="px-3 py-2.5 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-ink-400">
          {t('right.logAssessment')}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="number"
            step="any"
            value={ecInput}
            onChange={(e) => setEcInput(e.target.value)}
            placeholder={t('right.ecInput')}
            className="w-full px-2 py-1 text-[11px] font-mono bg-ink-900 border border-ink-600 rounded-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-forest-bright"
          />
          <input
            type="number"
            step="any"
            value={wlInput}
            onChange={(e) => setWlInput(e.target.value)}
            placeholder={t('right.wlInput')}
            className="w-full px-2 py-1 text-[11px] font-mono bg-ink-900 border border-ink-600 rounded-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-forest-bright"
          />
        </div>
        <textarea
          rows={2}
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          placeholder={t('right.notesInput')}
          className="w-full px-2 py-1 text-[11px] bg-ink-900 border border-ink-600 rounded-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-forest-bright resize-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-sm border border-forest-light bg-forest-deep hover:bg-forest-base text-forest-pale text-[11px] font-medium transition-colors disabled:opacity-50"
        >
          <Send size={11} />
          <span>{t('right.submitAssessment')}</span>
        </button>
        {submitStatus !== 'none' && (
          <div className="flex items-center gap-1.5 text-[10px] text-forest-bright">
            <CheckCircle2 size={11} />
            <span>
              {submitStatus === 'live' ? t('right.submittedLive') : t('right.submittedLocal')}
            </span>
          </div>
        )}
      </form>
    </aside>
  );
}

function PanelHeader({
  title,
  onClose,
  closable,
}: {
  title: string;
  onClose: () => void;
  closable: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="px-3 py-2 border-b border-ink-700 flex items-center justify-between bg-ink-900/60">
      <h2 className="text-[11px] font-semibold tracking-wider uppercase text-ink-200">{title}</h2>
      {closable && (
        <button
          onClick={onClose}
          className="p-1 rounded-sm text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors"
          title={t('right.close')}
          aria-label={t('right.close')}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
