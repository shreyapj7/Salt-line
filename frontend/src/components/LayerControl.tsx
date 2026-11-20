import { useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { LAYERS, type LayerId, type LayerStatus } from '@/map/layers';
import type { Basemap } from '@/components/MapPanel';

interface Props {
  visibleLayers: Set<LayerId>;
  onToggleVectorLayer: (id: 'boundary' | 'stations' | 'community') => void;
  activeOverlay: LayerId | null;
  onSelectOverlay: (id: LayerId | null) => void;
  overlayOpacity: number;
  onSetOverlayOpacity: (opacity: number) => void;
  basemap: Basemap;
  onSetBasemap: (b: Basemap) => void;
}

const STATUS_STYLES: Record<LayerStatus, string> = {
  available: 'text-forest-bright border-forest-light/60 bg-forest-deep/40',
  simulated: 'text-risk-moderate border-risk-moderate/60 bg-risk-moderate/10',
  demo: 'text-earth-sand border-earth-clay/60 bg-earth-clay/10',
  provisional: 'text-teal-300 border-teal-700/60 bg-teal-850/50',
  unavailable: 'text-ink-400 border-ink-500/60',
};

export default function LayerControl({
  visibleLayers,
  onToggleVectorLayer,
  activeOverlay,
  onSelectOverlay,
  overlayOpacity,
  onSetOverlayOpacity,
  basemap,
  onSetBasemap,
}: Props) {
  const { t } = useI18n();
  const [infoOpenId, setInfoOpenId] = useState<LayerId | null>(null);
  const [open, setOpen] = useState(true);

  const vectorLayers = LAYERS.filter((l) => l.kind !== 'overlay');
  const overlayLayers = LAYERS.filter((l) => l.kind === 'overlay');

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-earth-gold/65 bg-ink-900 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full shrink-0 items-center gap-2 px-3 py-3 text-left transition-colors hover:bg-ink-800/80"
        >
          <Layers size={15} className="shrink-0 text-forest-base" />
          <span className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wider text-ink-100">
            {t('map.layers')}
          </span>
          <ChevronDown
            size={12}
            className={`shrink-0 text-ink-400 transition-transform ${open ? '' : '-rotate-90'}`}
          />
        </button>

        {open && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-ink-700">
            {/* Basemap switcher */}
            <div className="border-b border-earth-gold/50 px-3 py-3">
              <div className="text-[9px] text-ink-400 uppercase tracking-wider mb-1.5">
                {t('map.basemap')}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['satellite', 'dark', 'terrain'] as Basemap[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => onSetBasemap(b)}
                    className={`min-w-0 px-1.5 py-1.5 text-[10px] rounded-md border transition-colors ${
                      basemap === b
                        ? 'border-teal-500 bg-teal-850 text-teal-300 font-medium'
                        : 'border-earth-gold text-ink-300 hover:border-forest-light hover:text-ink-100'
                    }`}
                  >
                    {t(`map.${b}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Vector & Site Markers */}
            <div className="px-3 pt-3 pb-1.5 text-[9px] text-ink-400 uppercase tracking-wider">
              {t('map.markersGroup')}
            </div>
            <div className="divide-y divide-ink-800 border-b border-ink-700">
              {vectorLayers.map((layer) => {
                const visible = visibleLayers.has(layer.id);
                const isInfoOpen = infoOpenId === layer.id;
                return (
                  <div key={layer.id}>
                    <div className="flex items-start gap-2.5 px-3 py-2 hover:bg-ink-800/50">
                      <button
                        onClick={() =>
                          onToggleVectorLayer(layer.id as 'boundary' | 'stations' | 'community')
                        }
                        className={`w-3.5 h-3.5 shrink-0 rounded-sm border transition-colors flex items-center justify-center ${
                          visible
                            ? 'bg-teal-500 border-teal-300'
                            : 'bg-transparent border-ink-500 hover:border-ink-300'
                        }`}
                        title={visible ? t('layers.hide') : t('layers.show')}
                        aria-pressed={visible}
                      >
                        {visible && <span className="w-1.5 h-1.5 bg-ink-950 rounded-xs" />}
                      </button>
                      <button
                        onClick={() => setInfoOpenId(isInfoOpen ? null : layer.id)}
                        aria-expanded={isInfoOpen}
                        className="min-w-0 flex-1 break-words text-left text-[11px] leading-snug text-ink-200 transition-colors hover:text-ink-100"
                      >
                        {t(layer.labelKey)}
                      </button>
                    </div>
                    {isInfoOpen && <LayerMetaDetails layerId={layer.id} />}
                  </div>
                );
              })}
            </div>

            {/* Spatial Overlays */}
            <div className="px-3 pt-3 pb-1.5 text-[9px] text-ink-400 uppercase tracking-wider">
              {t('map.overlaysGroup')}
            </div>
            <p className="px-3 pb-2 text-[9px] leading-relaxed text-ink-500">
              {t('map.overlaysDisclosure')}
            </p>
            <div className="divide-y divide-ink-800">
              {overlayLayers.map((layer) => {
                const active = activeOverlay === layer.id;
                const isInfoOpen = infoOpenId === layer.id;
                return (
                  <div key={layer.id}>
                    <div className="flex items-start gap-2.5 px-3 py-2 hover:bg-ink-800/50">
                      <button
                        onClick={() => onSelectOverlay(active ? null : layer.id)}
                        aria-label={`${active ? t('layers.hide') : t('layers.show')}: ${t(layer.labelKey)}`}
                        className={`w-3.5 h-3.5 shrink-0 rounded-full border transition-colors flex items-center justify-center ${
                          active
                            ? 'border-teal-300 bg-teal-400/25 shadow-[0_0_8px_rgba(36,75,99,0.12)]'
                            : 'border-ink-500 hover:border-teal-300'
                        }`}
                        title={active ? t('layers.hide') : t('layers.show')}
                        aria-pressed={active}
                      >
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-risk-elevated" />}
                      </button>
                      <button
                        onClick={() => {
                          onSelectOverlay(active ? null : layer.id);
                          setInfoOpenId(active && isInfoOpen ? null : layer.id);
                        }}
                        aria-expanded={isInfoOpen || active}
                        className={`min-w-0 flex-1 break-words text-left text-[11px] leading-snug transition-colors ${
                          active ? 'text-ink-100 font-medium' : 'text-ink-200 hover:text-ink-100'
                        }`}
                      >
                        {t(layer.labelKey)}
                      </button>
                    </div>
                    {(isInfoOpen || active) && <LayerMetaDetails layerId={layer.id} />}
                    {layer.id === 'priority' && active && (
                      <div className="border-t border-earth-gold/45 bg-ink-950 px-3 py-3">
                        <div className="flex items-center justify-between gap-3 text-[10px]">
                          <label htmlFor="priority-heat-opacity" className="text-ink-300">
                            {t('map.heatmapOpacity')}
                          </label>
                          <span className="font-mono text-teal-300">
                            {Math.round(overlayOpacity * 100)}%
                          </span>
                        </div>
                        <input
                          id="priority-heat-opacity"
                          type="range"
                          min={0.1}
                          max={0.9}
                          step={0.05}
                          value={overlayOpacity}
                          onChange={(event) => onSetOverlayOpacity(Number(event.target.value))}
                          className="mt-2 w-full accent-teal-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LayerMetaDetails({ layerId }: { layerId: LayerId }) {
  const { t } = useI18n();
  const layer = LAYERS.find((l) => l.id === layerId);
  if (!layer) return null;

  return (
    <div className="px-2.5 pb-2 pt-1 bg-ink-950/75 border-t border-ink-800">
      <div className="grid grid-cols-[66px_1fr] gap-x-2 gap-y-0.5 text-[10px] leading-[1.45]">
        <span className="text-ink-400">{t('layers.source')}</span>
        <span className="text-ink-200">{t(layer.sourceKey)}</span>
        {layer.unitKey && (
          <>
            <span className="text-ink-400">{t('layers.unit')}</span>
            <span className="text-ink-200">{t(layer.unitKey)}</span>
          </>
        )}
        <span className="text-ink-400">{t('layers.status')}</span>
        <span
          className={`px-1 rounded-sm border text-[9px] tracking-wide justify-self-start ${
            STATUS_STYLES[layer.status]
          }`}
        >
          {t(`layers.${layer.status}`)}
        </span>
        <span className="text-ink-400">{t('layers.what')}</span>
        <span className="text-ink-300">{t(layer.whatKey)}</span>
      </div>
      {layer.kind === 'overlay' && (
        <div className="mt-1.5">
          <div className="text-[9px] text-ink-400 mb-0.5">{t('layers.legend')}</div>
          <div
            className="h-[7px] w-full rounded-xs"
            style={{
              background: `linear-gradient(90deg, ${layer.legendLow}, var(--color-sage), ${layer.legendHigh})`,
            }}
          />
          <div className="flex justify-between text-[9px] text-ink-400 mt-0.5">
            <span>{t('layers.lowConcern')}</span>
            <span>{t('layers.highConcern')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
