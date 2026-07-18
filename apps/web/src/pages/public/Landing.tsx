import { Link } from 'react-router-dom';
import { Logo } from '../../shell/AppShell';

/** Interim landing — the full editorial experience is Stage 5. */
export default function Landing() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
      <div className="flex items-center gap-2.5 text-lg font-semibold text-ink">
        <Logo /> Signalroom
      </div>
      <h1 className="font-display max-w-xl text-4xl font-medium tracking-tight text-ink">
        Understand what changed in your sales — without an analyst.
      </h1>
      <p className="max-w-md text-sm text-ink-2">
        Import transactional sales data and get a reliable, understandable business overview in under two minutes.
      </p>
      <Link
        to="/demo"
        className="rounded-[var(--radius-control)] bg-signal px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-signal-ink"
      >
        Explore the live demo
      </Link>
      <p className="font-mono text-[11px] tracking-wide text-ink-3 uppercase">No account required</p>
    </main>
  );
}
