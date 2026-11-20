import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, ClipboardList, MapPin, Target } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { LiveState } from '@/hooks/useLiveData';
import { ADAPTIVE_CANDIDATES } from '@/data/demoData';
import type { MonitoringLocation, RiskLevel, VerificationStatus } from '@/types';
import { fmtPct, localizedEvidenceLabel } from '@/lib/format';
import { EmptyState, KpiCard, Notice, PageCard, PageHeader, SourceLabel } from '@/components/PagePrimitives';

interface CandidateRow {
  locationId: string;
  name: string;
  priority?: number;
  reason?: string;
  reasonKey?: string;
  availableEvidence?: string[];
  missingEvidence?: string[];
  confidence?: number;
  suggestedMeasurement?: string;
  suggestedMeasurementKey?: string;
  lastObservation?: string;
  verification: VerificationStatus;
  risk?: RiskLevel;
  location?: MonitoringLocation;
}

interface AdaptiveMonitoringPageProps {
  live: LiveState;
  selectedId: string | null;
  onSelectLocation: (location: MonitoringLocation) => void;
  onOpenLocation: (location: MonitoringLocation) => void;
  onViewEvidence: () => void;
}

export default function AdaptiveMonitoringPage({
  live,
  selectedId,
  onSelectLocation,
  onOpenLocation,
  onViewEvidence,
}: AdaptiveMonitoringPageProps) {
  const { t } = useI18n();
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [verificationFilter, setVerificationFilter] = useState<VerificationStatus | 'all'>('all');
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'gaps' | 'no-gaps'>('all');
  const [minPriority, setMinPriority] = useState('');
  const [maxPriority, setMaxPriority] = useState('');

  const candidates = useMemo<CandidateRow[]>(() => {
    if (live.locationsLive) {
      return live.locations
        .filter(
          (location) =>
            location.provisionalPriority !== undefined ||
            location.verification === 'candidate' ||
            location.verification === 'pending',
        )
        .map((location) => ({
          locationId: location.id,
          name: location.name,
          priority: location.provisionalPriority,
          reason: location.priorityReason,
          reasonKey: location.priorityReasonKey,
          availableEvidence: location.availableEvidence,
          missingEvidence: location.missingEvidence,
          confidence: location.confidence,
          suggestedMeasurement: location.suggestedMeasurement,
          suggestedMeasurementKey: location.suggestedMeasurementKey,
          lastObservation: location.lastObservation,
          verification: location.verification,
          risk: location.risk,
          location,
        }));
    }

    return ADAPTIVE_CANDIDATES.map((candidate) => {
      const location = live.locations.find((item) => item.id === candidate.locationId);
      return {
        locationId: candidate.locationId,
        name: candidate.name,
        priority: candidate.priority,
        reason: candidate.reason,
        reasonKey: candidate.reasonKey,
        availableEvidence: candidate.availableEvidence,
        missingEvidence: candidate.missingEvidence,
        confidence: candidate.confidence,
        suggestedMeasurement: candidate.suggestedMeasurement,
        suggestedMeasurementKey: candidate.suggestedMeasurementKey,
        lastObservation: candidate.lastObservation,
        verification: candidate.verification,
        risk: location?.risk,
        location,
      };
    });
  }, [live.locations, live.locationsLive]);

  const sortedCandidates = [...candidates].sort((a, b) => {
    if (a.priority === undefined) return b.priority === undefined ? 0 : 1;
    if (b.priority === undefined) return -1;
    return b.priority - a.priority;
  });
  const numericMinimum = minPriority === '' ? undefined : Number(minPriority);
  const numericMaximum = maxPriority === '' ? undefined : Number(maxPriority);
  const filteredCandidates = sortedCandidates.filter((candidate) => {
    if (riskFilter !== 'all' && candidate.risk !== riskFilter) return false;
    if (verificationFilter !== 'all' && candidate.verification !== verificationFilter) return false;
    if (numericMinimum !== undefined && (candidate.priority === undefined || candidate.priority < numericMinimum)) {
      return false;
    }
    if (numericMaximum !== undefined && (candidate.priority === undefined || candidate.priority > numericMaximum)) {
      return false;
    }
    if (evidenceFilter === 'gaps' && !candidate.missingEvidence?.length) return false;
    if (
      evidenceFilter === 'no-gaps' &&
      (candidate.missingEvidence === undefined || candidate.missingEvidence.length > 0)
    ) {
      return false;
    }
    return true;
  });

  const scoredCandidates = candidates.filter(
    (candidate): candidate is CandidateRow & { priority: number } =>
      candidate.priority !== undefined,
  );
  const topCandidate = [...scoredCandidates].sort((a, b) => b.priority - a.priority)[0];
  const gapsCount = candidates.filter((candidate) => candidate.missingEvidence?.length).length;
  const confidenceValues = candidates
    .map((candidate) => candidate.confidence)
    .filter((value): value is number => value !== undefined);
  const meanConfidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : undefined;
  const selectedCandidate = candidates.find((candidate) => candidate.locationId === selectedId);

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-ink-950">
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 xl:p-8">
        <PageHeader
          eyebrow={t('field.eyebrow')}
          title={t('page.reportsFieldActions')}
          subtitle={t('field.subtitle')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SourceLabel live={live.locationsLive} />
              <button type="button" onClick={onViewEvidence} className="rounded-md border border-teal-500 px-3 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-850">
                {t('field.viewEvidence')}
              </button>
            </div>
          }
        />

        <Notice tone="warning">
          {t('method.priorityDetail')}
        </Notice>

        <section aria-label={t('field.metrics')} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={MapPin}
            label={t('field.candidateLocations')}
            value={candidates.length}
            detail={t('field.candidateDetail')}
          />
          <KpiCard
            icon={Target}
            label={t('field.highestScore')}
            value={topCandidate ? topCandidate.priority.toFixed(2) : t('common.notReported')}
            detail={topCandidate?.name ?? t('field.noScores')}
            accent="text-risk-elevated"
          />
          <KpiCard
            icon={AlertTriangle}
            label={t('field.gaps')}
            value={gapsCount}
            detail={t('field.explicitGaps')}
            accent="text-earth-sand"
          />
          <KpiCard
            icon={ClipboardList}
            label={t('field.meanConfidence')}
            value={meanConfidence === undefined ? t('common.notReported') : fmtPct(meanConfidence)}
            detail={t('field.locationsWithConfidence', { available: confidenceValues.length, total: candidates.length })}
            accent="text-teal-300"
          />
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
          <PageCard
            title={t('field.ranking')}
            subtitle={t('field.rankingSubtitle')}
            icon={Target}
          >
            <div className="grid grid-cols-1 gap-2 border-b border-ink-800 bg-ink-950/40 p-3 sm:grid-cols-2 xl:grid-cols-5">
              <label className="text-[9px] text-ink-500">
                {t('field.riskCategory')}
                <select
                  value={riskFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === 'all' ||
                      value === 'low' ||
                      value === 'moderate' ||
                      value === 'elevated' ||
                      value === 'high'
                    ) {
                      setRiskFilter(value);
                    }
                  }}
                  className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200"
                >
                  <option value="all">{t('field.allRisk')}</option>
                  <option value="low">{t('risk.low')}</option>
                  <option value="moderate">{t('risk.moderate')}</option>
                  <option value="elevated">{t('risk.elevated')}</option>
                  <option value="high">{t('risk.high')}</option>
                </select>
              </label>
              <label className="text-[9px] text-ink-500">
                {t('field.verification')}
                <select
                  value={verificationFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === 'all' ||
                      value === 'authority' ||
                      value === 'community' ||
                      value === 'candidate' ||
                      value === 'pending'
                    ) {
                      setVerificationFilter(value);
                    }
                  }}
                  className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200"
                >
                  <option value="all">{t('field.allStatuses')}</option>
                  <option value="authority">{t('ver.authority')}</option>
                  <option value="community">{t('ver.community')}</option>
                  <option value="candidate">{t('ver.candidate')}</option>
                  <option value="pending">{t('ver.pending')}</option>
                </select>
              </label>
              <label className="text-[9px] text-ink-500">
                {t('field.minimumScore')}
                <input
                  type="number"
                  step="any"
                  value={minPriority}
                  onChange={(event) => setMinPriority(event.target.value)}
                  placeholder={t('field.noMinimum')}
                  className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200 placeholder:text-ink-600"
                />
              </label>
              <label className="text-[9px] text-ink-500">
                {t('field.maximumScore')}
                <input
                  type="number"
                  step="any"
                  value={maxPriority}
                  onChange={(event) => setMaxPriority(event.target.value)}
                  placeholder={t('field.noMaximum')}
                  className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200 placeholder:text-ink-600"
                />
              </label>
              <label className="text-[9px] text-ink-500">
                {t('field.evidenceStatus')}
                <select
                  value={evidenceFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === 'all' || value === 'gaps' || value === 'no-gaps') {
                      setEvidenceFilter(value);
                    }
                  }}
                  className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200"
                >
                  <option value="all">{t('field.allEvidence')}</option>
                  <option value="gaps">{t('field.reportedGaps')}</option>
                  <option value="no-gaps">{t('field.noReportedGaps')}</option>
                </select>
              </label>
            </div>

            {filteredCandidates.length ? (
              <div className="divide-y divide-ink-800">
                {filteredCandidates.map((candidate, index) => {
                  const selected = selectedId === candidate.locationId;
                  const location = candidate.location;
                  return (
                    <article
                      key={candidate.locationId}
                      className={`grid gap-3 px-4 py-4 transition-colors lg:grid-cols-[minmax(0,1fr)_auto] ${
                        selected ? 'bg-forest-deep/25' : 'hover:bg-ink-850/70'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => candidate.location && onSelectLocation(candidate.location)}
                        className="min-w-0 text-left"
                        disabled={!location}
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] text-ink-500">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="text-[12px] font-semibold text-ink-100">
                            {candidate.name}
                          </span>
                        </span>
                        <span className="mt-1 block text-[10px] leading-relaxed text-ink-400">
                          {candidate.reasonKey
                            ? t(candidate.reasonKey)
                            : candidate.reason ?? t('field.priorityReasonMissing')}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-ink-500">
                          <span>{t('field.confidence', { value: candidate.confidence === undefined ? t('common.notReported') : fmtPct(candidate.confidence) })}</span>
                          <span>{t('field.verificationValue', { value: t(`ver.${candidate.verification}`) })}</span>
                          <span>{t('field.riskValue', { value: candidate.risk ? t(`risk.${candidate.risk}`) : t('common.notReported') })}</span>
                        </span>
                      </button>
                      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                        <span className="rounded-sm border border-forest-light/50 bg-forest-deep/30 px-2 py-1 font-mono text-[10px] text-forest-pale">
                          {candidate.priority === undefined
                            ? t('field.priorityNotReported')
                            : t('field.provisionalScore', { value: candidate.priority.toFixed(2) })}
                        </span>
                        {location && (
                          <button
                            type="button"
                            onClick={() => onOpenLocation(location)}
                            className="inline-flex items-center gap-1 rounded-sm border border-ink-600 px-2 py-1 text-[10px] text-ink-300 hover:border-teal-500 hover:text-teal-200"
                          >
                            {t('field.map')} <ArrowUpRight size={12} />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title={t('field.noMatches')}
                detail={t('field.noMatchesDetail')}
              />
            )}
          </PageCard>

          <PageCard
            title={t('field.selectedLocation')}
            subtitle={t('field.selectedSubtitle')}
            icon={MapPin}
            className="self-start"
          >
            {selectedCandidate ? (
              <div className="space-y-4 p-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-ink-100">{selectedCandidate.name}</h3>
                  <p className="mt-1 font-mono text-[10px] text-ink-500">{selectedCandidate.locationId}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-sm border border-ink-700 bg-ink-850/70 p-3">
                    <p className="text-[9px] uppercase tracking-wide text-ink-500">{t('method.priority')}</p>
                    <p className="mt-1 font-mono text-lg text-forest-pale">
                      {selectedCandidate.priority === undefined ? t('common.notReported') : selectedCandidate.priority.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-sm border border-ink-700 bg-ink-850/70 p-3">
                    <p className="text-[9px] uppercase tracking-wide text-ink-500">{t('field.meanConfidence')}</p>
                    <p className="mt-1 font-mono text-lg text-teal-300">
                      {selectedCandidate.confidence === undefined ? t('common.notReported') : fmtPct(selectedCandidate.confidence)}
                    </p>
                  </div>
                </div>
                <EvidenceList label={t('field.availableEvidence')} items={selectedCandidate.availableEvidence} t={t} />
                <EvidenceList label={t('field.missingEvidence')} items={selectedCandidate.missingEvidence} missing t={t} />
                <div className="rounded-sm border border-teal-700/50 bg-teal-850/20 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-teal-300">
                    {t('field.suggestedMeasurement')}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-200">
                    {selectedCandidate.suggestedMeasurementKey
                      ? t(selectedCandidate.suggestedMeasurementKey)
                      : selectedCandidate.suggestedMeasurement ?? t('common.notReported')}
                  </p>
                  <p className="mt-2 text-[9px] leading-relaxed text-ink-500">
                    {t('field.recommendationCaveat')}
                  </p>
                </div>
                <p className="text-[9px] text-ink-500">
                  {t('field.lastObservation', { value: selectedCandidate.lastObservation ?? t('common.notReported') })}
                </p>
              </div>
            ) : (
              <EmptyState
                title={t('field.selectLocation')}
                detail={t('field.selectLocationDetail')}
              />
            )}
          </PageCard>
        </div>
      </div>
    </main>
  );
}

function EvidenceList({
  label,
  items,
  missing = false,
  t,
}: {
  label: string;
  items: string[] | undefined;
  missing?: boolean;
  t: (key: string) => string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      {items === undefined ? (
        <p className="text-[10px] text-ink-400">{t('common.notReported')}</p>
      ) : items.length ? (
        <ul className={`space-y-1 text-[10px] ${missing ? 'text-earth-sand' : 'text-ink-300'}`}>
          {items.map((item) => <li key={item}>· {localizedEvidenceLabel(item, t)}</li>)}
        </ul>
      ) : (
        <p className="text-[10px] text-ink-400">{t('common.noneReported')}</p>
      )}
    </div>
  );
}
