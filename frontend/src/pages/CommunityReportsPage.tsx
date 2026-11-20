import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FileText, MapPin, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';
import type { LiveState } from '@/hooks/useLiveData';
import type { CommunityReport, MonitoringLocation } from '@/types';
import { postCommunityReport } from '@/services/api';
import {
  EmptyState,
  KpiCard,
  Notice,
  PageCard,
  PageHeader,
  SourceLabel,
  StatusBadge,
} from '@/components/PagePrimitives';

type VerificationFilter = 'all' | CommunityReport['verification'];

const complaintCategories = [
  { value: 'Salty-tasting well water', labelKey: 'complaints.category.salty' },
  { value: 'Reduced groundwater level', labelKey: 'complaints.category.level' },
  { value: 'Dried-up well', labelKey: 'complaints.category.dry' },
  { value: 'Unusual water colour or smell', labelKey: 'complaints.category.appearance' },
  { value: 'Suspected contamination', labelKey: 'complaints.category.contamination' },
  { value: 'Other', labelKey: 'complaints.category.other' },
];

interface CommunityReportsPageProps {
  live: LiveState;
  onOpenLocation: (location: MonitoringLocation) => void;
}

function verificationKind(
  status: CommunityReport['verification'],
): 'verified' | 'pending' | 'alert' {
  if (status === 'verified') return 'verified';
  return status === 'rejected' ? 'alert' : 'pending';
}

