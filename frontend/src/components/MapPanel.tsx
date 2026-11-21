import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Rectangle,
  CircleMarker,
  Marker,
  Tooltip,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import CgwbStationsLayer from './CgwbStationsLayer';
import 'leaflet/dist/leaflet.css';
import { Plus, Minus, Crosshair, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { MonitoringLocation } from '@/types';
import type { LiveState } from '@/hooks/useLiveData';
import { PILOT_BOUNDARY, PILOT_CENTER, makeDemoGrid } from '@/data/demoData';
import { LAYERS, layerField, rawLayerValue, type LayerId } from '@/map/layers';
import {
  heatColor01,
  normalizeValues,
  fmtNum,
  RISK_COLORS,
  localizedLocationName,
} from '@/lib/format';

export type Basemap = 'satellite' | 'dark' | 'terrain';

const BASEMAPS: Record<
  Basemap,
  { url: string; attribution: string; maxZoom: number; subdomains?: string }
> = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
    subdomains: 'abcd',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data &copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap',
    maxZoom: 17,
    subdomains: 'abc',
  },
};

interface MapPanelProps {
  live: LiveState;
  basemap: Basemap;
  visibleLayers: Set<LayerId>;
  activeOverlay: LayerId | null;
  overlayOpacity: number;
  selectedId: string | null;
  onSelect: (loc: MonitoringLocation) => void;
}

function stationDiamondIcon(color: string, active: boolean): L.DivIcon {
  const size = active ? 15 : 12;
  const ring = active ? 'var(--color-ocean-deep)' : 'var(--color-card)';
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid ${ring};transform:rotate(45deg);box-shadow:0 1px 4px rgba(41,45,39,0.28);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function communityMarkerColor(loc: MonitoringLocation): string {
  if (loc.verification === 'pending' || loc.verification === 'candidate') return 'var(--color-earth-medium)';
  return 'var(--color-ocean-medium)';
}

function HeatGrid({
  layerId,
  live,
  opacity,
}: {
  layerId: LayerId;
  live: LiveState;
  opacity: number;
}) {
  const { t } = useI18n();
  const meta = LAYERS.find((l) => l.id === layerId);
  const cells = useMemo(() => {
    const grid = makeDemoGrid((loc) => layerField(layerId, loc), live.locations);
    const rawGrid = makeDemoGrid((loc) => rawLayerValue(layerId, loc), live.locations);
    const vals = normalizeValues(grid.map((c) => c.value));
    return grid.map((c, i) => ({
      ...c,
      norm: vals[i],
      rawValue: rawGrid[i]?.value,
    }));
  }, [layerId, live.locations]);

  if (!meta) return null;

  return (
    <>
      {cells.map((c) => (
        <Rectangle
          key={c.id}
          bounds={[
            [c.lat, c.lng],
            [c.lat + c.sizeDeg, c.lng + c.sizeDeg],
          ]}
          pathOptions={{
            fillColor: heatColor01(c.norm),
            fillOpacity: opacity,
            color: 'rgba(41, 45, 39, 0.25)',
            weight: 0.5,
          }}
        >
          <Tooltip direction="top" opacity={1} className="sl-leaflet-tooltip">
            <div className="text-[10px] leading-snug space-y-0.5">
              <div className="font-semibold text-ink-100">{t(meta.labelKey)}</div>
              <div className="font-mono text-ink-200">
                {t(meta.status === 'simulated' ? 'layers.simulated' : 'layers.demo')} ·{' '}
                {fmtNum(c.rawValue ?? c.value, 2)}
              </div>
              <div className="text-ink-400">{t('map.activeGridNote')}</div>
            </div>
          </Tooltip>
        </Rectangle>
      ))}
    </>
  );
}

function SmoothPriorityHeat({ live, opacity }: { live: LiveState; opacity: number }) {
  const map = useMap();
  const priorityLocations = useMemo(
    () =>
      live.locations.filter(
        (location): location is MonitoringLocation & { provisionalPriority: number } =>
          location.provisionalPriority !== undefined &&
          Number.isFinite(location.provisionalPriority),
      ),
    [live.locations],
  );

  useEffect(() => {
    if (priorityLocations.length === 0) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is required to render the priority heatmap.');

    const container = map.getContainer();
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '350';
    container.appendChild(canvas);

    const draw = () => {
      const size = map.getSize();
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(size.x * pixelRatio);
      canvas.height = Math.round(size.y * pixelRatio);
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, size.x, size.y);
      context.globalCompositeOperation = 'source-over';

      for (const location of priorityLocations) {
        const score = Math.max(0, Math.min(1, location.provisionalPriority));
        if (score === 0) continue;

        const center = map.latLngToContainerPoint([location.lat, location.lng]);
        const radius = 46;
        const alpha = Math.min(0.34, score * 0.42) * opacity;
        const rgba = heatColor01(score).replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
        const fadedRgba = heatColor01(score)
          .replace('rgb(', 'rgba(')
          .replace(')', `, ${alpha * 0.42})`);
        const gradient = context.createRadialGradient(
          center.x,
          center.y,
          0,
          center.x,
          center.y,
          radius,
        );
        gradient.addColorStop(0, rgba);
        gradient.addColorStop(0.48, fadedRgba);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = gradient;
        context.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
      }
    };

    draw();
    map.on('move zoom resize', draw);
    return () => {
      map.off('move zoom resize', draw);
      canvas.remove();
    };
  }, [map, opacity, priorityLocations]);

  return null;
}

