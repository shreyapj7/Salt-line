import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  ChevronRight,
  Droplets,
  MapPin,
  Radio,
  Satellite,
  Shield,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LiveState } from '@/hooks/useLiveData';
import { ADAPTIVE_CANDIDATES, TIMELINE_EVENTS } from '@/data/demoData';
import type { MonitoringLocation, TimelineEvent } from '@/types';
import {
  fmtNum,
  fmtPct,
  heatColor01,
  localizedEvidenceLabel,
  localizedLocationName,
  RISK_COLORS,
} from '@/lib/format';
import { useI18n } from '@/i18n/I18nContext';
import { SourceLabel, StatusBadge } from '@/components/PagePrimitives';
import MapPanel from '@/components/MapPanel';
import type { AppPage } from '@/components/AppSidebar';
import type { LayerId } from '@/map/layers';

interface OverviewPageProps {
  live: LiveState;
  selectedId: string | null;
  onNavigate: (page: AppPage) => void;
  onOpenLocation: (location: MonitoringLocation) => void;
}

const riskCategories = [
  { key: 'low', color: RISK_COLORS.low },
  { key: 'moderate', color: RISK_COLORS.moderate },
  { key: 'elevated', color: RISK_COLORS.elevated },
  { key: 'high', color: RISK_COLORS.high },
] as const;

function percentage(value: number | undefined, t: (key: string) => string): string {
  return value === undefined ? t('common.notReported') : fmtPct(value);
}

