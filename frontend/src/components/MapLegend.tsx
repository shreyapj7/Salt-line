import { useI18n } from '@/i18n/I18nContext';
import { heatColor01, RISK_COLORS } from '@/lib/format';

export default function MapLegend({ heatmapActive }: { heatmapActive: boolean }) {
  const { t } = useI18n();
  const risks = ['low', 'moderate', 'elevated', 'high'] as const;

  return (
    <div className="absolute bottom-3 left-3 z-[600] hidden max-h-[min(60vh,460px)] max-w-[min(260px,calc(100%-24px))] overflow-y-auto rounded-xl border border-earth-gold/70 bg-ink-900 px-4 py-3 shadow-lg sm:block">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-200">
        {t('map.legend')}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 border border-dashed border-teal-300/70"
            style={{ background: 'rgba(71,124,149,0.08)' }}
          />
          <span className="text-[10px] text-ink-300">{t('map.boundary')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="ml-0.5 mr-0.5 h-2.5 w-2.5 rotate-45 border border-ink-950 bg-forest-bright" />
          <span className="text-[10px] text-ink-300">{t('map.station')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border border-ink-950 bg-teal-400" />
          <span className="text-[10px] text-ink-300">{t('map.community')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border border-dashed border-earth-sand bg-earth-clay/30" />
          <span className="text-[10px] text-ink-300">{t('map.candidate')}</span>
        </div>
        {heatmapActive && (
          <div className="mt-2 border-t border-ink-700 pt-2">
            <p className="mb-1.5 text-[9px] font-medium text-teal-300">{t('layers.priority')}</p>
            <div
              className="h-2 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${heatColor01(0)}, ${heatColor01(0.35)}, ${heatColor01(0.68)}, ${heatColor01(1)})`,
              }}
            />
            <div className="mt-1 flex justify-between font-mono text-[9px] text-ink-400">
              <span>0</span>
              <span>1</span>
            </div>
            <p className="mt-2 text-[9px] leading-4 text-ink-500">{t('map.priorityHeatNote')}</p>
          </div>
        )}
        <div className="pt-1 mt-1 border-t border-ink-700">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {risks.map((r) => (
              <div key={r} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2 rounded-xs" style={{ background: RISK_COLORS[r] }} />
                <span className="text-[10px] text-ink-400">{t(`risk.${r}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