function MapControllers({
  locations,
  selected,
  resetSignal,
}: {
  locations: MonitoringLocation[];
  selected: MonitoringLocation | null;
  resetSignal: number;
}) {
  const map = useMap();
  const hasFitRef = useRef(false);

  useEffect(() => {
    if (!hasFitRef.current && locations.length > 0) {
      map.fitBounds(
        locations.map((l) => [l.lat, l.lng] as [number, number]),
        { padding: [44, 44] },
      );
      hasFitRef.current = true;
    }
  }, [map, locations]);

  useEffect(() => {
    if (resetSignal > 0 && locations.length > 0) {
      map.fitBounds(
        locations.map((l) => [l.lat, l.lng] as [number, number]),
        { padding: [44, 44], animate: true },
      );
    }
  }, [map, resetSignal, locations]);

  useEffect(() => {
    if (selected) {
      map.panTo([selected.lat, selected.lng], { animate: true, duration: 0.45 });
    }
  }, [map, selected?.id]);

  return null;
}

function ScaleBar() {
  const map = useMap();
  useEffect(() => {
    const scale = L.control.scale({ imperial: false, position: 'bottomright' });
    scale.addTo(map);
    return () => {
      scale.remove();
    };
  }, [map]);
  return null;
}

function MapSizeObserver() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function CustomZoomControls({ onReset }: { onReset: () => void }) {
  const map = useMap();
  const { t } = useI18n();
  return (
    <div className="absolute top-3 right-3 z-[600] flex flex-col gap-1 pointer-events-auto">
      <div className="bg-ink-900/92 backdrop-blur-md border border-ink-600 rounded-sm px-2 py-1 text-center shadow-lg">
        <div className="text-[10px] leading-none text-ink-100 font-semibold font-mono">
          ▲ {t('map.north')}
        </div>
      </div>
      <div className="flex flex-col bg-ink-900/92 backdrop-blur-md border border-ink-600 rounded-sm shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          className="p-1.5 text-ink-200 hover:bg-ink-800 hover:text-ink-100 border-b border-ink-700 transition-colors"
          title={t('map.zoomIn')}
          aria-label={t('map.zoomIn')}
        >
          <Plus size={13} />
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          className="p-1.5 text-ink-200 hover:bg-ink-800 hover:text-ink-100 border-b border-ink-700 transition-colors"
          title={t('map.zoomOut')}
          aria-label={t('map.zoomOut')}
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          onClick={onReset}
          className="p-1.5 text-forest-bright hover:bg-ink-800 hover:text-forest-pale transition-colors"
          title={t('map.resetView')}
          aria-label={t('map.resetView')}
        >
          <Crosshair size={13} />
        </button>
      </div>
    </div>
  );
}