function eventDate(value: string, lang: string, t: (key: string) => string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('common.dateUnavailable');
  return date.toLocaleString(lang === 'kn' ? 'kn-IN' : lang === 'tul' ? 'tcy-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = 'text-forest-bright',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  accent?: string;
}) {
  return (
    <article className="rounded-md border border-ink-700 bg-ink-900/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-ink-400">{label}</span>
        <Icon size={16} className={accent} />
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold tabular-nums text-ink-100">
        {value}
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-ink-500">{detail}</p>
    </article>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-ink-700 bg-ink-900/75 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-ink-700 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon size={15} className="text-teal-300" />
            <h2 className="text-[12px] font-semibold tracking-wide text-earth-dark">{title}</h2>
          </div>
          {subtitle && <p className="mt-1 pl-[23px] text-[10px] text-ink-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function OverviewPage({
  live,
  selectedId,
  onNavigate,
  onOpenLocation,
}: OverviewPageProps) {
  const { t, lang } = useI18n();
  const previewLayers = new Set<LayerId>(['stations', 'community']);
  const coverageValues = live.locations
    .map((location) => location.coverage)
    .filter((value): value is number => value !== undefined);
  const confidenceValues = live.locations
    .map((location) => location.confidence)
    .filter((value): value is number => value !== undefined);
  const meanConfidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : undefined;
  const meanCoverage = coverageValues.length
    ? coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length
    : undefined;
  const averageReported = (values: (number | undefined)[]) => {
    const available = values.filter((value): value is number => value !== undefined);
    return {
      value: available.length
        ? available.reduce((sum, current) => sum + current, 0) / available.length
        : undefined,
      count: available.length,
    };
  };
  const groundwaterHead = averageReported(live.locations.map((location) => location.gwHeadM));
  const rainfallDeficit = averageReported(
    live.locations.map((location) => location.rainfallDeficitPct),
  );
  const ndmi = averageReported(live.locations.map((location) => location.ndmi));
  const simulatedNdmiCount = live.locations.filter(
    (location) => location.ndmi !== undefined && location.ndmiSimulated,
  ).length;

  const riskData = riskCategories.map((category) => ({
    ...category,
    label: t(`risk.${category.key}`),
    count: live.locations.filter((location) => location.risk === category.key).length,
  }));
  const classifiedLocations = live.locations.filter((location) => location.risk !== undefined).length;
  const unclassifiedCount = live.locations.length - classifiedLocations;

  const priorityLocations = live.locations
    .filter(
      (location): location is MonitoringLocation & { provisionalPriority: number } =>
        location.provisionalPriority !== undefined,
    )
    .sort((a, b) => b.provisionalPriority - a.provisionalPriority);
  const onlineSensorCount = live.sensors.filter((sensor) => sensor.status === 'online').length;
  const simulatedSensorCount = live.sensors.filter(
    (sensor) => sensor.simulated || sensor.dataOrigin === 'demo',
  ).length;
  const reportCounts = {
    verified: live.reports.filter((report) => report.verification === 'verified').length,
    unverified: live.reports.filter((report) => report.verification === 'unverified').length,
    rejected: live.reports.filter((report) => report.verification === 'rejected').length,
  };

  const liveSensorEvents: TimelineEvent[] = live.sensorsLive
    ? live.sensors.flatMap((sensor) => {
        if (!sensor.latest?.receivedAt) return [];
        return [
          {
            id: `live-s-${sensor.deviceId}`,
            kind: 'sensor',
            label: t('overview.sensorUpdate', { deviceId: sensor.deviceId }),
            detail: t('overview.sensorDetail', {
              site: sensor.site,
              value: sensor.latest.tdsAdcRaw ?? t('common.notReported'),
            }),
            at: sensor.latest.receivedAt,
            locationId: sensor.locationId,
            dataOrigin: sensor.simulated ? 'demo' : sensor.dataOrigin ?? 'live',
          },
        ];
      })
    : [];
  const events = [...liveSensorEvents, ...TIMELINE_EVENTS]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);

  const verificationCounts = {
    authority: live.locations.filter((location) => location.verification === 'authority').length,
    community: live.locations.filter((location) => location.verification === 'community').length,
    candidate: live.locations.filter((location) => location.verification === 'candidate').length,
    pending: live.locations.filter((location) => location.verification === 'pending').length,
  };
  const verificationSummary = [
    { status: 'authority', count: verificationCounts.authority },
    { status: 'community', count: verificationCounts.community },
    { status: 'candidate', count: verificationCounts.candidate },
    { status: 'pending', count: verificationCounts.pending },
  ] as const;

  const evidenceRows = live.locations.map((location) => {
    const candidate =
      location.dataOrigin === 'live'
        ? undefined
        : ADAPTIVE_CANDIDATES.find((item) => item.locationId === location.id);
    return {
      location,
      available: location.availableEvidence ?? candidate?.availableEvidence,
      missing: location.missingEvidence ?? candidate?.missingEvidence,
      evidenceIsDemo:
        (location.availableEvidence === undefined && candidate?.availableEvidence !== undefined) ||
        (location.missingEvidence === undefined && candidate?.missingEvidence !== undefined),
    };
  });

  const renderEvidence = (items: string[] | undefined) => {
    if (items === undefined) return t('common.notReported');
    return items.length ? items.map((item) => localizedEvidenceLabel(item, t)).join(' · ') : t('common.noneReported');
  };

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-ink-950">
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 xl:p-8">
        <header className="relative overflow-hidden rounded-md border border-ink-700 bg-gradient-to-br from-forest-deep/30 via-ink-900 to-ink-900 px-4 py-5 sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-forest-light/10 bg-forest-light/5 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-forest-light/60 bg-forest-deep/80 text-forest-bright shadow-inner">
                <Waves size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-300">
                  <span>{t('app.name')}</span>
                  <span className="text-ink-600">/</span>
                  <span className="font-normal tracking-[0.1em] text-ink-400">{t('app.tagline')}</span>
                </div>
                <h1 className="mt-2 text-xl font-semibold tracking-tight text-earth-dark sm:text-2xl">
                  {t('overview.title')}
                </h1>
                <p className="mt-1.5 text-[12px] text-ink-300">
                  {t('overview.subtitle', { pilot: t('app.pilot') })}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {live.lastRefreshAt && (
                <span className="text-[10px] text-ink-400">
                  {t('overview.checkedAt', { time: eventDate(live.lastRefreshAt, lang, t) })}
                </span>
              )}
            </div>
          </div>
        </header>

        <section aria-label={t('overview.metrics')} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard
            icon={MapPin}
            label={t('vuln.locations')}
            value={live.locations.length}
            detail={t('overview.locationsAvailable')}
          />
          <MetricCard
            icon={AlertTriangle}
            label={t('overview.highRiskLocations')}
            value={live.locations.filter((location) => location.risk === 'high').length}
            detail={t('overview.existingRiskClassification')}
            accent="text-risk-high"
          />
          <MetricCard
            icon={Radio}
            label={t('overview.activeSensors')}
            value={onlineSensorCount}
            detail={t('overview.onlineOfDevices', { count: live.sensors.length })}
            accent="text-teal-300"
          />
          <MetricCard
            icon={Activity}
            label={t('overview.communityReports')}
            value={live.reports.length}
            detail={t('overview.reportsDataset')}
            accent="text-teal-300"
          />
          <MetricCard
            icon={Droplets}
            label={t('evidence.meanCoverage')}
            value={percentage(meanCoverage, t)}
            detail={t('overview.coverageLocations', { available: coverageValues.length, total: live.locations.length })}
          />
          <MetricCard
            icon={Shield}
            label={t('evidence.meanConfidence')}
            value={percentage(meanConfidence, t)}
            detail={t('overview.confidenceLocations', { available: confidenceValues.length, total: live.locations.length })}
            accent="text-teal-300"
          />
        </section>

        <section
          aria-label={t('overview.atGlance')}
          className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)]"
        >
          <SectionCard
            title={t('overview.mapPreview')}
            subtitle={t('overview.mapPreviewSubtitle')}
            icon={Satellite}
            action={
              <button
                type="button"
                onClick={() => onNavigate('Groundwater Map')}
                className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-ink-600 px-2 py-1 text-[9px] text-ink-300 transition-colors hover:border-forest-bright hover:text-forest-pale"
              >
                {t('overview.openMap')} <ChevronRight size={12} />
              </button>
            }
          >
            <div className="relative h-[320px] sm:h-[380px]">
              <MapPanel
                live={live}
                basemap="satellite"
                visibleLayers={previewLayers}
                activeOverlay="priority"
                overlayOpacity={0.62}
                selectedId={selectedId}
                onSelect={onOpenLocation}
              />
            </div>
            <div className="flex flex-col gap-2 border-t border-ink-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge label={t('layers.priority')} kind="mixed" />
                <div className="flex items-center gap-1.5 text-[9px] text-ink-500">
                  <span>0</span>
                  <span
                    className="h-1.5 w-20 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${heatColor01(0)}, ${heatColor01(0.5)}, ${heatColor01(1)})`,
                    }}
                  />
                  <span>1</span>
                  <span>{t('overview.recordedScore')}</span>
                </div>
              </div>
              <p className="max-w-xl text-[9px] leading-relaxed text-ink-500">
                {t('map.priorityHeatNote')}
              </p>
            </div>
          </SectionCard>

          <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-1">
            <SectionCard
              title={t('overview.priorityLocations')}
              subtitle={t('overview.prioritySubtitle')}
              icon={MapPin}
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('Reports & Field Actions')}
                  className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-ink-600 px-2 py-1 text-[9px] text-ink-300 transition-colors hover:border-forest-bright hover:text-forest-pale"
                >
                  {t('overview.allPriorities')} <ChevronRight size={12} />
                </button>
              }
            >
              <div className="divide-y divide-ink-800">
                {priorityLocations.length ? (
                  priorityLocations.slice(0, 4).map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => onOpenLocation(location)}
                      className="group w-full px-4 py-3 text-left transition-colors hover:bg-ink-850/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block truncate text-[11px] font-medium text-ink-100 group-hover:text-forest-pale">
                            {localizedLocationName(location, lang)}
                          </span>
                          <span className="mt-1 block truncate text-[9px] text-ink-500">
                            {location.priorityReasonKey ? t(location.priorityReasonKey) : location.priorityReason ?? t('overview.priorityReasonMissing')}
                          </span>
                        </div>
                        <span className="shrink-0 rounded-sm border border-teal-700/60 bg-teal-850/40 px-1.5 py-1 font-mono text-[10px] text-teal-200">
                          {location.provisionalPriority.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-ink-500">
                        <span>
                          {t('field.confidence', { value: percentage(location.confidence, t) })}
                        </span>
                        <span>{t(`ver.${location.verification}`)}</span>
                        <SourceLabel live={location.dataOrigin === 'live'} />
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-8 text-center text-[10px] text-ink-500">
                    {t('overview.noPriorities')}
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title={t('overview.sensorReports')}
              subtitle={t('overview.currentRecords')}
              icon={Radio}
            >
              <div className="space-y-4 p-4">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Radio size={14} className="text-teal-300" />
                      <span className="text-[10px] font-medium text-ink-200">{t('ui.sensorNetwork')}</span>
                    </div>
                    <SourceLabel live={live.sensorsLive} simulated={simulatedSensorCount > 0} />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-mono text-xl text-ink-100">{onlineSensorCount}</span>
                    <span className="text-[10px] text-ink-400">{t('overview.onlineDevices', { count: live.sensors.length })}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-700">
                    <div
                      className="h-full rounded-full bg-forest-bright transition-[width]"
                      style={{
                        width: live.sensors.length
                          ? `${(onlineSensorCount / live.sensors.length) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                  {simulatedSensorCount > 0 && (
                    <p className="mt-1.5 text-[9px] text-earth-sand">
                      {t('overview.simulatedCount', { count: simulatedSensorCount })}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigate('Sensor Monitoring')}
                    className="mt-2 inline-flex items-center gap-1 text-[9px] text-teal-300 hover:text-teal-200"
                  >
                    {t('overview.viewSensorDetails')} <ChevronRight size={11} />
                  </button>
                </div>

                <div className="border-t border-ink-800 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck size={14} className="text-forest-bright" />
                      <span className="text-[10px] font-medium text-ink-200">{t('overview.communityReports')}</span>
                    </div>
                    <SourceLabel live={live.reportsLive} />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-mono text-xl text-ink-100">{live.reports.length}</span>
                    <span className="text-[10px] text-ink-400">{t('ui.reportsAvailable')}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-ink-400">
                    <span>{t('ui.verified')} <span className="font-mono text-forest-pale">{reportCounts.verified}</span></span>
                    <span>{t('ui.unverified')} <span className="font-mono text-earth-sand">{reportCounts.unverified}</span></span>
                    <span>{t('ui.rejected')} <span className="font-mono text-ink-300">{reportCounts.rejected}</span></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('Public Complaints')}
                    className="mt-2 inline-flex items-center gap-1 text-[9px] text-teal-300 hover:text-teal-200"
                  >
                    {t('overview.reviewReports')} <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        </section>

        <SectionCard
          title={t('overview.indicatorsTitle')}
          subtitle={t('overview.indicatorsSubtitle')}
          icon={BarChart3}
        >
          <div className="grid grid-cols-1 divide-y divide-ink-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <IndicatorSummary
              label={t('overview.meanHead')}
              value={groundwaterHead.value === undefined ? t('common.notReported') : `${fmtNum(groundwaterHead.value)} m`}
              detail={t('overview.valuesCount', { available: groundwaterHead.count, total: live.locations.length })}
            />
            <IndicatorSummary
              label={t('overview.meanRainfallDeficit')}
              value={rainfallDeficit.value === undefined ? t('common.notReported') : `${fmtNum(rainfallDeficit.value)}%`}
              detail={t('overview.valuesCount', { available: rainfallDeficit.count, total: live.locations.length })}
            />
            <IndicatorSummary
              label={t('overview.meanNdmi')}
              value={ndmi.value === undefined ? t('common.notReported') : fmtNum(ndmi.value, 2)}
              detail={t('overview.simulatedNdmiDetail', { count: simulatedNdmiCount })}
            />
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard
            title={t('overview.riskOverview')}
            subtitle={t('overview.riskSubtitle')}
            icon={AlertTriangle}
          >
            <div className="h-[250px] px-3 py-4">
              {classifiedLocations ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskData} margin={{ top: 8, right: 12, bottom: 4, left: -20 }}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'var(--color-secondary)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: 'var(--color-secondary)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(36,75,99,0.06)' }}
                      contentStyle={{
                        background: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        color: 'var(--color-text)',
                        fontSize: 12,
                      }}
                      formatter={(value) => [String(value ?? ''), t('vuln.locations')]}
                    />
                    <Bar dataKey="count" maxBarSize={56} radius={[3, 3, 0, 0]}>
                      {riskData.map((item) => (
                        <Cell key={item.key} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[12px] text-ink-500">
                  {t('overview.noRisk')}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-800 px-4 py-3 text-[10px] text-ink-400">
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {riskData.map((item) => (
                  <span key={item.key} className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}: <span className="font-mono text-ink-200">{item.count}</span>
                  </span>
                ))}
              </div>
              <span>{t('overview.unclassified', { count: unclassifiedCount })}</span>
            </div>
          </SectionCard>

          <SectionCard
            title={t('overview.activityTitle')}
            subtitle={t('overview.activitySubtitle')}
            icon={Activity}
          >
            <div className="divide-y divide-ink-800">
              {events.length ? (
                events.map((event) => {
                  const linkedLocation = live.locations.find((location) => location.id === event.locationId);
                  const eventContent = (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-medium text-ink-100">
                          {event.labelKey ? t(event.labelKey) : event.label}
                        </span>
                        <SourceLabel
                          live={event.dataOrigin === 'live'}
                          simulated={event.dataOrigin === 'demo'}
                        />
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-ink-400">
                        {event.detailKey ? t(event.detailKey) : event.detail}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[9px] text-ink-500">
                        <span>{eventDate(event.at, lang, t)}</span>
                        {linkedLocation && <span>· {linkedLocation.name}</span>}
                      </div>
                    </>
                  );

                  return linkedLocation ? (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onOpenLocation(linkedLocation)}
                      className="block w-full px-4 py-3 text-left transition-colors hover:bg-ink-850/70"
                    >
                      {eventContent}
                    </button>
                  ) : (
                    <article key={event.id} className="px-4 py-3">
                      {eventContent}
                    </article>
                  );
                })
              ) : (
                <p className="px-4 py-8 text-center text-[11px] text-ink-500">
                  {t('overview.noTimeline')}
                </p>
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard
            title={t('overview.evidenceTitle')}
            subtitle={t('overview.evidenceSubtitle')}
            icon={ClipboardCheck}
          >
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 2xl:grid-cols-2">
              {verificationSummary.map(({ status, count }) => (
                <div key={status} className="rounded-sm border border-ink-700 bg-ink-850/60 px-3 py-2">
                  <div className="font-mono text-lg text-ink-100">{count}</div>
                  <div className="text-[9px] text-ink-400">{t(`ver.${status}`)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-ink-800">
              {evidenceRows.map(({ location, available, missing, evidenceIsDemo }) => (
                <article key={location.id} className="border-b border-ink-800 px-4 py-3 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenLocation(location)}
                      className="text-left text-[11px] font-medium text-ink-200 hover:text-forest-pale"
                    >
                      {location.name}
                    </button>
                    <span className="rounded-sm border border-ink-600 px-1.5 py-0.5 text-[9px] text-ink-400">
                      {t(`ver.${location.verification}`)}
                    </span>
                    {evidenceIsDemo && (
                      <span className="text-[9px] text-ink-500">{t('ui.demoEvidenceRecord')}</span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-[10px] sm:grid-cols-2">
                    <p className="text-ink-400">
                      {t('field.availableEvidence')}: <span className="text-ink-300">{renderEvidence(available)}</span>
                    </p>
                    <p className="text-ink-400">
                      {t('field.missingEvidence')}: <span className="text-earth-sand">{renderEvidence(missing)}</span>
                    </p>
                  </div>
                </article>
              ))}
              {!evidenceRows.length && (
                <p className="px-4 py-8 text-center text-[11px] text-ink-500">
                  {t('overview.noEvidence')}
                </p>
              )}
            </div>
        </SectionCard>

        <div className="flex items-start gap-2 rounded-sm border border-ink-700 bg-ink-900/50 px-3 py-2.5 text-[10px] leading-relaxed text-ink-500">
          <Shield size={13} className="mt-0.5 shrink-0 text-teal-300" />
          <p>
            {t('overview.dataCaveat')}
          </p>
        </div>
      </div>
    </main>
  );
}

function IndicatorSummary({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="p-4">
      <p className="text-[10px] font-medium text-ink-400">{label}</p>
      <p className="mt-2 font-mono text-xl text-ink-100">{value}</p>
      <p className="mt-1 text-[9px] leading-relaxed text-ink-500">{detail}</p>
    </div>
  );
}
