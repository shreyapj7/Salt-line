import {
  AlertTriangle,
  Droplets,
  Gauge,
  MapPin,
  Radio,
  Cpu,
  ShieldCheck,
  Target,
  PanelLeftClose,
} from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '@/i18n/I18nContext';
import type { LiveState } from '@/hooks/useLiveData';
import { fmtNum, fmtPct, RISK_COLORS } from '@/lib/format';

const RISK_ORDER = ['low', 'moderate', 'elevated', 'high'] as const;
const RISK_FILL = RISK_ORDER.map((risk) => RISK_COLORS[risk]);

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: string;
}

function StatRow({ icon, label, value, highlight }: StatRowProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 hover:bg-ink-800/70 transition-colors">
      <div className="flex items-center gap-2 text-ink-200 min-w-0">
        <span className="text-ink-400 shrink-0">{icon}</span>
        <span className="truncate text-[11px]">{label}</span>
      </div>
      <span className={`font-mono text-[12px] tabular-nums shrink-0 ml-2 ${highlight ?? 'text-ink-100'}`}>
        {value}
      </span>
    </div>
  );
}

interface AnalyticsPanelProps {
  live: LiveState;
  onCollapse?: () => void;
}

export default function AnalyticsPanel({ live, onCollapse }: AnalyticsPanelProps) {
  const { t } = useI18n();
  const { locations } = live;

  const verifiedStations = locations.filter((l) => l.verification === 'authority').length;
  const communitySites = locations.filter((l) => l.type === 'community').length;
  const needMonitoring = locations.filter(
    (l) =>
      (l.provisionalPriority !== undefined && l.provisionalPriority >= 0.5) ||
      l.verification === 'candidate' ||
      l.verification === 'pending',
  ).length;

  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : undefined);

  const coverages = locations.map((l) => l.coverage).filter((v): v is number => v !== undefined);
  const confidences = locations.map((l) => l.confidence).filter((v): v is number => v !== undefined);
  const overallCoverage = avg(coverages);
  const overallConfidence = avg(confidences);

  const riskCounts = RISK_ORDER.map((r) => locations.filter((l) => l.risk === r).length);
  const riskData = RISK_ORDER.map((r, i) => ({
    key: r,
    name: t(`risk.${r}`),
    value: riskCounts[i],
  }));

  const deficits = locations.map((l) => l.rainfallDeficitPct).filter((v): v is number => v !== undefined);
  const ndmis = locations.map((l) => l.ndmi).filter((v): v is number => v !== undefined);
  const heads = locations.map((l) => l.gwHeadM).filter((v): v is number => v !== undefined);

  return (
    <aside className="w-[276px] h-full shrink-0 border-r border-ink-700 bg-ink-850 overflow-y-auto flex flex-col">
      <div className="px-3 py-2 border-b border-ink-700 bg-ink-900/60 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold tracking-wider text-ink-200 uppercase truncate">
          {t('panel.left.title')}
        </h2>
        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-px rounded-sm border text-[9px] tracking-wide ${
              live.locationsLive
                ? 'border-forest-light/60 text-forest-bright bg-forest-deep/40'
                : 'border-earth-clay/60 text-earth-sand bg-earth-clay/10'
            }`}
          >
            {live.locationsLive ? t('common.live') : t('common.demo')}
          </span>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1 rounded-sm text-ink-400 hover:text-ink-100 hover:bg-ink-800 transition-colors"
              title={t('left.hidePanel')}
              aria-label={t('left.hidePanel')}
            >
              <PanelLeftClose size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Six core monitoring metrics */}
      <div className="py-1 divide-y divide-ink-800 border-b border-ink-700">
        <StatRow icon={<MapPin size={12} />} label={t('left.locations')} value={locations.length} />
        <StatRow
          icon={<ShieldCheck size={12} className="text-forest-bright" />}
          label={t('left.stations')}
          value={verifiedStations}
          highlight="text-forest-pale"
        />
        <StatRow
          icon={<MapPin size={12} className="text-teal-400" />}
          label={t('left.candidates')}
          value={communitySites}
          highlight="text-teal-300"
        />
        <StatRow
          icon={<Target size={12} className="text-risk-elevated" />}
          label={t('left.needMonitoring')}
          value={needMonitoring}
          highlight="text-risk-elevated"
        />
        <StatRow
          icon={<Gauge size={12} />}
          label={t('left.coverageAvg')}
          value={fmtPct(overallCoverage)}
        />
        <StatRow
          icon={<Gauge size={12} />}
          label={t('left.confidenceAvg')}
          value={fmtPct(overallConfidence)}
        />
      </div>

      {/* Evidence coverage bar */}
      <div className="px-3 py-2 border-b border-ink-700 space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-ink-400">{t('left.coverageAvg')}</span>
          <span className="font-mono text-teal-300">{fmtPct(overallCoverage)}</span>
        </div>
        <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-400 transition-all duration-300"
            style={{ width: fmtPct(overallCoverage ?? 0) }}
          />
        </div>
        <div className="flex justify-between text-[10px] pt-0.5">
          <span className="text-ink-400">{t('left.confidenceAvg')}</span>
          <span className="font-mono text-forest-pale">{fmtPct(overallConfidence)}</span>
        </div>
        <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-forest-bright transition-all duration-300"
            style={{ width: fmtPct(overallConfidence ?? 0) }}
          />
        </div>
      </div>

      {/* Provisional risk distribution */}
      <div className="border-b border-ink-700 px-3 pt-2.5 pb-2">
        <h3 className="text-[10px] font-semibold tracking-wider text-ink-300 uppercase mb-1.5">
          {t('left.riskDist')}
        </h3>
        <div className="h-[92px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={riskData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#A8B8C8', fontSize: 10 }}
                axisLine={{ stroke: '#2D4862' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8195AA', fontSize: 10 }}
                axisLine={{ stroke: '#2D4862' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  background: '#0D1B2A',
                  border: '1px solid rgba(129,149,170,.2)',
                  fontSize: 11,
                  color: '#F3F7FC',
                  borderRadius: '10px',
                }}
                formatter={(value) => [String(value ?? ''), t('left.riskDist')]}
              />
              <Bar dataKey="value" maxBarSize={28} radius={[2, 2, 0, 0]}>
                {riskData.map((d, i) => (
                  <Cell key={d.key} fill={RISK_FILL[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[10px] leading-[1.45] text-ink-400 mt-1.5 mb-2">{t('left.demoNote')}</p>

        <div className="space-y-1">
          {riskData.map((d, i) => {
            const total = locations.length || 1;
            const pct = (riskCounts[i] / total) * 100;
            return (
              <div key={d.key} className="flex items-center gap-1.5">
                <span className="w-16 shrink-0 text-[10px] text-ink-300 truncate">{d.name}</span>
                <div className="h-[6px] flex-1 bg-ink-700 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, background: RISK_FILL[i] }} />
                </div>
                <span className="w-4 text-right font-mono text-[10px] text-ink-200">{riskCounts[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Environmental indicators */}
      <div className="px-3 pt-2.5 pb-2">
        <h3 className="text-[10px] font-semibold tracking-wider text-ink-300 uppercase mb-1">
          {t('left.envIndicators')}
        </h3>
        <div className="divide-y divide-ink-800 -mx-3">
          <StatRow icon={<Droplets size={12} />} label={t('left.avgDeficit')} value={`${fmtNum(avg(deficits))}%`} />
          <StatRow icon={<Gauge size={12} />} label={t('left.avgGwHead')} value={`${fmtNum(avg(heads))} m`} />
          <StatRow icon={<Cpu size={12} />} label={t('left.avgNdmi')} value={fmtNum(avg(ndmis), 2)} />
        </div>
        <div className="mt-2 flex gap-1.5 items-start border border-risk-moderate/50 bg-risk-moderate/10 rounded-sm px-2 py-1.5">
          <AlertTriangle size={12} className="text-risk-moderate shrink-0 mt-0.5" />
          <p className="text-[10px] leading-[1.4] text-risk-moderate">{t('left.simulatedNdmi')}</p>
        </div>
      </div>

      <div className="flex-1" />
      <div className="border-t border-ink-700 px-3 py-2 text-[10px] text-ink-400 flex items-center gap-1.5 bg-ink-900/50">
        <Radio size={11} className="text-forest-bright shrink-0" />
        <span className="truncate">{t('left.footer', { count: locations.length })}</span>
      </div>
    </aside>
  );
}
