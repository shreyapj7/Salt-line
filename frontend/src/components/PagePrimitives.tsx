import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col justify-between gap-5 pb-2 sm:flex-row sm:items-end">
      <div className="max-w-4xl">
        {eyebrow && (
          <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300">
            <span className="h-px w-5 bg-teal-400" />
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-[-0.035em] text-ink-100 sm:text-3xl xl:text-[2.5rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-300">
          {subtitle}
        </p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pb-1">{actions}</div>}
    </header>
  );
}

export function PageCard({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-lg border border-earth-gold/55 bg-ink-900 shadow-[0_8px_24px_rgba(41,45,39,0.06)] ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-earth-gold/40 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {Icon && <Icon size={17} strokeWidth={1.8} className="shrink-0 text-forest-bright" />}
              <h2 className="text-sm font-semibold tracking-tight text-ink-100 sm:text-base">{title}</h2>
            </div>
            {subtitle && (
              <p className="mt-1.5 text-xs leading-relaxed text-ink-400">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  accent = 'text-forest-bright',
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  detail: string;
  accent?: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-lg border border-earth-gold/55 bg-ink-900 p-5 shadow-[0_8px_24px_rgba(41,45,39,0.06)]">
      <div className="pointer-events-none absolute -right-7 -top-9 h-24 w-24 rounded-full bg-teal-700/10 blur-2xl" />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-ink-300">{label}</span>
        <Icon size={18} strokeWidth={1.8} className={accent} />
      </div>
      <div className="relative mt-4 font-mono text-3xl font-semibold tabular-nums tracking-tight text-ink-100">
        {value}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-400">{detail}</p>
    </article>
  );
}

export function StatusBadge({
  label,
  kind,
}: {
  label: string;
  kind: 'live' | 'demo' | 'mixed' | 'verified' | 'pending' | 'neutral' | 'alert';
}) {
  const styles: Record<typeof kind, string> = {
    live: 'border-success-bright/35 bg-success-deep/10 text-forest-pale',
    demo: 'border-earth-sand/40 bg-earth-gold/25 text-ink-200',
    mixed: 'border-teal-700/35 bg-teal-850/70 text-teal-300',
    verified: 'border-success-bright/35 bg-success-deep/10 text-forest-pale',
    pending: 'border-earth-sand/45 bg-earth-gold/25 text-earth-clay',
    neutral: 'border-ink-700 bg-ink-800 text-ink-300',
    alert: 'border-risk-high/35 bg-risk-high/10 text-risk-high',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wide ${styles[kind]}`}>
      {label}
    </span>
  );
}

export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'error';
}) {
  const styles = {
    info: 'border-forest-light/35 bg-forest-deep/55 text-forest-pale',
    warning: 'border-risk-moderate/30 bg-risk-moderate/10 text-earth-clay',
    error: 'border-risk-high/25 bg-risk-high/10 text-risk-high',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${styles[tone]}`}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink-200">{title}</p>
      <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-400">{detail}</p>
    </div>
  );
}

export function SourceLabel({ live, simulated = false }: { live: boolean; simulated?: boolean }) {
  const { t } = useI18n();
  const kind = simulated ? 'mixed' : live ? 'live' : 'demo';
  const label = simulated
    ? live
      ? t('source.liveSimulated')
      : t('source.demoSimulated')
    : live
      ? t('source.live')
      : t('source.demoFallback');
  return <StatusBadge label={label} kind={kind} />;
}
