import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MARQUEE = [
  'Revenue intelligence', 'Channel attribution', 'Cohort clarity', 'Refund telemetry',
  'Product velocity', 'Customer lifetime value', 'Seasonal signal', 'Zero setup',
];

const FEATURES = [
  {
    n: '01',
    title: 'Every dollar, accounted for',
    body: 'Completed, refunded and cancelled orders are tracked separately — so revenue is revenue, not wishful thinking. Period-over-period deltas are computed server-side against equal-length windows.',
  },
  {
    n: '02',
    title: 'Channels that explain themselves',
    body: 'Online, in-store and wholesale performance split cleanly, with order counts and revenue share side by side. Spot the channel quietly carrying the quarter.',
  },
  {
    n: '03',
    title: 'From SKU to signal',
    body: 'Product-level units, revenue and margin, ranked live. The long tail is visible instead of buried — and the hits justify themselves with numbers.',
  },
  {
    n: '04',
    title: 'Customers, not just carts',
    body: 'Lifetime value, order cadence and geography per customer. Your top accounts surface automatically, before their next order does.',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

function HeroSpark() {
  // Static, decorative revenue curve for the hero — the real one lives in the dashboard.
  const d = 'M0,88 C40,84 60,72 90,74 C120,76 140,58 170,60 C200,62 220,42 250,46 C280,50 300,28 330,30 C360,32 380,16 400,12';
  return (
    <svg viewBox="0 0 400 100" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c3ec4f" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#c3ec4f" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L400,100 L0,100 Z`} fill="url(#heroFill)" />
      <path d={d} fill="none" stroke="#c3ec4f" strokeWidth="2" strokeLinecap="round" />
      <circle cx="400" cy="12" r="4" fill="#c3ec4f" />
    </svg>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? '/dashboard' : '/login';

  return (
    <main className="min-h-screen bg-ink text-cream">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-ink/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight">
            xorai<span className="text-lime">.</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-fog sm:flex">
            <a href="#product" className="transition-colors hover:text-cream">Product</a>
            <a href="#numbers" className="transition-colors hover:text-cream">Numbers</a>
          </div>
          <Link
            to={cta}
            className="group flex items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            {user ? 'Open dashboard' : 'Sign in'}
            <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-40 pb-24 sm:pt-48">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 45% at 70% 10%, rgba(195,236,79,0.07), transparent 70%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(70% 60% at 50% 30%, black, transparent)',
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          <p className="reveal-line mb-6 text-sm font-medium tracking-[0.25em] text-fog uppercase">
            <span style={{ animationDelay: '0.05s' }}>Retail analytics, rebuilt</span>
          </p>
          <h1 className="font-display text-[clamp(3rem,9vw,7.5rem)] leading-[0.95] font-semibold tracking-tight">
            <span className="reveal-line block"><span style={{ animationDelay: '0.1s' }}>Numbers that</span></span>
            <span className="reveal-line block">
              <span style={{ animationDelay: '0.22s' }}>
                read <em className="text-lime not-italic">themselves</em>
              </span>
            </span>
          </h1>
          <div className="mt-10 flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
            <p className="reveal-line max-w-md text-lg leading-relaxed text-fog">
              <span style={{ animationDelay: '0.34s' }}>
                Two years of orders, four sales channels, one screen. Xorai turns raw
                transactions into a dashboard you can actually think with.
              </span>
            </p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.6 }}
            >
              <Link
                to={cta}
                className="group inline-flex items-center gap-2 rounded-full border border-hairline px-6 py-3 text-sm font-medium transition-colors hover:border-lime hover:text-lime"
              >
                See the live dashboard
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 overflow-hidden rounded-2xl border border-hairline bg-panel"
          >
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <div>
                <p className="text-xs tracking-wider text-ash uppercase">Trailing 12 months</p>
                <p className="font-display text-2xl font-semibold">Net revenue</p>
              </div>
              <span className="rounded-full border border-hairline px-3 py-1 text-xs text-fog">live demo data</span>
            </div>
            <div className="h-48 px-2 pt-4 sm:h-64">
              <HeroSpark />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Marquee */}
      <section className="border-y border-hairline py-5" aria-hidden="true">
        <div className="flex overflow-hidden whitespace-nowrap">
          <div className="animate-marquee flex shrink-0 items-center">
            {[...MARQUEE, ...MARQUEE].map((item, i) => (
              <span key={i} className="mx-6 flex items-center gap-6 font-display text-sm tracking-wide text-fog">
                {item}
                <span className="text-lime">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Numbers strip */}
      <section id="numbers" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-4">
          {[
            ['24', 'months of history'],
            ['15k', 'orders analyzed'],
            ['3', 'sales channels'],
            ['<50ms', 'query latency'],
          ].map(([value, label]) => (
            <motion.div key={label} {...fadeUp} className="bg-ink p-8">
              <p className="font-display text-4xl font-semibold text-lime sm:text-5xl">{value}</p>
              <p className="mt-2 text-sm text-fog">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="product" className="mx-auto max-w-6xl px-6 pb-28">
        <motion.h2 {...fadeUp} className="font-display max-w-2xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Built for the questions you ask at <span className="text-lime">9am on a Monday</span>
        </motion.h2>
        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2">
          {FEATURES.map((f) => (
            <motion.article key={f.n} {...fadeUp} className="group bg-ink p-10 transition-colors hover:bg-panel">
              <p className="font-display text-sm text-ash">{f.n}</p>
              <h3 className="font-display mt-4 text-2xl font-semibold tracking-tight transition-colors group-hover:text-lime">
                {f.title}
              </h3>
              <p className="mt-4 leading-relaxed text-fog">{f.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-6 py-28 text-center">
          <motion.h2 {...fadeUp} className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            Stop exporting CSVs<span className="text-lime">.</span>
          </motion.h2>
          <motion.p {...fadeUp} className="mx-auto mt-5 max-w-md text-fog">
            One click gets you into a fully seeded demo workspace. No signup, no credit card, no sales call.
          </motion.p>
          <motion.div {...fadeUp} className="mt-10">
            <Link
              to={cta}
              className="group inline-flex items-center gap-2 rounded-full bg-lime px-8 py-4 font-semibold text-ink transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Explore the demo
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-ash sm:flex-row">
          <p className="font-display font-semibold text-fog">
            xorai<span className="text-lime">.</span>
          </p>
          <p>Full-stack analytics demo — Express · SQLite · React</p>
        </div>
      </footer>
    </main>
  );
}
