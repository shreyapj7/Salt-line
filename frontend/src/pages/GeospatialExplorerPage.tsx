import { useState } from 'react';
import { AlertTriangle, MapPin, PanelLeftOpen, PanelRightOpen, Search } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { LiveState } from '@/hooks/useLiveData';
import type { MonitoringLocation } from '@/types';
import type { LayerId } from '@/map/layers';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import LayerControl from '@/components/LayerControl';
import LocationPanel from '@/components/LocationPanel';
import MapLegend from '@/components/MapLegend';
import MapPanel, { type Basemap } from '@/components/MapPanel';
import { localizedLocationName } from '@/lib/format';
import { StatusBadge } from '@/components/PagePrimitives';

type MobileDrawer = 'right' | null;

interface GeospatialExplorerPageProps {
  live: LiveState;
  basemap: Basemap;
  onSetBasemap: (basemap: Basemap) => void;
  visibleLayers: Set<LayerId>;
  onToggleVectorLayer: (id: 'boundary' | 'stations' | 'community') => void;
  activeOverlay: LayerId | null;
  onSetActiveOverlay: (id: LayerId | null) => void;
  overlayOpacity: number;
  onSetOverlayOpacity: (opacity: number) => void;
  selectedId: string | null;
  onSelectLocation: (location: MonitoringLocation) => void;
  rightOpen: boolean;
  mobileDrawer: MobileDrawer;
  onSetMobileDrawer: (drawer: MobileDrawer) => void;
  onCloseLocation: () => void;
}