export default function MapPanel({
  live,
  basemap,
  visibleLayers,
  activeOverlay,
  overlayOpacity,
  selectedId,
  onSelect,
}: MapPanelProps) {
  const { t, lang } = useI18n();
  const bm = BASEMAPS[basemap];
  const locations = live.locations;
  const selected = locations.find((l) => l.id === selectedId) ?? null;
  const [resetSignal, setResetSignal] = useState(0);
  const activeMeta = activeOverlay ? LAYERS.find((l) => l.id === activeOverlay) : null;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={PILOT_CENTER}
        zoom={11}
        minZoom={9}
        maxZoom={bm.maxZoom}
        zoomControl={false}
        className="h-full w-full bg-ink-950"
        attributionControl={true}
      >
        <TileLayer
          key={basemap}
          url={bm.url}
          attribution={bm.attribution}
          subdomains={bm.subdomains ? bm.subdomains.split('') : 'abc'}
          maxZoom={bm.maxZoom}
        />

        <MapControllers
          locations={locations}
          selected={selected}
          resetSignal={resetSignal}
        />
        <CgwbStationsLayer />
        <MapSizeObserver />
        <ScaleBar />
        <CustomZoomControls
          onReset={() => setResetSignal((current) => current + 1)}
        />

        {visibleLayers.has('boundary') && (
          <Polygon
            positions={PILOT_BOUNDARY}
            pathOptions={{
              color: 'var(--color-ocean-medium)',
              opacity: 0.48,
              weight: 1.2,
              fill: true,
              fillColor: 'var(--color-ocean-medium)',
              fillOpacity: 0.025,
              dashArray: '6 4',
            }}
          />
        )}

        {activeOverlay && activeMeta?.kind === 'overlay' &&
          (activeOverlay === 'priority' ? (
            <SmoothPriorityHeat live={live} opacity={overlayOpacity} />
          ) : (
            <HeatGrid layerId={activeOverlay} live={live} opacity={overlayOpacity} />
          ))}

        {visibleLayers.has('stations') &&
          locations
            .filter((l) => l.type === 'station')
            .map((loc) => {
              const color = loc.risk ? RISK_COLORS[loc.risk] : 'var(--color-sage)';
              const isSelected = selectedId === loc.id;
              return (
                <Marker
                  key={loc.id}
                  position={[loc.lat, loc.lng]}
                  icon={stationDiamondIcon(color, isSelected)}
                  eventHandlers={{ click: () => onSelect(loc) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1} className="sl-leaflet-tooltip">
                    <div className="text-[10px] leading-snug">
                      <div className="font-semibold text-ink-100">
                        {localizedLocationName(loc, lang)}
                      </div>
                      <div className="text-forest-pale">{t('ver.authority')}</div>
                    </div>
                  </Tooltip>
                  <Popup className="sl-leaflet-popup" maxWidth={320} minWidth={220} autoPanPadding={[24, 24]}>
                    <MapPopupContent loc={loc} />
                  </Popup>
                </Marker>
              );
            })}

        {visibleLayers.has('community') &&
          locations
            .filter((l) => l.type === 'community')
            .map((loc) => {
              const isSelected = selectedId === loc.id;
              const isPending = loc.verification === 'pending' || loc.verification === 'candidate';
              return (
                <CircleMarker
                  key={loc.id}
                  center={[loc.lat, loc.lng]}
                  radius={isSelected ? 8 : 6}
                  pathOptions={{
                    color: isSelected ? 'var(--color-ocean-deep)' : isPending ? 'var(--color-earth-medium)' : 'var(--color-card)',
                    weight: isSelected ? 2.5 : 1.5,
                    fillColor: communityMarkerColor(loc),
                    fillOpacity: 0.9,
                    dashArray: isPending ? '3 2' : undefined,
                  }}
                  eventHandlers={{ click: () => onSelect(loc) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1} className="sl-leaflet-tooltip">
                    <div className="text-[10px] leading-snug">
                      <div className="font-semibold text-ink-100">
                        {localizedLocationName(loc, lang)}
                      </div>
                      <div className="text-teal-300">{t(`ver.${loc.verification}`)}</div>
                    </div>
                  </Tooltip>
                  <Popup className="sl-leaflet-popup" maxWidth={320} minWidth={220} autoPanPadding={[24, 24]}>
                    <MapPopupContent loc={loc} />
                  </Popup>
                </CircleMarker>
              );
            })}

        {selected && (
          <Circle
            center={[selected.lat, selected.lng]}
            radius={420}
            pathOptions={{ color: 'var(--color-ocean-deep)', weight: 1.5, fill: false, dashArray: '4 3' }}
          />
        )}
      </MapContainer>

      {/* Active raster overlay status pill */}
      {activeMeta && (
        <div className="absolute left-3 right-14 top-14 z-[590] hidden items-center pointer-events-none sm:flex xl:top-3">
          <div className={`pointer-events-auto inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border px-3 py-2 text-[10px] shadow-lg backdrop-blur-md ${
            activeOverlay === 'priority'
              ? 'border-teal-400/25 bg-ink-900/95 text-teal-300'
              : 'border-risk-moderate/25 bg-ink-900/95 text-earth-sand'
          }`}>
            <AlertTriangle size={11} className="shrink-0" />
            <span className="font-semibold uppercase tracking-wide">
              {t(`layers.${activeMeta.status}`)}
            </span>
            <span className="text-ink-200">· {t(activeMeta.labelKey)}</span>
            <span className="text-ink-400 hidden lg:inline">
              — {t(activeOverlay === 'priority' ? 'map.priorityHeatNote' : 'map.activeGridNote')}
            </span>
          </div>
        </div>
      )}

      {activeOverlay === 'priority' &&
        !live.locations.some((location) => location.provisionalPriority !== undefined) && (
          <div className="absolute left-1/2 top-1/2 z-[590] -translate-x-1/2 -translate-y-1/2 rounded-sm border border-ink-600 bg-ink-900/90 px-3 py-2 text-[10px] text-ink-300 shadow-lg">
            {t('layers.noPriority')}
          </div>
        )}

      {/* Subtle click hint when nothing is selected */}
      {!selected && (
        <div className="absolute bottom-16 right-3 z-[590] hidden max-w-[min(260px,calc(100%-24px))] pointer-events-none rounded-lg border border-earth-gold/50 bg-ink-900/95 px-2.5 py-1.5 text-[10px] text-ink-300 shadow-sm md:block">
          {t('map.clickHint')}
        </div>
      )}
    </div>
  );
}

function MapPopupContent({ loc }: { loc: MonitoringLocation }) {
  const { t, lang } = useI18n();
  return (
    <div className="w-full min-w-0 space-y-2 text-[11px] leading-relaxed text-[var(--color-text)]">
      <header className="border-b border-[var(--color-border)] pb-2 pr-5">
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-earth-medium)]">
          {t('right.title')}
        </p>
        <h3 className="break-words text-[13px] font-semibold leading-snug text-[var(--color-text)]">
          {localizedLocationName(loc, lang)}
        </h3>
        <p className="mt-1 break-words text-[10px] text-[var(--color-secondary)]">
          {loc.admin} · <span className="font-mono">{loc.id}</span>
        </p>
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 text-[10px]">
        <span className="min-w-0 break-words text-[var(--color-earth-medium)]">{t('right.gwHead')}</span>
        <span className="min-w-0 break-words text-right font-mono text-[var(--color-text)]">
          {loc.gwHeadM !== undefined ? `${fmtNum(loc.gwHeadM)} m` : t('right.notAvailable')}
        </span>
        <span className="min-w-0 break-words text-[var(--color-earth-medium)]">{t('right.elevation')}</span>
        <span className="min-w-0 break-words text-right font-mono text-[var(--color-text)]">
          {loc.elevation !== undefined ? `${loc.elevation} m` : t('right.notAvailable')}
        </span>
        <span className="min-w-0 break-words text-[var(--color-earth-medium)]">{t('right.coastDist')}</span>
        <span className="min-w-0 break-words text-right font-mono text-[var(--color-text)]">
          {loc.distanceToCoast !== undefined
            ? `${loc.distanceToCoast} km`
            : t('right.notAvailable')}
        </span>
        <span className="min-w-0 break-words text-[var(--color-earth-medium)]">{t('right.rainfall')}</span>
        <span className="min-w-0 break-words text-right font-mono text-[var(--color-text)]">
          {loc.rainfallDeficitPct !== undefined
            ? `${fmtNum(loc.rainfallDeficitPct)}%`
            : t('right.notAvailable')}
        </span>
      </div>
      {loc.ndmi !== undefined && (
        <div className="border-t border-[var(--color-border)] pt-1.5 text-[10px] text-[var(--color-earth-medium)]">
          NDMI {fmtNum(loc.ndmi, 2)}
          {loc.ndmiSimulated && ` · ${t('layers.simulated')}`}
        </div>
      )}
      {(loc.risk || loc.provisionalPriority !== undefined) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--color-border)] pt-1.5">
          {loc.risk && (
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text)]"
            style={{ background: RISK_COLORS[loc.risk] }}
          >
            {t(`risk.${loc.risk}`)}
          </span>
          )}
          <span className="ml-auto text-[9px] text-[var(--color-secondary)]">
            {loc.dataOrigin === 'live' ? t('common.live') : t('layers.demo')}
          </span>
          {loc.provisionalPriority !== undefined && (
            <div className="flex w-full items-center justify-between gap-3 pt-1 text-[10px]">
              <span className="text-[var(--color-earth-medium)]">{t('layers.priority')}</span>
              <span className="font-mono font-semibold text-[var(--color-forest)]">
                {fmtNum(loc.provisionalPriority, 2)} · {t('layers.provisional')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
