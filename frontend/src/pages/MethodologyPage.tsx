import { AlertTriangle, BookOpen, CheckCircle2, Database, MapPinned, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import { Notice, PageCard, PageHeader } from '@/components/PagePrimitives';

const workflow = [
  {
    step: '01',
    titleKey: 'method.step1Title',
    detailKey: 'method.step1Detail',
    icon: Database,
  },
  {
    step: '02',
    titleKey: 'method.step2Title',
    detailKey: 'method.step2Detail',
    icon: ShieldCheck,
  },
  {
    step: '03',
    titleKey: 'method.step3Title',
    detailKey: 'method.step3Detail',
    icon: BookOpen,
  },
  {
    step: '04',
    titleKey: 'method.step4Title',
    detailKey: 'method.step4Detail',
    icon: MapPinned,
  },
];

export default function MethodologyPage() {
  const { t } = useI18n();

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-ink-950">
      <div className="mx-auto max-w-[1400px] space-y-5 p-4 sm:p-6 xl:p-8">
        <PageHeader
          eyebrow={t('method.eyebrow')}
          title={t('page.helpMethodology')}
          subtitle={t('method.subtitle')}
        />

        <Notice tone="warning">
          {t('method.notice')}
        </Notice>

        <PageCard
          title={t('method.workflow')}
          subtitle={t('method.workflowSubtitle')}
          icon={BookOpen}
        >
          <div className="grid grid-cols-1 divide-y divide-ink-800 md:grid-cols-2 md:divide-y-0">
            {workflow.map(({ step, titleKey, detailKey, icon: Icon }) => (
              <article key={step} className="flex gap-4 border-ink-800 p-4 md:border-b md:even:border-l">
                <span className="font-mono text-[11px] text-teal-300">{step}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-forest-bright" />
                    <h2 className="text-[12px] font-semibold text-ink-100">{t(titleKey)}</h2>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-ink-400">{t(detailKey)}</p>
                </div>
              </article>
            ))}
          </div>
        </PageCard>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PageCard title={t('method.indicatorInterpretation')} subtitle={t('method.sourceValuesOnly')} icon={MapPinned}>
            <div className="divide-y divide-ink-800">
              <MethodRow
                title={t('method.groundwaterHead')}
                detail={t('method.groundwaterHeadDetail')}
              />
              <MethodRow
                title={t('method.rainfallDeficit')}
                detail={t('method.rainfallDetail')}
              />
              <MethodRow
                title={t('method.ndmi')}
                detail={t('method.ndmiDetail')}
                badge={t('method.simulatedWhereIndicated')}
              />
              <MethodRow
                title={t('method.riskLabels')}
                detail={t('method.riskDetail')}
              />
            </div>
          </PageCard>

          <PageCard title={t('method.priorityCoverageConfidence')} subtitle={t('method.distinctIndicators')} icon={ShieldCheck}>
            <div className="divide-y divide-ink-800">
              <MethodRow
                title={t('method.priority')}
                detail={t('method.priorityDetail')}
                badge={t('method.provisional')}
              />
              <MethodRow
                title={t('method.coverage')}
                detail={t('method.coverageDetail')}
              />
              <MethodRow
                title={t('method.confidence')}
                detail={t('method.confidenceDetail')}
              />
              <MethodRow
                title={t('method.communityObservations')}
                detail={t('method.communityDetail')}
              />
            </div>
          </PageCard>
        </div>

        <PageCard title={t('sci.title')} subtitle={t('sci.intro')} icon={AlertTriangle}>
          <ul className="space-y-2 p-4 text-[11px] leading-relaxed text-ink-300">
            <li>{t('sci.p1')}</li>
            <li>{t('sci.p2')}</li>
            <li>{t('sci.p3')}</li>
            <li>{t('sci.p4')}</li>
            <li>{t('sci.p5')}</li>
          </ul>
        </PageCard>

        <div className="flex items-center gap-2 text-[10px] text-ink-500">
          <CheckCircle2 size={13} className="text-forest-bright" />
          {t('method.missingRemainMissing')}
        </div>
      </div>
    </main>
  );
}

function MethodRow({
  title,
  detail,
  badge,
}: {
  title: string;
  detail: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div>
        <h3 className="text-[11px] font-medium text-ink-200">{title}</h3>
        <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-ink-500">{detail}</p>
      </div>
      {badge && (
        <span className="shrink-0 rounded-sm border border-earth-clay/50 bg-earth-clay/10 px-2 py-1 text-[9px] text-earth-sand">
          {badge}
        </span>
      )}
    </div>
  );
}
