import {
  Waves,
  RefreshCw,
  Globe,
  Settings,
  Info,
  Menu,
  Home,
  X,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { useI18n, LANGUAGES } from '@/i18n/I18nContext';
import type { LiveState } from '@/hooks/useLiveData';
import { fmtRefreshTime } from '@/lib/format';
import { API_BASE } from '@/services/api';

interface Props {
  live: LiveState;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  autoRefreshMs: number;
  onSetAutoRefreshMs: (ms: number) => void;
  overlayOpacity: number;
  onSetOverlayOpacity: (v: number) => void;
  onBackToHome: () => void;
}

export default function TopNav({
  live,
  sidebarOpen,
  onToggleSidebar,
  autoRefreshMs,
  onSetAutoRefreshMs,
  overlayOpacity,
  onSetOverlayOpacity,
  onBackToHome,
}: Props) {
  const { t, lang, setLang } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const liveCount = [live.locationsLive, live.sensorsLive, live.reportsLive].filter(Boolean).length;
  const statusMode = !live.checked
    ? 'checking'
    : liveCount === 3 && !live.errorMessage
      ? 'full'
      : liveCount > 0
        ? 'partial'
        : 'demo';

  const statusBadge =
    statusMode === 'checking'
      ? {
          dot: 'bg-earth-sand animate-pulse',
          label: t('nav.statusChecking'),
        }
      : statusMode === 'full'
      ? {
          dot: 'bg-forest-base',
          label: t('nav.connected'),
        }
      : statusMode === 'partial'
        ? {
            dot: 'bg-earth-sand',
            label: t('nav.partial'),
          }
        : {
            dot: 'bg-ink-500',
            label: t('nav.offline'),
          };

  return (
    <>
      <header className="relative z-[1100] flex h-16 shrink-0 items-center gap-2 border-b border-earth-gold/55 bg-ink-950 px-3 text-xs sm:gap-4 sm:px-5 lg:px-7">
        {/* Identity */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? t('nav.closeNavigation') : t('nav.openNavigation')}
          aria-expanded={sidebarOpen}
          aria-controls="app-navigation"
          className="shrink-0 rounded-lg border border-earth-gold/65 bg-ink-900 p-2 text-ink-300 transition-colors hover:border-teal-400 hover:text-teal-300"
        >
          <Menu size={18} />
        </button>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-teal-400/35 bg-teal-850 text-teal-300">
            <Waves size={18} />
          </div>
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-[0.13em] text-ink-100">
                {t('app.name')}
              </span>
              <span className="hidden whitespace-nowrap rounded-full border border-earth-gold/55 bg-ink-800 px-2 py-0.5 text-[10px] font-medium text-ink-300 sm:inline-block">
                {t('app.pilot')}
              </span>
            </div>
            <div className="hidden truncate text-[10px] text-ink-400 sm:block">
              {t('app.tagline')}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 rounded-lg border border-earth-gold/60 bg-ink-900 px-2.5 py-2 text-ink-300 transition-colors hover:border-teal-400 hover:text-teal-300 sm:px-3"
          aria-label={t('nav.returnHome')}
          title={t('nav.publicHome')}
        >
          <Home size={14} />
          <span className="hidden text-[11px] sm:inline">{t('nav.publicSite')}</span>
        </button>

        {/* Connection status */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setStatusOpen((open) => !open)}
            aria-expanded={statusOpen}
            aria-controls="data-source-details"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-[11px] text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
            title={t('nav.connection')}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusBadge.dot} ${live.refreshing && statusMode !== 'checking' ? 'animate-pulse' : ''}`} />
            <span>{statusBadge.label}</span>
          </button>
          {statusOpen && (
            <>
              <button
                type="button"
                aria-label={t('common.close')}
                className="fixed inset-0 z-[1200] cursor-default"
                onClick={() => setStatusOpen(false)}
              />
              <div
                id="data-source-details"
                role="status"
                className="absolute right-0 top-full z-[1201] mt-2 w-[min(360px,calc(100vw-24px))] rounded-xl border border-ink-700 bg-ink-850 p-4 shadow-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink-100">{t('nav.connection')}</p>
                  <span className={`h-2 w-2 rounded-full ${statusBadge.dot}`} />
                </div>
                <p className="mt-1 text-xs text-ink-300">{statusBadge.label}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-400">
                  {statusMode === 'full'
                    ? t('nav.sourcesResponding')
                    : statusMode === 'partial'
                      ? t('nav.partialDetails')
                      : statusMode === 'demo'
                        ? t('nav.offlineDetails')
                        : t('nav.checkingSources')}
                </p>
                {live.errorMessage && (
                  <p className="mt-3 rounded-lg border border-risk-high/20 bg-risk-high/5 px-3 py-2 text-[11px] leading-relaxed text-ink-300">
                    {t('common.errorDetail', { detail: live.errorMessage })}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actual last refresh timestamp */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-earth-gold/50 bg-ink-900 text-ink-300"
          title={t('nav.freshness')}
        >
          <Clock size={11} className="text-ink-400" />
          <span className="text-[10px] text-ink-400">{t('nav.freshness')}:</span>
          <span className="font-mono text-[11px] text-ink-100 tabular-nums">
            {live.refreshing
              ? t('nav.refreshing')
              : fmtRefreshTime(live.lastSuccessAt ?? live.lastRefreshAt, lang)}
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={live.retry}
          disabled={live.refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-earth-gold/65 bg-ink-900 px-3 py-2 text-ink-200 transition-colors hover:border-forest-light hover:bg-ink-800 disabled:opacity-60"
          title={t('common.tryAgain')}
          aria-label={t('common.tryAgain')}
        >
          <RefreshCw size={12} className={live.refreshing ? 'animate-spin text-forest-bright' : ''} />
          <span className="hidden xl:inline text-[11px]">{t('common.tryAgain')}</span>
        </button>

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => {
              setLangOpen((o) => !o);
              setSettingsOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-earth-gold/65 bg-ink-900 px-3 py-2 text-ink-200 transition-colors hover:border-teal-400 hover:text-teal-300"
            title={t('nav.language')}
          >
            <Globe size={12} className="text-teal-300" />
            <span className="text-[11px]">{LANGUAGES.find((l) => l.code === lang)?.label}</span>
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-[1200]" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-full z-[1201] mt-2 min-w-[160px] rounded-xl border border-ink-700 bg-ink-850 p-1 shadow-lg">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setLangOpen(false);
                    }}
                    className={`flex items-center justify-between w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                      l.code === lang
                        ? 'rounded-lg bg-teal-850 text-teal-300 font-medium'
                        : 'rounded-lg text-ink-200 hover:bg-ink-800'
                    }`}
                  >
                    <span>{l.label}</span>
                    <span className="font-mono text-[10px] text-ink-400">{l.short}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Settings popover */}
        <div className="relative">
          <button
            onClick={() => {
              setSettingsOpen((o) => !o);
              setLangOpen(false);
            }}
            className={`p-1.5 rounded-sm border transition-colors ${
              settingsOpen
                ? 'border-teal-400/40 bg-teal-850/60 text-teal-300'
                : 'border-ink-700 bg-ink-850 text-ink-300 hover:text-teal-300 hover:border-teal-400/50'
            }`}
            title={t('nav.settings')}
            aria-label={t('nav.settings')}
          >
            <Settings size={13} />
          </button>
          {settingsOpen && (
            <>
              <div className="fixed inset-0 z-[1200]" onClick={() => setSettingsOpen(false)} />
              <div className="absolute right-0 top-full z-[1201] mt-2 w-[280px] rounded-xl border border-ink-700 bg-ink-850 p-4 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-ink-700 pb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-200">
                    {t('nav.settings')}
                  </span>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    className="text-ink-400 hover:text-ink-100"
                    aria-label={t('common.close')}
                  >
                    <X size={12} />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">
                    {t('nav.autoRefresh')}
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: t('nav.off'), ms: 0 },
                      { label: '30s', ms: 30000 },
                      { label: '60s', ms: 60000 },
                    ].map((opt) => (
                      <button
                        key={opt.ms}
                        onClick={() => onSetAutoRefreshMs(opt.ms)}
                        className={`py-1 text-[10px] rounded-sm border transition-colors ${
                          autoRefreshMs === opt.ms
                                ? 'border-teal-400 bg-teal-850 text-teal-300'
                                : 'border-ink-700 text-ink-300 hover:border-teal-400/60 hover:text-teal-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-ink-400 mb-1">
                    <span className="uppercase tracking-wide">{t('nav.overlayOpacity')}</span>
                    <span className="font-mono text-ink-200">{Math.round(overlayOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.15}
                    max={0.75}
                    step={0.05}
                    value={overlayOpacity}
                    onChange={(e) => onSetOverlayOpacity(Number(e.target.value))}
                    className="w-full accent-teal-400"
                  />
                </div>

                <div className="pt-1 border-t border-ink-700 text-[10px]">
                  <span className="text-ink-400">{t('nav.apiBase')}: </span>
                  <span className="font-mono text-ink-200 break-all">
                    {API_BASE || t('nav.sameOrigin')}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Scientific methodology & integrity modal trigger */}
        <button
          onClick={() => setMethodologyOpen(true)}
          className="p-1.5 rounded-sm border border-ink-600 bg-ink-850 text-ink-300 hover:text-teal-300 hover:border-teal-400 transition-colors"
          title={t('nav.methodology')}
          aria-label={t('nav.methodology')}
        >
          <Info size={13} />
        </button>
      </header>

      {methodologyOpen && (
        <div
          className="fixed inset-0 z-[1300] bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setMethodologyOpen(false)}
        >
          <div
            className="max-w-lg w-full bg-ink-900 border border-ink-600 rounded-sm shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-700 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-forest-bright" />
                <h2 className="text-[13px] font-semibold text-ink-100">{t('sci.title')}</h2>
              </div>
              <button
                onClick={() => setMethodologyOpen(false)}
                className="p-1 text-ink-400 hover:text-ink-100"
                aria-label={t('common.close')}
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[12px] text-ink-200 leading-relaxed">{t('sci.intro')}</p>
            <ul className="space-y-1.5 text-[11px] text-ink-300 leading-relaxed bg-ink-850 border border-ink-700 p-3 rounded-sm">
              <li>{t('sci.p1')}</li>
              <li>{t('sci.p2')}</li>
              <li>{t('sci.p3')}</li>
              <li>{t('sci.p4')}</li>
              <li>{t('sci.p5')}</li>
            </ul>
            <div className="flex justify-end">
              <button
                onClick={() => setMethodologyOpen(false)}
                className="px-3 py-1.5 rounded-sm border border-teal-500 bg-teal-850 text-teal-300 text-[11px] hover:bg-teal-700 transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
