import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, ClipboardCheck, Shield, Waves } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { LiveState } from '@/hooks/useLiveData';
import { ADAPTIVE_CANDIDATES, TIMELINE_EVENTS } from '@/data/demoData';
import type { MonitoringLocation, TimelineEvent } from '@/types';
import { fmtPct, localizedEvidenceLabel } from '@/lib/format';
import {
  EmptyState,
  KpiCard,
  Notice,
  PageCard,
  PageHeader,
  SourceLabel,
  StatusBadge,
} from '@/components/PagePrimitives';

type ActivityOrigin = 'live' | 'demo';
type ActivityKind = TimelineEvent['kind'];

interface ActivityRecord {
  id: string;
  kind: ActivityKind;
  label: string;
  labelKey?: string;
  detail: string;
  detailKey?: string;
  at: string;
  locationId?: string;
  origin: ActivityOrigin;
}

interface EvidenceActivityPageProps {
  live: LiveState;
  onOpenLocation: (location: MonitoringLocation) => void;
}

function average(values: number[]): number | undefined {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
}

function formatTime(value: string, lang: string, t: (key: string) => string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? t('common.timestampUnavailable')
    : date.toLocaleString(lang === 'kn' ? 'kn-IN' : lang === 'tul' ? 'tcy-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

export default function EvidenceActivityPage({ live, onOpenLocation }: EvidenceActivityPageProps) {
  const { t, lang } = useI18n();
  const [kindFilter, setKindFilter] = useState<ActivityKind | 'all'>('all');
  const [originFilter, setOriginFilter] = useState<ActivityOrigin | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const coverageValues = live.locations
    .map((location) => location.coverage)
    .filter((value): value is number => value !== undefined);
  const confidenceValues = live.locations
    .map((location) => location.confidence)
    .filter((value): value is number => value !== undefined);
  const meanCoverage = average(coverageValues);
  const meanConfidence = average(confidenceValues);

  const records = useMemo<ActivityRecord[]>(() => {
    const sensorEvents: ActivityRecord[] = live.sensorsLive
      ? live.sensors.flatMap((sensor) => {
          if (!sensor.latest?.receivedAt) return [];
          return [{
            id: `sensor-${sensor.deviceId}`,
            kind: 'sensor',
            label: t('evidence.sensorUpdate', { deviceId: sensor.deviceId }),
            detail: t('evidence.sensorDetail', {
              site: sensor.site,
              value: sensor.latest.tdsAdcRaw ?? t('common.notReported'),
            }),
            at: sensor.latest.receivedAt,
            locationId: sensor.locationId,
            origin: sensor.simulated || sensor.dataOrigin === 'demo' ? 'demo' : 'live',
          }];
        })
      : [];

    const reportEvents: ActivityRecord[] = live.reports.map((report) => ({
      id: `report-${report.id}`,
      kind: 'community',
      label: report.categoryKey ? t(report.categoryKey) : report.category,
      detail: report.detailsKey ? t(report.detailsKey) : report.details,
      at: report.submittedAt,
      locationId: report.locationId,
      origin: live.reportsLive && report.dataOrigin === 'live' ? 'live' : 'demo',
    }));

    const demoEvents: ActivityRecord[] = TIMELINE_EVENTS.map((event) => ({
      id: event.id,
      kind: event.kind,
      label: event.label,
      labelKey: event.labelKey,
      detail: event.detail,
      detailKey: event.detailKey,
      at: event.at,
      locationId: event.locationId,
      origin: 'demo',
    }));

    return [...sensorEvents, ...reportEvents, ...demoEvents]
      .filter((event) => !Number.isNaN(new Date(event.at).getTime()))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [live.reports, live.reportsLive, live.sensors, live.sensorsLive, t]);

  const filteredRecords = records.filter((record) => {
    if (kindFilter !== 'all' && record.kind !== kindFilter) return false;
    if (originFilter !== 'all' && record.origin !== originFilter) return false;
    const date = record.at.slice(0, 10);
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  });

  const explicitEvidence = live.locations.map((location) => {
    const candidate =
      location.dataOrigin === 'live'
        ? undefined
        : ADAPTIVE_CANDIDATES.find((item) => item.locationId === location.id);
    return {
      location,
      missing: location.missingEvidence ?? candidate?.missingEvidence,
      available: location.availableEvidence ?? candidate?.availableEvidence,
    };
  });
  const locationsWithGaps = explicitEvidence.filter(({ missing }) => missing?.length);
  const gapCount = locationsWithGaps.reduce((sum, row) => sum + (row.missing?.length ?? 0), 0);
  const authorityCount = live.locations.filter((location) => location.verification === 'authority').length;
  const demoRecordsCount =
    live.locations.filter((location) => location.dataOrigin === 'demo').length +
    live.sensors.filter((sensor) => sensor.simulated || sensor.dataOrigin === 'demo').length +
    live.reports.filter((report) => report.dataOrigin === 'demo' || !live.reportsLive).length;
  const allSourcesLive =
    live.locationsLive && live.sensorsLive && live.reportsLive && demoRecordsCount === 0;
  const anySourceLive = live.locationsLive || live.sensorsLive || live.reportsLive;

  const openLocation = (locationId?: string) => {
    if (!locationId) return;
    const location = live.locations.find((item) => item.id === locationId);
    if (location) onOpenLocation(location);
  };

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-ink-950">
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 xl:p-8">
        <PageHeader
          eyebrow={t('evidence.eyebrow')}
          title={t('page.evidenceActivity')}
          subtitle={t('evidence.subtitle')}
          actions={
            <StatusBadge
              label={
                !live.checked
                  ? t('nav.checking')
                  : allSourcesLive
                    ? t('source.live')
                    : anySourceLive
                      ? t('source.liveSimulated')
                      : t('source.demoFallback')
              }
              kind={allSourcesLive ? 'live' : anySourceLive ? 'mixed' : 'demo'}
            />
          }
        />

        <Notice tone="info">
          {t('evidence.notice')}
        </Notice>

        <section aria-label={t('evidence.metrics')} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={ClipboardCheck}
            label={t('evidence.meanCoverage')}
            value={meanCoverage === undefined ? t('common.notReported') : fmtPct(meanCoverage)}
            detail={t('evidence.coverageCount', { available: coverageValues.length, total: live.locations.length })}
          />
          <KpiCard
            icon={Shield}
            label={t('evidence.meanConfidence')}
            value={meanConfidence === undefined ? t('common.notReported') : fmtPct(meanConfidence)}
            detail={t('evidence.confidenceCount', { available: confidenceValues.length, total: live.locations.length })}
            accent="text-teal-300"
          />
          <KpiCard
            icon={AlertTriangle}
            label={t('evidence.explicitGaps')}
            value={gapCount}
            detail={t('evidence.gapLocations', { count: locationsWithGaps.length })}
            accent="text-earth-sand"
          />
          <KpiCard
            icon={Waves}
            label={t('evidence.authorityLocations')}
            value={authorityCount}
            detail={t('evidence.authorityField')}
          />
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PageCard
            title={t('evidence.provenance')}
            subtitle={t('evidence.provenanceSubtitle')}
            icon={Shield}
          >
            <div className="grid grid-cols-1 divide-y divide-ink-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <ProvenanceItem
                title={t('evidence.authorityVerified')}
                count={authorityCount}
                detail={t('evidence.authorityDetail')}
              />
              <ProvenanceItem
                title={t('evidence.communityReported')}
                count={live.reports.length}
                detail={t('evidence.communityCount', {
                  verified: live.reports.filter((report) => report.verification === 'verified').length,
                  unverified: live.reports.filter((report) => report.verification === 'unverified').length,
                })}
              />
              <ProvenanceItem
                title={t('evidence.sensorRecords')}
                count={live.sensors.length}
                detail={t('evidence.sensorCount', { count: live.sensors.filter((sensor) => sensor.latest).length })}
              />
              <ProvenanceItem
                title={t('evidence.demoRecords')}
                count={demoRecordsCount + TIMELINE_EVENTS.length}
                detail={t('evidence.demoDetail')}
              />
            </div>
          </PageCard>

          <PageCard
            title={t('evidence.gapsTitle')}
            subtitle={t('evidence.gapsSubtitle')}
            icon={AlertTriangle}
          >
            {locationsWithGaps.length ? (
              <div className="divide-y divide-ink-800">
                {locationsWithGaps.map(({ location, missing }) => (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => onOpenLocation(location)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-ink-850/70"
                  >
                    <span className="min-w-0">
                      <span className="block text-[11px] font-medium text-ink-100">{location.name}</span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-earth-sand">
                        {missing?.map((item) => localizedEvidenceLabel(item, t)).join(' · ')}
                      </span>
                      {location.priorityReason && (
                        <span className="mt-1 block text-[9px] text-ink-500">{location.priorityReason}</span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-ink-500">
                      {location.dataOrigin === 'live' ? t('source.live') : t('source.demoFallback')}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title={t('evidence.noGaps')}
                detail={t('evidence.noGapsDetail')}
              />
            )}
          </PageCard>
        </div>

        <PageCard
          title={t('evidence.activityTitle')}
          subtitle={t('evidence.activitySubtitle')}
          icon={Activity}
        >
          <div className="grid grid-cols-1 gap-2 border-b border-ink-800 bg-ink-950/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-[9px] text-ink-500">
              {t('evidence.eventCategory')}
              <select
                value={kindFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  if (
                    value === 'all' ||
                    value === 'rainfall' ||
                    value === 'sensor' ||
                    value === 'community' ||
                    value === 'assessment' ||
                    value === 'monitoring'
                  ) {
                    setKindFilter(value);
                  }
                }}
                className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200"
              >
                <option value="all">{t('timeline.all')}</option>
                <option value="rainfall">{t('timeline.rainfall')}</option>
                <option value="sensor">{t('timeline.sensor')}</option>
                <option value="community">{t('timeline.community')}</option>
                <option value="assessment">{t('timeline.assessment')}</option>
                <option value="monitoring">{t('timeline.monitoring')}</option>
              </select>
            </label>
            <label className="text-[9px] text-ink-500">
              {t('evidence.source')}
              <select
                value={originFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === 'all' || value === 'live' || value === 'demo') setOriginFilter(value);
                }}
                className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200"
              >
                <option value="all">{t('evidence.allSources')}</option>
                <option value="live">{t('evidence.live')}</option>
                <option value="demo">{t('evidence.demoSynthetic')}</option>
              </select>
            </label>
            <label className="text-[9px] text-ink-500">
              {t('common.from')}
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200"
              />
            </label>
            <label className="text-[9px] text-ink-500">
              {t('common.to')}
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200"
              />
            </label>
          </div>

          {filteredRecords.length ? (
            <div className="divide-y divide-ink-800">
              {filteredRecords.map((record) => {
                const linkedLocation = live.locations.find((location) => location.id === record.locationId);
                const content = (
                  <>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-ink-100">
                        {record.labelKey ? t(record.labelKey) : record.label}
                      </span>
                      <SourceLabel live={record.origin === 'live'} simulated={record.origin === 'demo'} />
                    </span>
                    <span className="mt-1 block text-[10px] leading-relaxed text-ink-400">
                      {record.detailKey ? t(record.detailKey) : record.detail}
                    </span>
                    <span className="mt-1.5 block text-[9px] text-ink-500">
                      {formatTime(record.at, lang, t)}{linkedLocation ? ` · ${linkedLocation.name}` : ''}
                    </span>
                  </>
                );
                return linkedLocation ? (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => openLocation(record.locationId)}
                    className="block w-full px-4 py-3 text-left hover:bg-ink-850/70"
                  >
                    {content}
                  </button>
                ) : (
                  <article key={record.id} className="px-4 py-3">{content}</article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={t('timeline.empty')}
              detail={t('evidence.filterTip')}
            />
          )}
        </PageCard>
      </div>
    </main>
  );
}

function ProvenanceItem({
  title,
  count,
  detail,
}: {
  title: string;
  count: number;
  detail: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-4">
      <div>
        <p className="text-[11px] font-medium text-ink-200">{title}</p>
        <p className="mt-1 text-[9px] leading-relaxed text-ink-500">{detail}</p>
      </div>
      <span className="font-mono text-lg text-ink-100">{count}</span>
    </div>
  );
}
