import { AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import type {
  AssessmentRequest,
  AssessmentResponse,
  IndicatorContribution,
  IndicatorExplanation,
  AssessmentOutcome,
} from '@/types';
import { postAssessment } from '@/services/api';

const EMPTY_INDICATORS: AssessmentRequest = {
  risk_indicators: { E: null, G: null, P: null, V: null, C: null },
  confidence_indicators: { Q: null, F: null, C: null, S: null },
  monitoring_indicators: { N: null, D: null, M: null },
};

function displayStatus(status: string | null | undefined, fallback: string): string {
  return status ? status.replace(/_/g, ' ') : fallback;
}

function displayScore(score: number | null | undefined, fallback: string): string {
  return score === null || score === undefined ? fallback : `${score.toFixed(1)} / 100`;
}

function displayFraction(value: number | null | undefined, fallback: string): string {
  return value === null || value === undefined ? fallback : `${(value * 100).toFixed(1)}%`;
}

function missingFor(
  explanation: IndicatorExplanation | null | undefined,
  outcome: AssessmentOutcome | null | undefined,
): string[] {
  return explanation?.missing_inputs ?? outcome?.missing_inputs ?? [];
}

function ContributionChart({
  explanation,
  fallback,
}: {
  explanation: IndicatorExplanation | null | undefined;
  fallback: string;
}) {
  const { t } = useI18n();
  const contributions = [...(explanation?.contributions ?? [])]
    .filter((item) => item.contribution_points !== null && item.contribution_points !== undefined)
    .sort((a, b) => (b.contribution_points ?? 0) - (a.contribution_points ?? 0));
  const maxPoints = Math.max(1, ...contributions.map((item) => item.contribution_points ?? 0));
  const details: Record<string, string> = {
    E: t('xai.detail.E'),
    G: t('xai.detail.G'),
    P: t('xai.detail.P'),
    V: t('xai.detail.V'),
    C: t('xai.detail.C'),
  };
  const detailsByName: Record<string, string> = {
    'Data quality': t('xai.detail.quality'),
    'Data freshness': t('xai.detail.freshness'),
    'Data completeness': t('xai.detail.completeness'),
    'Spatial coverage': t('xai.detail.spatial'),
    'Existing risk indicator': t('xai.detail.existingRisk'),
    'Nearby-well evidence': t('xai.detail.nearbyWells'),
    'Monitoring-station gap': t('xai.detail.stationGap'),
    'Missing or outdated data need': t('xai.detail.outdatedData'),
  };

  if (!contributions.length) {
    return <p className="text-[11px] text-ink-400">{fallback}</p>;
  }

  return (
    <div className="space-y-3">
      {contributions.map((item: IndicatorContribution, index) => {
        const key = item.indicator ?? item.name ?? `contribution-${index}`;
        const points = item.contribution_points ?? 0;
        const tooltip = (item.name ? detailsByName[item.name] : undefined)
          ?? (item.indicator ? details[item.indicator] : undefined);
        return (
          <div key={`${key}-${index}`} title={tooltip} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="min-w-0 truncate text-ink-100">{item.name ?? item.indicator ?? '—'}</span>
              <span className="shrink-0 font-mono text-teal-300">{points.toFixed(2)} {t('xai.points')}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-teal-400"
                style={{ width: `${Math.min(100, (Math.max(0, points) / maxPoints) * 100)}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-x-3 text-[9px] text-ink-400">
              <span>{t('xai.value')}: {item.value === null || item.value === undefined ? '—' : item.value.toFixed(3)}</span>
              <span>{t('xai.weight')}: {displayFraction(item.weight, '—')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OutcomeHeading({
  label,
  outcome,
  explanation,
  score,
}: {
  label: string;
  outcome: AssessmentOutcome | null | undefined;
  explanation: IndicatorExplanation | null | undefined;
  score: number | null | undefined;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-ink-400">{label}</p>
        <p className="mt-1 text-xl font-semibold text-earth-sand">
          {displayScore(score, t('xai.notProvided'))}
        </p>
      </div>
      <div className="text-right text-[10px] text-ink-300">
        <p>{t('xai.status')}: {displayStatus(explanation?.status ?? outcome?.status, t('xai.notProvided'))}</p>
        <p className="mt-1">{t('xai.coverage')}: {displayFraction(explanation?.coverage ?? outcome?.coverage, t('xai.notProvided'))}</p>
      </div>
    </div>
  );
}

function MissingList({ items }: { items: string[] }) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <div className="mt-3 border-t border-ink-700 pt-2">
      <p className="mb-1 text-[10px] font-medium text-earth-sand">{t('xai.missingInputs')}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-300">
            <AlertTriangle size={11} className="mt-0.5 shrink-0 text-earth-sand" />
            <span>{item.replace(/_/g, ' ')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AssessmentExplainability({ locationId }: { locationId: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AssessmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAssessment = async () => {
    setLoading(true);
    setError(null);
    const result = await postAssessment(locationId, EMPTY_INDICATORS);
    setLoading(false);
    if (!result.live || !result.data) {
      setError(result.error ?? t('xai.failure'));
      setResponse(null);
      return;
    }
    setResponse(result.data);
  };

  const xai = response?.xai;
  const riskExplanation = xai?.risk_explanation;
  const confidenceExplanation = xai?.confidence_explanation;
  const monitoringExplanation = xai?.monitoring_explanation;
  const riskMissing = missingFor(riskExplanation, response?.risk);
  const confidenceMissing = missingFor(confidenceExplanation, response?.confidence);
  const monitoringMissing = missingFor(monitoringExplanation, response?.monitoring);
  const allMissing = [...new Set([...riskMissing, ...confidenceMissing, ...monitoringMissing])];
  const limitations = xai?.limitations ?? [];

  return (
    <section className="border-b border-ink-700 bg-ink-950/40 px-3 py-3" aria-labelledby="assessment-xai-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 id="assessment-xai-title" className="text-[12px] font-semibold text-earth-sand">
          {t('xai.title')}
        </h4>
        <button
          type="button"
          onClick={() => void loadAssessment()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-sm border border-teal-500/60 bg-teal-900/50 px-2 py-1 text-[10px] text-teal-200 transition-colors hover:bg-teal-800/70 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          {loading ? t('xai.loading') : t('xai.load')}
        </button>
      </div>

      <p className="mb-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-400">
        <Info size={12} className="mt-0.5 shrink-0 text-teal-300" />
        <span>{t('xai.rawInputNotice')}</span>
      </p>

      {error && <p role="alert" className="mb-3 text-[10px] text-risk-moderate">{error}</p>}
      {!response && !loading && !error && (
        <p className="text-[10px] text-ink-400">{t('xai.noData')}</p>
      )}

      {response && (
        <div className="space-y-3">
          {response.assessment_mode === 'simulated' && (
            <p className="rounded-sm border border-earth-sand/40 bg-earth-clay/10 px-2 py-1.5 text-[10px] text-earth-sand">
              {t('xai.simulated')}
            </p>
          )}

          <section className="rounded-sm border border-earth-gold/50 bg-ink-900 p-3">
            <h5 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-earth-sand">{t('xai.why')}</h5>
            <OutcomeHeading
              label={t('xai.score')}
              outcome={response.risk}
              explanation={riskExplanation}
              score={riskExplanation?.score ?? response.risk?.score}
            />
            <p className="mb-2 text-[10px] font-medium text-ink-300">{t('xai.contributions')}</p>
            <ContributionChart
              explanation={riskExplanation}
              fallback={xai ? t('xai.noContributions') : t('xai.responseMissing')}
            />
            <MissingList items={riskMissing} />
          </section>

          <section className="rounded-sm border border-ink-700 bg-ink-900/70 p-3">
            <h5 className="mb-2 text-[11px] font-semibold text-sky-200">{t('xai.confidence')}</h5>
            <OutcomeHeading
              label={t('xai.score')}
              outcome={response.confidence}
              explanation={confidenceExplanation}
              score={confidenceExplanation?.score ?? response.confidence?.score}
            />
            <ContributionChart
              explanation={confidenceExplanation}
              fallback={xai ? t('xai.noContributions') : t('xai.responseMissing')}
            />
            <p className="mt-2 text-[10px] leading-relaxed text-ink-400">{t('xai.confidenceNote')}</p>
            <MissingList items={confidenceMissing} />
          </section>

          <section className="rounded-sm border border-ink-700 bg-ink-900/70 p-3">
            <h5 className="mb-2 text-[11px] font-semibold text-forest-pale">{t('xai.monitoring')}</h5>
            <OutcomeHeading
              label={t('xai.score')}
              outcome={response.monitoring}
              explanation={monitoringExplanation}
              score={monitoringExplanation?.score ?? response.monitoring?.priority_score}
            />
            <ContributionChart
              explanation={monitoringExplanation}
              fallback={xai ? t('xai.noContributions') : t('xai.responseMissing')}
            />
            <p className="mt-2 text-[10px] leading-relaxed text-ink-400">{t('xai.monitoringNote')}</p>
            <MissingList items={monitoringMissing} />
          </section>

          <section className="rounded-sm border border-earth-sand/40 bg-earth-clay/10 p-3">
            <h5 className="mb-2 text-[11px] font-semibold text-earth-sand">{t('xai.dataGaps')}</h5>
            {allMissing.length > 0 && <MissingList items={allMissing} />}
            {limitations.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] font-medium text-ink-200">{t('xai.limitations')}</p>
                {limitations.map((item) => <p key={item} className="text-[10px] leading-relaxed text-ink-300">{item}</p>)}
              </div>
            )}
            {!xai && <p className="text-[10px] leading-relaxed text-ink-300">{t('xai.responseMissing')}</p>}
            {!allMissing.length && !limitations.length && xai && (
              <p className="text-[10px] text-ink-400">{t('xai.notProvided')}</p>
            )}
          </section>

          <details className="rounded-sm border border-ink-700 bg-ink-900/60 p-3">
            <summary className="cursor-pointer text-[11px] font-medium text-ink-200">{t('xai.howTo')}</summary>
            <p className="mt-2 text-[10px] leading-relaxed text-ink-400">{t('xai.weightedMethod')}</p>
            {xai?.disclaimer && <p className="mt-2 text-[10px] leading-relaxed text-ink-300">{xai.disclaimer}</p>}
            {response.notice && <p className="mt-2 text-[10px] leading-relaxed text-earth-sand">{response.notice}</p>}
          </details>
        </div>
      )}
    </section>
  );
}
