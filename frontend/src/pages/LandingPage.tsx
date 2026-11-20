import { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ClipboardCheck,
  Droplets,
  Map,
  Menu,
  MessageSquareText,
  Radio,
  ShieldCheck,
  Waves,
  X,
} from 'lucide-react';
import { LANGUAGES, useI18n } from '@/i18n/I18nContext';

interface LandingPageProps {
  onOpenDashboard: () => void;
}

const links = [
  ['landing.nav.home', '#home'],
  ['landing.nav.problem', '#problem'],
  ['landing.nav.solution', '#solution'],
  ['landing.nav.process', '#how-it-works'],
  ['landing.nav.impact', '#impact'],
  ['landing.nav.about', '#about'],
] as const;

const solutionAreas = [
  {
    icon: Map,
    title: 'landing.solutionTitle1',
    body: 'landing.solutionBody1',
  },
  {
    icon: ShieldCheck,
    title: 'landing.solutionTitle2',
    body: 'landing.solutionBody2',
  },
  {
    icon: ClipboardCheck,
    title: 'landing.solutionTitle3',
    body: 'landing.solutionBody3',
  },
];

const steps = [
  ['landing.step1Title', 'landing.step1Body'],
  ['landing.step2Title', 'landing.step2Body'],
  ['landing.step3Title', 'landing.step3Body'],
  ['landing.step4Title', 'landing.step4Body'],
  ['landing.step5Title', 'landing.step5Body'],
];

const features = [
  { icon: Map, title: 'landing.featureTitle1', body: 'landing.featureBody1' },
  { icon: Droplets, title: 'landing.featureTitle2', body: 'landing.featureBody2' },
  { icon: Radio, title: 'landing.featureTitle3', body: 'landing.featureBody3' },
  { icon: MessageSquareText, title: 'landing.featureTitle4', body: 'landing.featureBody4' },
  { icon: ClipboardCheck, title: 'landing.featureTitle5', body: 'landing.featureBody5' },
  { icon: ShieldCheck, title: 'landing.featureTitle6', body: 'landing.featureBody6' },
];

