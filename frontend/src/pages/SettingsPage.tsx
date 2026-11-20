import { Languages, Map, RefreshCw } from 'lucide-react';
import { useI18n, LANGUAGES } from '@/i18n/I18nContext';
import { Notice, PageCard, PageHeader } from '@/components/PagePrimitives';

const refreshOptions = [
  { labelKey: 'settings.refreshOff', value: 0 },
  { labelKey: 'settings.refresh30', value: 30000 },
  { labelKey: 'settings.refresh60', value: 60000 },
] as const;

interface SettingsPageProps {
  autoRefreshMs: number;
  onSetAutoRefreshMs: (interval: number) => void;
  overlayOpacity: number;
  onSetOverlayOpacity: (opacity: number) => void;
}

export default function SettingsPage({
  autoRefreshMs,
  onSetAutoRefreshMs,
  overlayOpacity,
  onSetOverlayOpacity,
}: SettingsPageProps) {
  const { lang, setLang, t } = useI18n();

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-ink-950">
      <div className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6 xl:p-8">
        <PageHeader
          eyebrow={t('settings.eyebrow')}
          title={t('page.settings')}
          subtitle={t('settings.subtitle')}
        />
        <Notice tone="info">
          {t('settings.notice')}
        </Notice>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PageCard title={t('settings.refresh')} subtitle={t('settings.refreshSubtitle')} icon={RefreshCw}>
            <div className="space-y-3 p-4">
              <p className="text-[11px] text-ink-300">{t('settings.refreshInterval')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {refreshOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={autoRefreshMs === option.value}
                    onClick={() => onSetAutoRefreshMs(option.value)}
                    className={`rounded-sm border px-3 py-2 text-[10px] transition-colors ${
                      autoRefreshMs === option.value
                        ? 'border-teal-500 bg-teal-850 text-teal-300'
                        : 'border-ink-700 bg-ink-950 text-ink-300 hover:border-ink-500'
                    }`}
                  >
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
              <p className="text-[9px] leading-relaxed text-ink-500">
                {t('settings.refreshNote')}
              </p>
            </div>
          </PageCard>

          <PageCard title={t('settings.language')} subtitle={t('settings.languageSubtitle')} icon={Languages}>
            <div className="space-y-3 p-4">
              <label htmlFor="application-language" className="block text-[11px] text-ink-300">
                {t('settings.interfaceLanguage')}
              </label>
              <select
                id="application-language"
                value={lang}
                onChange={(event) => {
                  const selectedLanguage = LANGUAGES.find((language) => language.code === event.target.value);
                  if (selectedLanguage) setLang(selectedLanguage.code);
                }}
                className="w-full max-w-sm rounded-sm border border-ink-700 bg-ink-950 px-3 py-2 text-[11px] text-ink-100"
              >
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>{language.label}</option>
                ))}
              </select>
            </div>
          </PageCard>

          <PageCard title={t('settings.mapDisplay')} subtitle={t('settings.mapSubtitle')} icon={Map}>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <label htmlFor="overlay-opacity" className="text-ink-300">{t('settings.overlayOpacity')}</label>
                <span className="font-mono text-teal-300">{Math.round(overlayOpacity * 100)}%</span>
              </div>
              <input
                id="overlay-opacity"
                type="range"
                min={0.15}
                max={0.75}
                step={0.05}
                value={overlayOpacity}
                onChange={(event) => onSetOverlayOpacity(Number(event.target.value))}
                className="w-full accent-forest-bright"
              />
              <p className="text-[9px] text-ink-500">
                {t('settings.overlayNote')}
              </p>
            </div>
          </PageCard>
        </div>
      </div>
    </main>
  );
}