export default function GeospatialExplorerPage({
  live,
  basemap,
  onSetBasemap,
  visibleLayers,
  onToggleVectorLayer,
  activeOverlay,
  onSetActiveOverlay,
  overlayOpacity,
  onSetOverlayOpacity,
  selectedId,
  onSelectLocation,
  rightOpen,
  mobileDrawer,
  onSetMobileDrawer,
  onCloseLocation,
}: GeospatialExplorerPageProps) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingLocations = live.locations
    .filter((location) => {
      if (!normalizedQuery) return true;
      return [location.name, location.nameKn, location.id, location.admin]
        .filter((value): value is string => value !== undefined)
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    })
    .slice(0, 8);

  const handleLocationChoice = (location: MonitoringLocation) => {
    onSelectLocation(location);
    setQuery('');
    setSearchOpen(false);
  };

  const selected = live.locations.find((location) => location.id === selectedId) ?? null;

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-ink-950">
      <header className="relative z-[700] shrink-0 border-b border-white/[0.07] bg-ink-950/95 px-5 py-5 backdrop-blur-xl sm:px-7 lg:px-9">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl">
                {t('page.groundwaterMap')}
              </h1>
              <StatusBadge
                label={t(live.locationsLive ? 'map.liveLocations' : 'map.demoLocations')}
                kind={live.locationsLive ? 'live' : 'demo'}
              />
            </div>
            <p className="max-w-3xl text-sm leading-6 text-ink-400">
              {t('map.explorerSubtitle')}
            </p>
          </div>

          <div className="relative w-full lg:max-w-[420px]">
            <label htmlFor="location-search" className="sr-only">
              {t('map.searchLocations')}
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.1] bg-ink-900 px-4 py-3 focus-within:border-teal-400/40">
              <Search size={16} className="shrink-0 text-teal-300" />
              <input
                id="location-search"
                type="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={searchOpen}
                aria-controls="location-search-results"
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setSearchOpen(false);
                }}
                placeholder={t('map.searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent text-xs text-ink-100 outline-none placeholder:text-ink-500"
              />
              <span className="shrink-0 text-[10px] text-ink-500">
                {t('map.sitesCount', { count: live.locations.length })}
              </span>
            </div>
            {searchOpen && (
              <>
                <button
                  type="button"
                  aria-label={t('common.closeSearch')}
                  className="fixed inset-0 z-[690] cursor-default"
                  onClick={() => setSearchOpen(false)}
                />
                <div
                  id="location-search-results"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-[710] mt-2 max-h-72 overflow-y-auto rounded-xl border border-white/[0.1] bg-ink-850 shadow-2xl"
                >
                  {matchingLocations.length ? (
                    matchingLocations.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        role="option"
                        aria-selected={selectedId === location.id}
                        onClick={() => handleLocationChoice(location)}
                        className="flex w-full items-start gap-3 border-b border-white/[0.05] px-4 py-3 text-left last:border-b-0 hover:bg-ink-800/80"
                      >
                        <MapPin size={15} className="mt-0.5 shrink-0 text-teal-300" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-medium text-ink-100">
                            {localizedLocationName(location, lang)}
                          </span>
                          <span className="mt-0.5 block truncate text-[9px] text-ink-400">
                            {location.admin} · {location.id} · {location.type}
                          </span>
                        </span>
                        <span className="shrink-0 text-[9px] text-ink-500">
                          {location.dataOrigin === 'live' ? t('common.live') : t('common.demo')}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-center text-[11px] text-ink-400">
                      {t('map.noMatchingLocations')}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 flex max-w-5xl items-start gap-2 text-[10px] leading-relaxed text-ink-500">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-earth-sand" />
          <p>
            {t('map.overlayCaveat')}
          </p>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <MapPanel
              live={live}
              basemap={basemap}
              visibleLayers={visibleLayers}
              activeOverlay={activeOverlay}
              overlayOpacity={overlayOpacity}
              selectedId={selectedId}
              onSelect={onSelectLocation}
            />
            <LayerControl
              visibleLayers={visibleLayers}
              onToggleVectorLayer={onToggleVectorLayer}
              activeOverlay={activeOverlay}
              onSelectOverlay={onSetActiveOverlay}
              overlayOpacity={overlayOpacity}
              onSetOverlayOpacity={onSetOverlayOpacity}
              basemap={basemap}
              onSetBasemap={onSetBasemap}
            />
            <MapLegend heatmapActive={activeOverlay === 'priority'} />

            <div className="absolute bottom-3 right-3 z-[600] flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAnalyticsOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-ink-900/95 px-4 py-2.5 text-xs text-ink-200 shadow-xl transition-colors hover:border-teal-400/40 hover:text-ink-100"
              >
                <PanelLeftOpen size={15} className="text-teal-300" />
                <span>{t('map.monitoringSummary')}</span>
              </button>
              {!selected && (
                <div className="inline-flex items-center gap-1.5 rounded-sm border border-ink-700 bg-ink-900/92 px-2.5 py-1.5 text-[10px] text-ink-400">
                  <PanelRightOpen size={15} className="text-teal-300" />
                  <span>{t('map.selectLocation')}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {rightOpen && selected && (
          <div className="hidden h-full lg:flex">
            <LocationPanel location={selected} live={live} onClose={onCloseLocation} />
          </div>
        )}

        {mobileDrawer === 'right' && (
          <div className="fixed inset-0 z-[1150] flex justify-end lg:hidden">
            <button
              type="button"
              aria-label={t('common.closeLocation')}
              className="flex-1 bg-black/60"
              onClick={() => onSetMobileDrawer(null)}
            />
            <div className="h-full shadow-2xl">
              <LocationPanel
                location={selected}
                live={live}
                onClose={() => onSetMobileDrawer(null)}
              />
            </div>
          </div>
        )}

        {analyticsOpen && (
          <div className="fixed inset-0 z-[1150] flex">
            <div className="h-full shadow-2xl">
              <AnalyticsPanel live={live} onCollapse={() => setAnalyticsOpen(false)} />
            </div>
            <button
              type="button"
              aria-label={t('common.closeSummary')}
              className="flex-1 bg-black/60"
              onClick={() => setAnalyticsOpen(false)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
