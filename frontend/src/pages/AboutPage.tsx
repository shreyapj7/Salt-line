import { Compass, Cpu, Database, Waves } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { Notice, PageCard, PageHeader } from '@/components/PagePrimitives';

const technologies = [
  'React 18',
  'TypeScript',
  'Vite',
  'Tailwind CSS',
  'React Leaflet / Leaflet',
  'Recharts',
  'Lucide React',
];

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-ink-950">
      <div className="mx-auto max-w-[1200px] space-y-5 p-4 sm:p-6 xl:p-8">
        <PageHeader
          eyebrow={t('about.eyebrow')}
          title={t('page.about')}
          subtitle={t('about.subtitle')}
        />

        <Notice tone="warning">
          {t('about.notice')}
        </Notice>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PageCard title={t('about.overview')} subtitle={t('about.overviewSubtitle')} icon={Waves}>
            <div className="space-y-3 p-4 text-[11px] leading-relaxed text-ink-300">
              <p>{t('about.overview1')}</p>
              <p>{t('about.overview2')}</p>
            </div>
          </PageCard>

          <PageCard title={t('about.technology')} subtitle={t('about.technologySubtitle')} icon={Cpu}>
            <div className="flex flex-wrap gap-2 p-4">
              {technologies.map((technology) => (
                <span
                  key={technology}
                  className="rounded-sm border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-[10px] text-ink-300"
                >
                  {technology}
                </span>
              ))}
            </div>
          </PageCard>

          <PageCard title={t('about.dataLimits')} subtitle={t('about.dataLimitsSubtitle')} icon={Database}>
            <ul className="space-y-2 p-4 text-[10px] leading-relaxed text-ink-400">
              <li>· {t('about.liveDemo')}</li>
              <li>· {t('about.rawAdc')}</li>
              <li>· {t('about.ndmi')}</li>
              <li>· {t('about.priority')}</li>
              <li>· {t('about.community')}</li>
            </ul>
          </PageCard>

          <PageCard title={t('about.explore')} subtitle={t('about.exploreSubtitle')} icon={Compass}>
            <div className="p-4">
              <p className="text-[11px] leading-relaxed text-ink-300">
                {t('about.exploreDescription')}
              </p>
            </div>
          </PageCard>
        </div>
      </div>
    </main>
  );
}
