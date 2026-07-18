import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Logo } from '../../shell/AppShell';
import { RevenuePulse } from '../../features/charts/RevenuePulse';
import { InsightCard } from '../../features/insights/InsightCard';
import { HERO_TIMESERIES } from './heroData';

const STEPS = [
  {
    n: '01',
    title: 'Upload the export you already have',
    body: 'A CSV from your POS, shop platform or marketplace. Signalroom detects delimiters, date formats and currencies — no fixed template.',
  },
  {
    n: '02',
    title: 'Map columns once, keep the preset',
    body: 'Your headers are matched to canonical fields automatically. Save the mapping and the next import from the same system is one click.',
  },
  {
    n: '03',
    title: 'Every row is checked before import',
    body: 'Invalid dates, broken numbers and missing fields are caught up front. Download the rejected rows with reasons, fix, re-import — or continue without them. Imports can be undone.',
  },
  {
    n: '04',
    title: 'Read the overview, keep the receipts',
    body: 'Nine KPIs with comparisons, a revenue pulse with flagged unusual days, and deterministic insights that link to the filtered view that proves them.',
  },
];

const FEATURES = [
  {
    title: 'Insights that show their work',
    body: 'No black box. “Net sales increased 18.4%, primarily because one product contributed $42,300 more than in the comparison period” — computed, sourced, and linked to the supporting view. Observations and hypotheses are labeled as such.',
    proof: 'Open the demo overview',
  },
  {
    title: 'Import that respects your data',
    body: 'Row-level validation with a downloadable reject file, reusable mapping presets, progress you can see, and one-click undo. The same schema validates in your browser and again on the server.',
    proof: 'Try the import wizard',
  },
  {
    title: 'Reports that leave the building',
    body: 'Save any filtered view. Compose charts, insights and notes into a report, reorder it, and export a print-quality PDF — or the underlying CSV for any chart.',
    proof: 'Build a report in the demo',
  },
];

const SAMPLE_INSIGHTS = [
  {
    id: 'sample-1',
    severity: 'attention' as const,
    kind: 'observation' as const,
    title: 'Refund rate rose from 2.3% to 3.3%',
    body: 'Refunded value increased by $5,802, concentrated in Bath ($4,921 of the increase).',
    comparison: 'Compared with the previous 30 days.',
    href: '/demo',
  },
  {
    id: 'sample-2',
    severity: 'notable' as const,
    kind: 'observation' as const,
    title: 'Wednesday 1 Jul was an unusual day',
    body: 'Net sales reached 3.4× the typical Wednesday — flagged by weekday-aware robust statistics, visible as a ring on the pulse above.',
    comparison: 'Scored against the distribution of Wednesdays in the selected range.',
    href: '/demo',
  },
];

export default function Landing() {
  return (
    <main className="min-h-dvh bg-paper text-ink">
      {/* Nav */}
      <header className="border-b border-line">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5" aria-label="Site">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Logo /> Signalroom
          </Link>
          <div className="hidden items-center gap-7 text-sm text-ink-2 sm:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#features" className="hover:text-ink">What you get</a>
          </div>
          <Link
            to="/demo"
            className="rounded-[var(--radius-control)] bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal-ink"
          >
            Open the demo
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-14 sm:pt-24">
        <p className="font-mono text-[11px] tracking-[0.22em] text-ink-3 uppercase">Retail intelligence studio</p>
        <h1 className="font-display mt-4 max-w-3xl text-[clamp(2.2rem,6vw,4rem)] leading-[1.05] font-medium tracking-tight text-balance">
          Your sales data, explained — without an analyst.
        </h1>
        <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-xl text-[15px] leading-relaxed text-ink-2">
            Upload a transactional CSV and get a reliable, understandable business overview in under two minutes: what changed,
            what needs attention, and a report you can hand to someone else.
          </p>
          <div className="flex shrink-0 flex-col items-start gap-2">
            <Link
              to="/demo"
              className="group inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-signal px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-ink"
            >
              Explore the live demo
              <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="font-mono text-[10px] tracking-wide text-ink-3 uppercase">No account · no setup · sample data included</p>
          </div>
        </div>

        {/* Real product, real component, real data */}
        <figure className="mt-12 rounded-[10px] border border-line bg-panel shadow-[0_1px_2px_rgba(28,26,23,0.04),0_12px_32px_-16px_rgba(28,26,23,0.18)]">
          <figcaption className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3.5">
            <div>
              <p className="text-[15px] font-semibold">Revenue Pulse</p>
              <p className="mt-0.5 text-xs text-ink-3">Net sales by day · current vs comparison · unusual days flagged</p>
            </div>
            <p className="font-mono text-[10px] tracking-wide text-ink-3 uppercase">Live component · sample workspace data</p>
          </figcaption>
          <div className="px-4 pt-5 pb-3 sm:px-6">
            <RevenuePulse data={HERO_TIMESERIES} height={280} />
          </div>
        </figure>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SAMPLE_INSIGHTS.map((ins) => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
        </div>
      </section>

      {/* How it works — carbon editorial band */}
      <section id="how" className="bg-carbon text-ink-inverse">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="font-display max-w-xl text-3xl font-medium tracking-tight text-balance sm:text-4xl">
            From CSV to decisions, in four honest steps.
          </h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-[10px] border border-white/10 bg-white/10 sm:grid-cols-2">
            {STEPS.map((step) => (
              <li key={step.n} className="bg-carbon p-7 transition-colors hover:bg-carbon-2">
                <p className="font-mono text-[11px] tracking-[0.2em] text-[#8fa4ff]">{step.n}</p>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-inverse/70">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features tied to working things */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <h2 className="font-display max-w-xl text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Everything on this page exists in the demo.
        </h2>
        <p className="mt-3 max-w-lg text-sm text-ink-2">
          No mockups, no “coming soon”. Each claim below links to the working feature it describes.
        </p>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="flex flex-col rounded-[10px] border border-line bg-panel p-6">
              <h3 className="text-[17px] font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink-2">{f.body}</p>
              <Link to="/demo" className="group mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-signal-ink hover:underline">
                {f.proof}
                <ArrowRight size={13} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </article>
          ))}
        </div>

        {/* capability list */}
        <ul className="mt-10 grid gap-x-8 gap-y-2.5 text-sm text-ink-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            'Nine KPIs with period comparisons and definitions',
            'Filters that live in the URL — shareable and savable',
            'Weekday-aware anomaly detection (median/MAD)',
            'Colorblind-validated chart palette',
            'Data-quality report: duplicates, gaps, consequences',
            'Keyboard-operable charts and dialogs',
            'CSV export on every chart; table view on every chart',
            'SQLite + Express + React, no external services',
            'Deterministic seeded dataset — reset any time',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check size={14} className="mt-0.5 shrink-0 text-up" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Final CTA */}
      <section className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Two minutes to your first overview.</h2>
            <p className="mt-2 text-sm text-ink-2">The demo opens a fully seeded workspace — 27,000 transaction lines over 30 months.</p>
          </div>
          <Link
            to="/demo"
            className="group inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] bg-signal px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-signal-ink"
          >
            Open the demo
            <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 px-5 py-8 text-xs text-ink-3 sm:flex-row sm:items-center">
          <p className="flex items-center gap-2 font-medium text-ink-2">
            <Logo className="opacity-70" /> Signalroom
          </p>
          <p className="font-mono">
            A ground-up rebuild of an abandoned 2021 prototype · TypeScript · Express · SQLite · React
          </p>
        </div>
      </footer>
    </main>
  );
}