export default function CommunityReportsPage({ live, onOpenLocation }: CommunityReportsPageProps) {
  const { t, lang } = useI18n();
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [submittedFrom, setSubmittedFrom] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formCategory, setFormCategory] = useState('Salty-tasting well water');
  const [formLocationId, setFormLocationId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const location = live.locations.find((item) => item.id === formLocationId);
    if (!location) {
      setFormError(t('complaints.submitLocationError'));
      return;
    }
    if (formDescription.trim().length < 5) {
      setFormError(t('complaints.submitDescriptionError'));
      return;
    }

    setFormBusy(true);
    setFormError(null);
    setFormSuccess(null);
    const result = await postCommunityReport({
      reporterId: formContact.trim() || 'anonymous',
      locationId: location.id,
      latitude: location.lat,
      longitude: location.lng,
      observation: `Category: ${formCategory}\nDescription: ${formDescription.trim()}`,
    });
    setFormBusy(false);

    if (!result.live) {
      setFormError(`${t('complaints.submitError')}${result.error ? ` ${result.error}` : ''}`);
      return;
    }

    const reportId = submittedReportId(result.data);
    setFormSuccess(
      reportId
        ? t('complaints.successWithId', { id: reportId })
        : t('complaints.success'),
    );
    setFormDescription('');
    setFormContact('');
    setFormOpen(false);
    live.retry();
  };

  const categories = [...new Set(live.reports.map((report) => report.category))].sort();
  const filteredReports = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase();
    return live.reports.filter((report) => {
      if (verificationFilter !== 'all' && report.verification !== verificationFilter) return false;
      if (categoryFilter !== 'all' && report.category !== categoryFilter) return false;
      const submittedDate = report.submittedAt.slice(0, 10);
      if (submittedFrom && (!submittedDate || submittedDate < submittedFrom)) return false;
      if (submittedTo && (!submittedDate || submittedDate > submittedTo)) return false;
      if (
        searchTerm &&
        ![
          report.id,
          report.locationName,
          report.category,
          report.details,
          report.submittedBy ?? '',
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(searchTerm)
      ) {
        return false;
      }
      return true;
    });
  }, [live.reports, verificationFilter, categoryFilter, query, submittedFrom, submittedTo]);

  const selectedReport = live.reports.find((report) => report.id === selectedReportId) ?? null;
  const selectedLocation = selectedReport
    ? (selectedReport.locationId
        ? live.locations.find((location) => location.id === selectedReport.locationId)
        : undefined) ??
      live.locations.find(
        (location) => location.name.toLowerCase() === selectedReport.locationName.toLowerCase(),
      )
    : undefined;

  const verifiedCount = live.reports.filter((report) => report.verification === 'verified').length;
  const unverifiedCount = live.reports.filter((report) => report.verification === 'unverified').length;
  const rejectedCount = live.reports.filter((report) => report.verification === 'rejected').length;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-ink-950">
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 xl:p-8">
        <PageHeader
          eyebrow={t('complaints.eyebrow')}
          title={t('page.publicComplaints')}
          subtitle={t('complaints.subtitle')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SourceLabel live={live.reportsLive} />
              <button type="button" onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-forest-base px-4 py-2.5 text-xs font-semibold text-white hover:bg-forest-bright">
                <Plus size={14} /> {t('complaints.button')}
              </button>
            </div>
          }
        />

        <Notice tone="info">
          {t('complaints.notice')}
        </Notice>
        {formSuccess && <Notice tone="info">{formSuccess}</Notice>}

        <section aria-label={t('complaints.metrics')} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={FileText} label={t('complaints.total')} value={live.reports.length} detail={t('complaints.reportsDataset')} />
          <KpiCard icon={ShieldCheck} label={t('complaints.verified')} value={verifiedCount} detail={t('complaints.verifiedExisting')} accent="text-forest-bright" />
          <KpiCard icon={FileText} label={t('complaints.pending')} value={unverifiedCount} detail={t('complaints.unverified')} accent="text-earth-sand" />
          <KpiCard icon={FileText} label={t('complaints.rejected')} value={rejectedCount} detail={t('complaints.rejectedExisting')} accent="text-risk-high" />
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
          <PageCard
            title={t('complaints.register')}
            subtitle={t('complaints.count', { shown: filteredReports.length, total: live.reports.length })}
            icon={FileText}
          >
            <div className="grid grid-cols-1 gap-2 border-b border-ink-800 bg-ink-950/40 p-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="text-[9px] text-ink-500">
                {t('common.search')}
                <span className="mt-1 flex items-center gap-2 rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5">
                  <Search size={12} className="text-teal-300" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('complaints.searchPlaceholder')}
                    className="min-w-0 flex-1 bg-transparent text-[10px] text-ink-200 outline-none placeholder:text-ink-600"
                  />
                </span>
              </label>
              <label className="text-[9px] text-ink-500">
                {t('complaints.verification')}
                <select
                  value={verificationFilter}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === 'all' || value === 'verified' || value === 'unverified' || value === 'rejected') {
                      setVerificationFilter(value);
                    }
                  }}
                  className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200"
                >
                  <option value="all">{t('complaints.allStatuses')}</option>
                  <option value="unverified">{t('complaints.pending')}</option>
                  <option value="verified">{t('community.ver.verified')}</option>
                  <option value="rejected">{t('community.ver.rejected')}</option>
                  <option disabled>{t('complaints.underInspectionUnsupported')}</option>
                  <option disabled>{t('complaints.resolvedUnsupported')}</option>
                </select>
              </label>
              <label className="text-[9px] text-ink-500">
                {t('complaints.categoryFilter')}
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200"
                >
                  <option value="all">{t('complaints.allCategories')}</option>
                  {categories.map((category) => <option key={category} value={category}>{reportCategoryLabel(category, t)}</option>)}
                </select>
              </label>
              <label className="text-[9px] text-ink-500">
                {t('common.from')}
                <input
                  type="date"
                  value={submittedFrom}
                  onChange={(event) => setSubmittedFrom(event.target.value)}
                  className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200"
                />
              </label>
              <label className="text-[9px] text-ink-500">
                {t('common.to')}
                <input
                  type="date"
                  value={submittedTo}
                  onChange={(event) => setSubmittedTo(event.target.value)}
                  className="mt-1 block w-full rounded-sm border border-ink-700 bg-ink-900 px-2 py-1.5 text-[10px] text-ink-200"
                />
              </label>
            </div>

            {filteredReports.length ? (
              <div className="max-h-[650px] overflow-auto">
                <table className="w-full min-w-[700px] text-left text-[10px]">
                  <thead className="sticky top-0 z-10 bg-ink-850 text-ink-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t('complaints.reportColumn')}</th>
                      <th className="px-3 py-2 font-medium">{t('complaints.locationColumn')}</th>
                      <th className="px-3 py-2 font-medium">{t('complaints.categoryColumn')}</th>
                      <th className="px-3 py-2 font-medium">{t('complaints.submittedColumn')}</th>
                      <th className="px-3 py-2 font-medium">{t('complaints.statusColumn')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-800">
                    {filteredReports.map((report) => (
                      <tr
                        key={report.id}
                        className={`cursor-pointer transition-colors ${
                          selectedReportId === report.id ? 'bg-forest-deep/30' : 'hover:bg-ink-850/70'
                        }`}
                        onClick={() => setSelectedReportId(report.id)}
                      >
                        <td className="px-3 py-3 font-mono text-ink-300">{report.id}</td>
                        <td className="px-3 py-3 font-medium text-ink-100">{report.locationName}</td>
                        <td className="px-3 py-3 text-ink-300">
                          {report.categoryKey ? t(report.categoryKey) : reportCategoryLabel(report.category, t)}
                        </td>
                        <td className="px-3 py-3 font-mono text-ink-400">{formatSubmittedAt(report.submittedAt, lang, t)}</td>
                        <td className="px-3 py-3">
                          <StatusBadge
                            label={t(`community.ver.${report.verification}`)}
                            kind={verificationKind(report.verification)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={t('complaints.noMatches')}
                detail={t('complaints.noMatchesDetail')}
              />
            )}
          </PageCard>

          <PageCard
            title={t('complaints.details')}
            subtitle={t('complaints.detailsSubtitle')}
            icon={MapPin}
            className="self-start"
          >
            {selectedReport ? (
              <div className="space-y-4 p-4">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[13px] font-semibold text-ink-100">{selectedReport.locationName}</h3>
                    <StatusBadge
                      label={t(`community.ver.${selectedReport.verification}`)}
                      kind={verificationKind(selectedReport.verification)}
                    />
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-ink-500">{selectedReport.id}</p>
                </div>
                <DetailRow label={t('complaints.observationType')} value={selectedReport.categoryKey ? t(selectedReport.categoryKey) : reportCategoryLabel(selectedReport.category, t)} />
                <DetailRow label={t('complaints.submitted')} value={formatSubmittedAt(selectedReport.submittedAt, lang, t)} />
                <DetailRow label={t('complaints.reporter')} value={selectedReport.submittedBy ?? t('common.notReported')} />
                <DetailRow label={t('complaints.assignedOfficer')} value={t('complaints.notTracked')} />
                <DetailRow label={t('complaints.inspection')} value={t('complaints.notTracked')} />
                <DetailRow label={t('complaints.actionTaken')} value={t('complaints.notTracked')} />
                <DetailRow label={t('complaints.resolution')} value={t('complaints.notTracked')} />
                <div>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-ink-500">{t('complaints.observationDetails')}</p>
                  <p className="rounded-sm border border-ink-700 bg-ink-950/60 p-3 text-[11px] leading-relaxed text-ink-200">
                    {selectedReport.detailsKey ? t(selectedReport.detailsKey) : selectedReport.details}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-ink-800 pt-3">
                  <span className="text-[9px] uppercase tracking-wide text-ink-500">{t('complaints.provenance')}</span>
                  <SourceLabel
                    live={live.reportsLive && selectedReport.dataOrigin === 'live'}
                    simulated={selectedReport.dataOrigin === 'demo' || !live.reportsLive}
                  />
                </div>
                {selectedLocation && (
                  <button
                    type="button"
                    onClick={() => onOpenLocation(selectedLocation)}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-forest-light/50 bg-forest-deep/30 px-3 py-2 text-[10px] text-forest-pale hover:bg-forest-deep/60"
                  >
                    <MapPin size={12} /> {t('complaints.viewMap')}
                  </button>
                )}
              </div>
            ) : (
              <EmptyState
                title={t('complaints.selectReport')}
                detail={t('complaints.selectReportDetail')}
              />
            )}
          </PageCard>
        </div>
      </div>
      {formOpen && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-ink-100/35 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="complaint-form-title"
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border border-earth-gold/60 bg-ink-900 p-5 shadow-[0_24px_70px_rgba(41,45,39,0.24)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-earth-clay">{t('complaints.formEyebrow')}</p>
                <h2 id="complaint-form-title" className="mt-1 text-xl font-semibold text-ink-100">{t('complaints.formTitle')}</h2>
                <p className="mt-2 text-xs leading-5 text-ink-400">{t('complaints.formIntro')}</p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} aria-label={t('nav.closeReportForm')} className="rounded-md p-2 text-ink-400 hover:bg-ink-800 hover:text-ink-100">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div role="alert" className="mt-4 rounded-md border border-risk-high/25 bg-risk-high/10 px-3 py-2 text-xs text-risk-high">
                {formError}
              </div>
            )}

            <form onSubmit={submitReport} className="mt-5 space-y-4">
              <label className="block text-xs font-medium text-ink-300">
                {t('complaints.categoryField')}
                <select
                  required
                  value={formCategory}
                  onChange={(event) => setFormCategory(event.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-earth-gold bg-ink-950 px-3 py-2.5 text-sm text-ink-100"
                >
                  {complaintCategories.map((category) => <option key={category.value} value={category.value}>{t(category.labelKey)}</option>)}
                </select>
              </label>

              <label className="block text-xs font-medium text-ink-300">
                {t('complaints.locationField')}
                <select
                  required
                  value={formLocationId}
                  onChange={(event) => setFormLocationId(event.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-earth-gold bg-ink-950 px-3 py-2.5 text-sm text-ink-100"
                >
                  <option value="">{t('complaints.selectLocation')}</option>
                  {live.locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.name} · {location.admin}</option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-medium text-ink-300">
                {t('complaints.descriptionField')}
                <textarea
                  required
                  minLength={5}
                  maxLength={1000}
                  rows={4}
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  placeholder={t('complaints.descriptionPlaceholder')}
                  className="mt-1.5 block w-full resize-y rounded-md border border-earth-gold bg-ink-950 px-3 py-2.5 text-sm leading-6 text-ink-100 placeholder:text-ink-500"
                />
                <span className="mt-1 block text-right text-[10px] text-ink-500">{formDescription.length}/1000</span>
              </label>

              <label className="block text-xs font-medium text-ink-300">
                {t('complaints.contactField')}
                <input
                  maxLength={100}
                  value={formContact}
                  onChange={(event) => setFormContact(event.target.value)}
                  placeholder={t('complaints.contactPlaceholder')}
                  className="mt-1.5 block w-full rounded-md border border-earth-gold bg-ink-950 px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-500"
                />
                <span className="mt-1 block text-[10px] leading-4 text-ink-500">{t('complaints.contactNote')}</span>
              </label>

              <div className="rounded-md border border-earth-gold/60 bg-ink-950/70 px-3 py-3">
                <p className="text-xs font-medium text-ink-300">{t('complaints.photo')}</p>
                <p className="mt-1 text-[11px] leading-5 text-ink-500">{t('complaints.photoUnsupported')}</p>
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-earth-gold/45 pt-4 sm:flex-row">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-md border border-earth-gold px-4 py-2.5 text-xs font-semibold text-ink-300 hover:bg-ink-800">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={formBusy || live.locations.length === 0} className="rounded-md bg-forest-base px-4 py-2.5 text-xs font-semibold text-white hover:bg-forest-bright disabled:cursor-not-allowed disabled:opacity-60">
                  {formBusy ? t('common.submitting') : t('complaints.submitForVerification')}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function reportCategoryLabel(category: string, t: (key: string) => string): string {
  const knownCategory = complaintCategories.find((item) => item.value === category);
  return knownCategory ? t(knownCategory.labelKey) : category;
}

function formatSubmittedAt(value: string | undefined, lang: string, t: (key: string) => string): string {
  if (!value) return t('common.notReported');
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? t('common.invalidTimestamp')
    : date.toLocaleString(lang === 'kn' ? 'kn-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink-800 pb-2">
      <span className="text-[10px] text-ink-500">{label}</span>
      <span className="text-right text-[10px] text-ink-200">{value}</span>
    </div>
  );
}

function submittedReportId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('report_id' in payload)) return null;
  const value = payload.report_id;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
}
