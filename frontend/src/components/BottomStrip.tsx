import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  Cpu,
  FileText,
  ChevronDown,
  Activity,
  CloudRain,
  ClipboardCheck,
  Route,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { LiveState } from '@/hooks/useLiveData';
import type { MonitoringLocation, TimelineEvent } from '@/types';
import { ADAPTIVE_CANDIDATES, TIMELINE_EVENTS } from '@/data/demoData';
import { fmtNum, fmtPct, localizedEvidenceLabel, localizedLocationName } from '@/lib/format';

type TabId = 'adaptive' | 'sensors' | 'reports' | 'timeline';

interface Props {
  live: LiveState;
  selectedId: string | null;
  onSelectLocation: (loc: MonitoringLocation) => void;
}

export default function BottomStrip({ live, selectedId, onSelectLocation }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>('adaptive');
  const [expandedHeight, setExpandedHeight] = useState(false);

  const selectByIdOrName = (locationId?: string, locationName?: string) => {
    const found =
      (locationId ? live.locations.find((l) => l.id === locationId) : undefined) ??
      (locationName
        ? live.locations.find((l) => l.name.toLowerCase() === locationName.toLowerCase())
        : undefined);
    if (found) onSelectLocation(found);
  };

  return (
    <section
      className={`${
        expandedHeight ? 'h-[340px]' : 'h-[228px]'
      } shrink-0 border-t border-ink-700 bg-ink-850 flex flex-col transition-all duration-200`}
    >
      <div className="h-9 shrink-0 border-b border-ink-700 bg-ink-900/70 flex items-stretch overflow-x-auto">
        {(
          [
            ['adaptive', <ClipboardList key="a" size={12} />, t('adaptive.title')],
            ['sensors', <Cpu key="s" size={12} />, t('sensor.title')],
            ['reports', <FileText key="r" size={12} />, t('community.title')],
            ['timeline', <Activity key="t" size={12} />, t('timeline.title')],
          ] as [TabId, React.ReactNode, string][]
        ).map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 flex items-center gap-1.5 text-[11px] tracking-wide uppercase transition-colors border-r border-ink-700 whitespace-nowrap ${
              tab === id
                ? 'bg-ink-850 text-forest-pale border-b-2 border-b-forest-bright -mb-px font-medium'
                : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800/40'
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}

        <div className="flex-1 min-w-4" />

        <div className="hidden lg:flex items-center px-2 text-[10px] text-ink-400 truncate">
          {tab === 'adaptive' && t('adaptive.question')}
        </div>

        <button
          onClick={() => setExpandedHeight((v) => !v)}
          className="px-2.5 border-l border-ink-700 text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors"
          title={expandedHeight ? t('bottom.collapse') : t('bottom.expand')}
          aria-label={expandedHeight ? t('bottom.collapse') : t('bottom.expand')}
        >
          {expandedHeight ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'adaptive' && (
          <AdaptiveTable
            live={live}
            selectedId={selectedId}
            onSelect={(id) => selectByIdOrName(id)}
          />
        )}
        {tab === 'sensors' && (
          <SensorTable
            live={live}
            onSelectSite={(id, site) => selectByIdOrName(id, site)}
          />
        )}
        {tab === 'reports' && (
          <ReportsTable
            live={live}
            onSelectLocation={(id, name) => selectByIdOrName(id, name)}
          />
        )}
        {tab === 'timeline' && (
          <TimelinePanel live={live} onSelectLocation={(id) => selectByIdOrName(id)} />
        )}
      </div>
    </section>
  );
}

// ── 1. Adaptive monitoring ───────────────────────────────────────────

function AdaptiveTable({
  live,
  selectedId,
  onSelect,
}: {
  live: LiveState;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t, lang } = useI18n();

  const rows = useMemo(() => {
    if (live.locationsLive) {
      return live.locations
        .filter((l) => l.provisionalPriority !== undefined || l.verification !== 'authority')
        .map((l) => ({
          locationId: l.id,
          name: l.name,
          nameKn: l.nameKn,
          priority: l.provisionalPriority ?? 0.5,
          reason: l.priorityReason ?? t('adaptive.provisional'),
          reasonKey: l.priorityReasonKey,
          availableEvidence: l.availableEvidence ?? [l.source],
          missingEvidence: l.missingEvidence ?? (l.gwHeadM === undefined ? [t('right.gwHead')] : []),
          confidence: l.confidence ?? 0.4,
          suggestedMeasurement: l.suggestedMeasurement ?? t('right.next'),
          suggestedMeasurementKey: l.suggestedMeasurementKey,
          lastObservation: l.lastObservation ?? '—',
        }))
        .sort((a, b) => b.priority - a.priority);
    }

    return [...ADAPTIVE_CANDIDATES].sort((a, b) => b.priority - a.priority);
  }, [live.locationsLive, live.locations, t]);

  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-left text-ink-400 border-b border-ink-700 sticky top-0 bg-ink-850 z-10">
          <th className="px-2.5 py-1.5 font-medium">{t('adaptive.priority')}</th>
          <th className="px-2.5 py-1.5 font-medium">{t('right.name')}</th>
          <th className="px-2.5 py-1.5 font-medium hidden md:table-cell">{t('adaptive.reason')}</th>
          <th className="px-2.5 py-1.5 font-medium hidden lg:table-cell">{t('adaptive.evidence')}</th>
          <th className="px-2.5 py-1.5 font-medium hidden xl:table-cell">{t('adaptive.missing')}</th>
          <th className="px-2.5 py-1.5 font-medium">{t('adaptive.confidence')}</th>
          <th className="px-2.5 py-1.5 font-medium hidden sm:table-cell">{t('adaptive.suggested')}</th>
          <th className="px-2.5 py-1.5 font-medium hidden xl:table-cell">{t('adaptive.lastObs')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-800">
        {rows.map((c) => {
          const isSelected = selectedId === c.locationId;
          return (
            <tr
              key={c.locationId}
              onClick={() => onSelect(c.locationId)}
              className={`cursor-pointer transition-colors ${
                isSelected ? 'bg-forest-deep/45' : 'hover:bg-ink-800/70'
              }`}
            >
              <td className="px-2.5 py-1.5 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-12 h-[6px] bg-ink-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-risk-elevated"
                      style={{ width: fmtPct(c.priority) }}
                    />
                  </div>
                  <span className="font-mono text-ink-100">{fmtNum(c.priority, 2)}</span>
                </div>
              </td>
              <td className="px-2.5 py-1.5 text-ink-100 font-medium">
                {localizedLocationName({ name: c.name, nameKn: c.nameKn }, lang)}
              </td>
              <td className="px-2.5 py-1.5 text-ink-300 hidden md:table-cell max-w-[240px] truncate">
                {c.reasonKey ? t(c.reasonKey) : c.reason}
              </td>
              <td className="px-2.5 py-1.5 text-ink-300 hidden lg:table-cell max-w-[190px] truncate">
                {c.availableEvidence.map((item) => localizedEvidenceLabel(item, t)).join(', ')}
              </td>
              <td className="px-2.5 py-1.5 text-risk-moderate hidden xl:table-cell max-w-[180px] truncate">
                {c.missingEvidence.length
                  ? c.missingEvidence.map((item) => localizedEvidenceLabel(item, t)).join(', ')
                  : t('common.none')}
              </td>
              <td className="px-2.5 py-1.5 font-mono text-ink-200">{fmtPct(c.confidence)}</td>
              <td className="px-2.5 py-1.5 hidden sm:table-cell">
                <span className="px-1.5 py-px rounded-sm border border-forest-light/50 bg-forest-deep/40 text-forest-pale text-[10px]">
                  {c.suggestedMeasurementKey ? t(c.suggestedMeasurementKey) : c.suggestedMeasurement}
                </span>
              </td>
              <td className="px-2.5 py-1.5 font-mono text-ink-400 hidden xl:table-cell">
                {c.lastObservation ?? '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td
            colSpan={8}
            className="px-2.5 py-1.5 text-[10px] text-risk-moderate border-t border-ink-700 bg-ink-900/40"
          >
            {t('adaptive.provisional')}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

// ── 2. Sensor monitoring ─────────────────────────────────────────────

function SensorTable({
  live,
  onSelectSite,
}: {
  live: LiveState;
  onSelectSite: (locationId?: string, site?: string) => void;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-left text-ink-400 border-b border-ink-700 sticky top-0 bg-ink-850 z-10">
          <th className="px-2.5 py-1.5 font-medium">{t('sensor.device')}</th>
          <th className="px-2.5 py-1.5 font-medium hidden md:table-cell">{t('sensor.site')}</th>
          <th className="px-2.5 py-1.5 font-medium">{t('sensor.tdsAdc')}</th>
          <th className="px-2.5 py-1.5 font-medium">{t('sensor.levelAdc')}</th>
          <th className="px-2.5 py-1.5 font-medium">{t('sensor.temp')}</th>
          <th className="px-2.5 py-1.5 font-medium hidden lg:table-cell">{t('sensor.warnings')}</th>
          <th className="px-2.5 py-1.5 font-medium">{t('sensor.received')}</th>
          <th className="px-2.5 py-1.5 font-medium">{t('sensor.status')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-800">
        {live.sensors.map((d) => {
          const isExpanded = expanded === d.deviceId;
          return (
            <tr
              key={d.deviceId}
              className="hover:bg-ink-800/70 transition-colors cursor-pointer"
              onClick={() => {
                setExpanded(isExpanded ? null : d.deviceId);
                onSelectSite(d.locationId, d.site);
              }}
            >
              <td className="px-2.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-ink-100">{d.deviceId}</span>
                  {d.simulated && (
                    <span className="px-1 py-px rounded-sm text-[9px] tracking-wider border border-risk-moderate/60 text-risk-moderate bg-risk-moderate/10">
                      {t('sensor.simulated')}
                    </span>
                  )}
                  <ChevronDown
                    size={10}
                    className={`text-ink-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </td>
              <td className="px-2.5 py-1.5 text-ink-300 hidden md:table-cell">{d.site}</td>
              <td className="px-2.5 py-1.5 font-mono text-ink-100">
                {d.latest?.tdsAdcRaw ?? t('sensor.noData')}
              </td>
              <td className="px-2.5 py-1.5 font-mono text-ink-100">
                {d.latest?.waterLevelAdcRaw ?? t('sensor.noData')}
              </td>
              <td className="px-2.5 py-1.5 font-mono text-ink-100">
                {d.latest?.temperatureC !== undefined && d.latest?.temperatureC !== null
                  ? `${fmtNum(d.latest.temperatureC)} °C`
                  : '—'}
              </td>
              <td className="px-2.5 py-1.5 hidden lg:table-cell">
                {d.latest?.warnings?.length ? (
                  <span className="text-risk-elevated text-[10px]">{d.latest.warnings[0]}</span>
                ) : (
                  <span className="text-ink-500 text-[10px]">—</span>
                )}
              </td>
              <td className="px-2.5 py-1.5 font-mono text-ink-300">
                {d.latest ? d.latest.receivedAt.slice(0, 16).replace('T', ' ') : '—'}
              </td>
              <td className="px-2.5 py-1.5">
                <span
                  className={`px-1.5 py-px rounded-sm text-[10px] border ${
                    d.status === 'online'
                      ? 'border-forest-light text-forest-bright bg-forest-deep/40'
                      : d.status === 'degraded'
                        ? 'border-risk-elevated text-risk-elevated bg-risk-elevated/10'
                        : 'border-ink-500 text-ink-400'
                  }`}
                >
                  {t(`sensor.${d.status}`)}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td
            colSpan={8}
            className="px-2.5 py-1.5 text-[10px] text-risk-moderate border-t border-ink-700 bg-ink-900/40"
          >
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle size={11} className="shrink-0" />
              <span>{t('sensor.notCalibrated')}</span>
              {expanded && (
                <span className="text-ink-300 ml-auto">
                  {t('sensor.source')}:{' '}
                  {live.sensors.find((s) => s.deviceId === expanded)?.latest?.source ?? '—'}
                </span>
              )}
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

// ── 3. Community reports ─────────────────────────────────────────────

function ReportsTable({
  live,
  onSelectLocation,
}: {
  live: LiveState;
  onSelectLocation: (locationId?: string, locationName?: string) => void;
}) {
  const { t } = useI18n();
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-left text-ink-400 border-b border-ink-700 sticky top-0 bg-ink-850 z-10">
          <th className="px-2.5 py-1.5 font-medium">{t('community.id')}</th>
          <th className="px-2.5 py-1.5 font-medium">{t('community.location')}</th>
          <th className="px-2.5 py-1.5 font-medium">{t('community.category')}</th>
          <th className="px-2.5 py-1.5 font-medium">{t('community.date')}</th>
          <th className="px-2.5 py-1.5 font-medium">{t('community.verification')}</th>
          <th className="px-2.5 py-1.5 font-medium hidden md:table-cell">{t('community.details')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-800">
        {live.reports.map((r) => (
          <tr
            key={r.id}
            onClick={() => onSelectLocation(r.locationId, r.locationName)}
            className="hover:bg-ink-800/70 transition-colors cursor-pointer"
          >
            <td className="px-2.5 py-1.5 font-mono text-ink-400">{r.id}</td>
            <td className="px-2.5 py-1.5 text-ink-100 font-medium">
              {r.locationName}
              {r.submittedBy && (
                <span className="ml-1.5 text-[10px] font-normal text-ink-400">
                  ({t('community.submittedBy')} {r.submittedBy})
                </span>
              )}
            </td>
            <td className="px-2.5 py-1.5 text-ink-200">
              {r.categoryKey ? t(r.categoryKey) : r.category}
            </td>
            <td className="px-2.5 py-1.5 font-mono text-ink-300">{r.submittedAt || '—'}</td>
            <td className="px-2.5 py-1.5">
              <span
                className={`px-1.5 py-px rounded-sm text-[10px] border ${
                  r.verification === 'verified'
                    ? 'border-forest-light text-forest-bright bg-forest-deep/40'
                    : r.verification === 'rejected'
                      ? 'border-risk-high text-risk-high bg-risk-high/10'
                      : 'border-earth-clay text-earth-sand bg-earth-clay/10'
                }`}
              >
                {t(`community.ver.${r.verification}`)}
              </span>
            </td>
            <td className="px-2.5 py-1.5 text-ink-300 hidden md:table-cell max-w-[340px] truncate">
              {r.detailsKey ? t(r.detailsKey) : r.details}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── 4. Activity timeline ─────────────────────────────────────────────

const KIND_ICONS: Record<TimelineEvent['kind'], React.ReactNode> = {
  rainfall: <CloudRain size={10} />,
  sensor: <Cpu size={10} />,
  community: <FileText size={10} />,
  assessment: <ClipboardCheck size={10} />,
  monitoring: <Route size={10} />,
};

const KIND_COLORS: Record<TimelineEvent['kind'], string> = {
  rainfall: '#4AA8A0',
  sensor: '#D8C04A',
  community: '#C9B48A',
  assessment: '#5A9E78',
  monitoring: '#A9805C',
};

function TimelinePanel({
  live,
  onSelectLocation,
}: {
  live: LiveState;
  onSelectLocation: (locationId?: string) => void;
}) {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<TimelineEvent['kind'] | 'all'>('all');

  const kinds: (TimelineEvent['kind'] | 'all')[] = [
    'all',
    'rainfall',
    'sensor',
    'community',
    'assessment',
    'monitoring',
  ];

  const mergedEvents = useMemo(() => {
    const liveSensorEvents: TimelineEvent[] = live.sensorsLive
      ? live.sensors
          .filter((s) => s.latest?.receivedAt)
          .map((s) => ({
            id: `live-s-${s.deviceId}`,
            kind: 'sensor' as const,
            label: `${s.deviceId} (${t('common.live')})`,
            detail: `${s.site} · TDS ADC ${s.latest?.tdsAdcRaw ?? '—'}`,
            at: s.latest!.receivedAt,
            locationId: s.locationId,
            dataOrigin: 'live' as const,
          }))
      : [];

    return [...liveSensorEvents, ...TIMELINE_EVENTS]
      .filter((e) => filter === 'all' || e.kind === filter)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [live.sensorsLive, live.sensors, filter, t]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-ink-800 flex items-center gap-1 flex-wrap bg-ink-900/40">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-2 py-0.5 rounded-sm text-[10px] border transition-colors ${
              filter === k
                ? 'border-forest-bright text-forest-pale bg-forest-deep/60'
                : 'border-ink-700 text-ink-400 hover:text-ink-200 hover:border-ink-500'
            }`}
          >
            {k === 'all' ? t('timeline.all') : t(`timeline.${k}`)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-x-auto px-4 py-3">
        {mergedEvents.length === 0 ? (
          <p className="text-[11px] text-ink-400">{t('timeline.empty')}</p>
        ) : (
          <div className="relative min-w-max pt-1">
            <div className="absolute left-0 right-0 top-[14px] h-px bg-ink-700" />
            <div className="flex gap-6 items-start">
              {mergedEvents.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSelectLocation(e.locationId)}
                  className="shrink-0 w-[190px] text-left group"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-sm flex items-center justify-center border border-ink-950 relative z-10"
                      style={{ background: KIND_COLORS[e.kind] }}
                    >
                      <span className="text-ink-950">{KIND_ICONS[e.kind]}</span>
                    </span>
                    <span className="font-mono text-[9px] text-ink-400">
                      {new Date(e.at).toLocaleString(lang === 'kn' ? 'kn-IN' : 'en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="mt-1.5 pl-5">
                    <div className="text-[11px] font-medium text-ink-200 group-hover:text-forest-pale transition-colors leading-tight">
                      {e.labelKey ? t(e.labelKey) : e.label}
                    </div>
                    <div className="text-[10px] text-ink-400 leading-snug mt-0.5">
                      {e.detailKey ? t(e.detailKey) : e.detail}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