export default function LandingPage({ onOpenDashboard }: LandingPageProps) {
  const { t, lang, setLang } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="min-h-screen overflow-hidden bg-ink-950 text-ink-100">
      <header className="sticky top-0 z-40 border-b border-earth-gold/45 bg-ink-900">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
          <a href="#home" className="flex items-center gap-3" aria-label="SALT-LINE">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-deep text-forest-pale">
              <Waves size={21} />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.14em]">SALT-LINE</span>
              <span className="hidden text-[10px] text-ink-500 sm:block">{t('landing.coastalIntelligence')}</span>
            </span>
          </a>

          <nav aria-label={t('landing.mainNavigation')} className="hidden items-center gap-7 md:flex">
            {links.map(([label, href]) => (
              <a key={href} href={href} className="text-xs font-medium text-ink-400 transition-colors hover:text-forest-pale">
                {t(label)}
              </a>
            ))}
          </nav>

          <label className="sr-only" htmlFor="landing-language">{t('nav.language')}</label>
          <select
            id="landing-language"
            aria-label={t('nav.language')}
            value={lang}
            onChange={(event) => {
              const language = LANGUAGES.find((item) => item.code === event.target.value);
              if (language) setLang(language.code);
            }}
            className="rounded-md border border-earth-gold/60 bg-ink-950 px-2.5 py-2 text-xs text-ink-200"
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>{language.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="hidden items-center gap-2 rounded-md bg-forest-base px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-forest-bright sm:inline-flex"
          >
            {t('landing.openDashboard')} <ArrowRight size={14} />
          </button>
          <button
            type="button"
            aria-label={t(menuOpen ? 'landing.closeNavigation' : 'landing.openNavigation')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-md border border-earth-gold/60 p-2 text-ink-200 md:hidden"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {menuOpen && (
          <nav aria-label={t('landing.mobileNavigation')} className="space-y-1 border-t border-earth-gold/40 bg-ink-900 px-5 py-4 md:hidden">
            {links.map(([label, href]) => (
              <a key={href} href={href} onClick={closeMenu} className="block rounded px-3 py-2.5 text-sm text-ink-300 hover:bg-ink-800">
                {t(label)}
              </a>
            ))}
            <button type="button" onClick={onOpenDashboard} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-forest-base px-4 py-3 text-sm font-semibold text-white">
              {t('landing.openDashboard')} <ArrowRight size={15} />
            </button>
          </nav>
        )}
      </header>

      <section id="home" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-24">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-forest-light/35 bg-forest-deep/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-forest-pale">
            <span className="h-1.5 w-1.5 rounded-full bg-forest-bright" />
            {t('landing.pilot')}
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-earth-clay">SALT-LINE</p>
          <h1 className="max-w-[13ch] text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-[3.7rem]">
            {t('landing.heroTitle')}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-ink-400 sm:text-lg sm:leading-8">
            {t('landing.heroDescription')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={onOpenDashboard} className="inline-flex items-center gap-2 rounded-md bg-forest-base px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-forest-bright">
              {t('landing.exploreDashboard')} <ArrowRight size={16} />
            </button>
            <a href="#problem" className="inline-flex items-center gap-2 rounded-md border border-earth-gold px-5 py-3 text-sm font-semibold text-ink-200 transition hover:bg-ink-800">
              {t('landing.mission')} <ArrowDown size={15} />
            </a>
          </div>
          <div className="mt-9 flex items-start gap-3 border-l-2 border-forest-light pl-4">
            <Droplets size={17} className="mt-0.5 shrink-0 text-forest-bright" />
            <p className="max-w-lg text-xs leading-5 text-ink-500">
              {t('landing.disclaimer')}
            </p>
          </div>
        </div>

        <div className="relative min-h-[330px] overflow-hidden rounded-lg border border-earth-gold/45 bg-earth-gold/30 shadow-[0_24px_60px_rgba(41,45,39,0.12)] sm:min-h-[430px]">
          <img
            src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1600&q=85"
            alt={t('landing.imageAlt')}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#203d32]/80 via-[#203d32]/12 to-transparent" />
          <div className="absolute left-5 top-5 rounded-md bg-ink-900/90 px-3 py-2 text-[10px] font-medium text-ink-200 shadow-sm">
            {t('landing.coastalIntelligence')}
          </div>
          <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-4 text-white">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75">{t('landing.pilotRegion')}</p>
              <p className="mt-1 text-xl font-semibold">Udupi, Karnataka</p>
            </div>
            <p className="max-w-[240px] text-[10px] leading-relaxed text-white/80">
              {t('landing.illustrativeImage')}
            </p>
          </div>
        </div>
      </section>

      <section id="problem" className="border-y border-earth-gold/45 bg-ink-900 py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-earth-clay">{t('landing.problemEyebrow')}</p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {t('landing.problemTitle')}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              'landing.problem1',
              'landing.problem2',
              'landing.problem3',
              'landing.problem4',
              'landing.problem5',
            ].map((text, index) => (
              <div key={text} className={`flex gap-3 rounded-md border border-earth-gold/45 bg-ink-950 p-4 ${index === 4 ? 'sm:col-span-2' : ''}`}>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-earth-gold/50 text-[10px] font-semibold text-earth-clay">{String(index + 1).padStart(2, '0')}</span>
                <p className="text-sm leading-6 text-ink-300">{t(text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="solution" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-earth-clay">{t('landing.solutionEyebrow')}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t('landing.solutionTitle')}</h2>
          <p className="mt-4 text-sm leading-7 text-ink-400">
            {t('landing.solutionDescription')}
          </p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {solutionAreas.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-lg border border-earth-gold/55 bg-ink-900 p-6 shadow-[0_8px_24px_rgba(41,45,39,0.05)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-forest-deep text-forest-pale"><Icon size={19} /></span>
              <h3 className="mt-5 text-base font-semibold">{t(title)}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-400">{t(body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-[#E8E4D9] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-earth-clay">{t('landing.processEyebrow')}</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{t('landing.processTitle')}</h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map(([title, body], index) => (
              <li key={title} className="relative rounded-md bg-ink-900 p-5 shadow-sm">
                <span className="font-mono text-xs font-semibold text-forest-bright">0{index + 1}</span>
                <h3 className="mt-5 text-base font-semibold">{t(title)}</h3>
                <p className="mt-2 text-xs leading-5 text-ink-400">{t(body)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-earth-clay">{t('landing.featuresEyebrow')}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t('landing.featuresTitle')}</h2>
          </div>
          <button type="button" onClick={onOpenDashboard} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-forest-pale hover:text-forest-bright">
            {t('landing.explorePlatform')} <ArrowRight size={15} />
          </button>
        </div>
        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <article key={title} className="flex gap-4 rounded-md border border-earth-gold/45 bg-ink-900 p-5">
              <Icon size={19} className="mt-0.5 shrink-0 text-forest-bright" />
              <div>
                <h3 className="text-sm font-semibold">{t(title)}</h3>
                <p className="mt-1.5 text-xs leading-5 text-ink-400">{t(body)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="impact" className="border-y border-earth-gold/45 bg-ink-900 py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-earth-clay">{t('landing.impactEyebrow')}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{t('landing.impactTitle')}</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-ink-400">
              {t('landing.impactDescription')}
            </p>
          </div>
          <div id="about" className="grid gap-3 sm:grid-cols-2">
            {['landing.group1', 'landing.group2', 'landing.group3', 'landing.group4'].map((group) => (
              <div key={group} className="flex items-center gap-3 rounded-md border border-earth-gold/45 bg-ink-950 px-4 py-4">
                <span className="h-2 w-2 rounded-full bg-forest-bright" />
                <span className="text-sm font-medium text-ink-200">{t(group)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="rounded-lg bg-forest-base px-6 py-10 text-white sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">{t('landing.ctaEyebrow')}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{t('landing.ctaTitle')}</h2>
          </div>
          <button type="button" onClick={onOpenDashboard} className="mt-7 inline-flex shrink-0 items-center gap-2 rounded-md bg-ink-900 px-5 py-3 text-sm font-semibold text-forest-pale transition hover:bg-white lg:mt-0">
            {t('landing.enterDashboard')} <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <footer className="border-t border-earth-gold/45 bg-ink-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Waves size={18} className="text-forest-bright" />
            <div>
              <p className="text-xs font-bold tracking-[0.12em]">SALT-LINE</p>
              <p className="mt-1 text-[10px] text-ink-500">{t('landing.footerDescription')}</p>
            </div>
          </div>
          <nav aria-label={t('landing.footerNavigation')} className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-400">
            {links.map(([label, href]) => <a key={href} href={href} className="hover:text-forest-pale">{t(label)}</a>)}
            <button type="button" onClick={onOpenDashboard} className="font-semibold text-forest-pale hover:text-forest-bright">{t('landing.openDashboard')}</button>
          </nav>
        </div>
      </footer>
    </main>
  );
}
