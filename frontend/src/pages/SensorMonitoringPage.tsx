import { useState } from 'react';
import { AlertTriangle, ChevronDown, Clock3, Cpu, MapPin, Radio } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { LiveState } from '@/hooks/useLiveData';
import type { MonitoringLocation, SensorDevice } from '@/types';
import { fmtNum } from '@/lib/format';
import {
  EmptyState,
  KpiCard,
  Notice,
  PageCard,
  PageHeader,
  SourceLabel,
  StatusBadge,
} from '@/components/PagePrimitives';

interface SensorMonitoringPageProps {
  live: LiveState;
  onOpenLocation: (location: MonitoringLocation) => void;
}

function formatTimestamp(value: string | undefined, lang: string, t: (key: string) => string): string {
  if (!value) return t('common.notReported');
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? t('common.invalidTimestamp')
    : date.toLocaleString(lang === 'kn' ? 'kn-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function rawValue(value: number | null | undefined, t: (key: string) => string): string {
  return value === undefined || value === null ? t('common.notReported') : String(value);
}

function statusKind(status: SensorDevice['status']): 'live' | 'pending' | 'neutral' {
  if (status === 'online') return 'live';
  if (status === 'degraded') return 'pending';
  return 'neutral';
}

export default function SensorMonitoringPage({ live, onOpenLocation }: SensorMonitoringPageProps) {
  const { t, lang } = useI18n();
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const onlineCount = live.sensors.filter((sensor) => sensor.status === 'online').length;
  const attentionCount = live.sensors.filter(
    (sensor) => sensor.status === 'offline' || sensor.status === 'degraded',
  ).length;
  const lastReading = live.sensors
    .map((sensor) => sensor.latest?.receivedAt)
    .filter((timestamp): timestamp is string => timestamp !== undefined)
    .map((timestamp) => ({ timestamp, date: new Date(timestamp) }))
    .filter(({ date }) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0]?.timestamp;

  const findLocation = (sensor: SensorDevice) =>
    (sensor.locationId
      ? live.locations.find((location) => location.id === sensor.locationId)
      : undefined) ??
    live.locations.find((location) => location.name.toLowerCase() === sensor.site.toLowerCase());

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-ink-950">
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 xl:p-8">
        <PageHeader
          eyebrow={t('sensor.eyebrow')}
          title={t('page.sensorMonitoring')}
          subtitle={t('sensor.subtitle')}
          actions={<SourceLabel live={live.sensorsLive} />}
        />

        <Notice tone="warning">
          {t('sensor.notCalibrated')} {t('sensor.notCalibratedHistory')}
        </Notice>

        <section aria-label={t('sensor.metrics')} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={Cpu}
            label={t('sensor.registeredDevices')}
            value={live.sensors.length}
            detail={t('sensor.devicesDataset')}
          />
          <KpiCard
            icon={Radio}
            label={t('sensor.onlineDevices')}
            value={onlineCount}
            detail={t('sensor.otherDevices', { count: live.sensors.length - onlineCount })}
            accent="text-teal-300"
          />
          <KpiCard
            icon={AlertTriangle}
            label={t('sensor.attentionDevices')}
            value={attentionCount}
            detail={t('sensor.statusValues')}
            accent="text-risk-elevated"
          />
          <KpiCard
            icon={Clock3}
            label={t('sensor.latestReading')}
            value={lastReading ? formatTimestamp(lastReading, lang, t) : t('common.notReported')}
            detail={t('sensor.latestTimestamp')}
            accent="text-teal-300"
          />
        </section>

        <PageCard
          title={t('sensor.inventory')}
          subtitle={t('sensor.inventorySubtitle')}
          icon={Cpu}
        >
          {live.sensors.length ? (
            <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
              {live.sensors.map((sensor) => {
                const isExpanded = expandedDevice === sensor.deviceId;
                const location = findLocation(sensor);
                const sourceIsLive = live.sensorsLive && sensor.dataOrigin === 'live';
                return (
                  <article
                    key={sensor.deviceId}
                    className={`min-w-0 rounded-sm border ${
                      isExpanded ? 'border-forest-light/60 bg-ink-850/80' : 'border-ink-700 bg-ink-950/50'
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedDevice(isExpanded ? null : sensor.deviceId)}
                      className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-ink-850/70"
                    >
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[12px] font-semibold text-ink-100">
                            {sensor.deviceId}
                          </span>
                          <StatusBadge label={t(`sensor.${sensor.status}`)} kind={statusKind(sensor.status)} />
                          <SourceLabel live={sourceIsLive} simulated={sensor.simulated} />
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-ink-300">{sensor.label}</span>
                        <span className="mt-1 block text-[10px] text-ink-500">{sensor.site}</span>
                      </span>
                      <ChevronDown
                        size={14}
                        className={`mt-1 shrink-0 text-teal-300 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4">
                      <ValueBlock label={t('sensor.rawTds')} value={rawValue(sensor.latest?.tdsAdcRaw, t)} />
                      <ValueBlock label={t('sensor.rawLevel')} value={rawValue(sensor.latest?.waterLevelAdcRaw, t)} />
                      <ValueBlock
                        label={t('sensor.temperature')}
                        value={
                          sensor.latest?.temperatureC === null || sensor.latest?.temperatureC === undefined
                            ? t('common.notReported')
                            : `${fmtNum(sensor.latest.temperatureC)} °C`
                        }
                      />
                      <ValueBlock label={t('sensor.received')} value={formatTimestamp(sensor.latest?.receivedAt, lang, t)} />
                    </div>

                    {isExpanded && (
                      <div className="space-y-3 border-t border-ink-700 px-4 py-3">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-500">{t('ui.source')}</p>
                          <p className="mt-1 text-[10px] text-ink-300">
                            {sensor.latest?.source ?? t('common.notReported')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-500">{t('ui.inputWarnings')}</p>
                          {sensor.latest?.warnings.length ? (
                            <ul className="mt-1 space-y-1 text-[10px] text-earth-sand">
                              {sensor.latest.warnings.map((warning) => <li key={warning}>· {warning}</li>)}
                            </ul>
                          ) : (
                            <p className="mt-1 text-[10px] text-ink-400">{t('sensor.noWarnings')}</p>
                          )}
                        </div>
                        {location && (
                          <button
                            type="button"
                            onClick={() => onOpenLocation(location)}
                            className="inline-flex items-center gap-1 rounded-sm border border-ink-600 px-2 py-1 text-[10px] text-ink-300 hover:border-teal-500 hover:text-teal-200"
                          >
                            <MapPin size={11} /> {t('sensor.viewSite')}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={t('sensor.noDevices')}
              detail={t('sensor.noDevicesDetail')}
            />
          )}
        </PageCard>

        <PageCard
          title={t('sensor.history')}
          subtitle={t('sensor.historySubtitle')}
          icon={Clock3}
        >
          <EmptyState
            title={t('sensor.noHistory')}
            detail={t('sensor.noHistoryDetail')}
          />
        </PageCard>
      </div>
    </main>
  );
}

function ValueBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-sm border border-ink-700/80 bg-ink-900/70 px-2.5 py-2">
      <p className="truncate text-[9px] text-ink-500">{label}</p>
      <p className="mt-1 break-words font-mono text-[10px] text-ink-200">{value}</p>
    </div>
  );
}
