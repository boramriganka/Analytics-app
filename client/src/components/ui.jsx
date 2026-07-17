import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { money, num, pct } from '../lib/format';

const RANGES = [
  ['7d', '7D'],
  ['30d', '30D'],
  ['90d', '90D'],
  ['12m', '12M'],
  ['all', 'All'],
];

export function RangePicker({ value, onChange }) {
  return (
    <div className="flex rounded-full border border-hairline p-1" role="group" aria-label="Date range">
      {RANGES.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            value === key ? 'bg-lime text-ink' : 'text-fog hover:text-cream'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function StatTile({ label, value, delta, goodWhenUp = true, format = 'money', compact = true }) {
  const fmt = format === 'money' ? money : num;
  const up = delta != null && delta > 0;
  const isGood = delta != null && (goodWhenUp ? delta >= 0 : delta <= 0);
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="rounded-2xl border border-hairline bg-panel p-5 transition-colors hover:border-white/15">
      <p className="text-[13px] text-fog">{label}</p>
      <p className="font-display mt-2 text-[1.75rem] leading-none font-semibold tracking-tight">
        {fmt(value, { compact })}
      </p>
      {delta != null && (
        <p className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${
              isGood ? 'bg-good/15 text-[#4fca4f]' : 'bg-bad/15 text-[#e66767]'
            }`}
          >
            <Arrow size={12} aria-hidden="true" />
            <span className="sr-only">{up ? 'up' : 'down'} </span>
            {pct(Math.abs(delta), { signed: false })}
          </span>
          <span className="text-ash">vs prior period</span>
        </p>
      )}
    </div>
  );
}

export function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-hairline bg-panel ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-1">
          <div>
            <h2 className="font-display text-[15px] font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ash">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusChip({ status }) {
  const map = {
    completed: ['bg-good/15 text-[#4fca4f]', '●'],
    refunded: ['bg-[#c98500]/15 text-[#e0a63d]', '↩'],
    cancelled: ['bg-bad/15 text-[#e66767]', '✕'],
  };
  const [cls, icon] = map[status] ?? ['bg-raised text-fog', '·'];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      <span aria-hidden="true">{icon}</span>
      {status}
    </span>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-raised ${className}`} />;
}

export function ErrorNote({ error, retry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-panel p-10 text-center">
      <p className="text-sm text-fog">Couldn’t load data: {error}</p>
      {retry && (
        <button onClick={retry} className="rounded-full border border-hairline px-4 py-1.5 text-sm hover:border-lime/60 hover:text-lime">
          Retry
        </button>
      )}
    </div>
  );
}
