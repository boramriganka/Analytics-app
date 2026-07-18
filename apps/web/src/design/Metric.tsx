import type { KpiValue } from '@signalroom/schemas';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { InfoTip } from './overlay';
import type { KpiMeta } from '../features/kpi/kpiMeta';

/** Tiny inline trend — one 2px line, no axes; decorative (the numbers carry meaning). */
export function Spark({ values, className = '' }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = w / (values.length - 1);
  const d = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`)
    .join(' ');
  const last = values[values.length - 1]!;
  const lastY = h - 3 - ((last - min) / span) * (h - 6);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className={className} aria-hidden="true">
      <path d={d} fill="none" stroke="var(--color-ink-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={lastY} r="2.5" fill="var(--color-signal)" />
    </svg>
  );
}

export function DeltaChip({ kpi, meta }: { kpi: KpiValue; meta: KpiMeta }) {
  const delta = meta.formatDelta(kpi);
  if (delta === null) return <span className="text-xs text-ink-3">no comparison</span>;
  const dir = (kpi.change ?? 0) > 0 ? 'up' : (kpi.change ?? 0) < 0 ? 'down' : 'flat';
  const good = meta.goodWhenUp === null || dir === 'flat' ? null : dir === 'up' ? meta.goodWhenUp : !meta.goodWhenUp;
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[11px] font-medium ${
        good === null ? 'bg-well text-ink-2' : good ? 'bg-up-wash text-up' : 'bg-down-wash text-down'
      }`}
    >
      <Icon size={11} aria-hidden="true" />
      <span className="sr-only">{dir === 'up' ? 'up' : dir === 'down' ? 'down' : 'unchanged'}</span>
      {delta}
    </span>
  );
}

export function Metric({
  kpi,
  meta,
  onInspect,
  compact = false,
}: {
  kpi: KpiValue;
  meta: KpiMeta;
  onInspect?: () => void;
  compact?: boolean;
}) {
  const body = (
    <div className={onInspect ? 'pointer-events-none relative z-10' : ''}>
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] text-ink-2">{meta.label}</span>
        {!compact && (
          <span className="pointer-events-auto">
            <InfoTip text={meta.definition} label={`What is ${meta.label}?`} />
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <span className="tabular text-[1.55rem] leading-none font-semibold tracking-tight text-ink">
          {meta.format(kpi.current)}
        </span>
        {!compact && kpi.spark.length > 1 && <Spark values={kpi.spark} className="hidden shrink-0 sm:block" />}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <DeltaChip kpi={kpi} meta={meta} />
        {kpi.previous !== null && <span className="truncate text-[11px] text-ink-3">from {meta.format(kpi.previous)}</span>}
      </div>
    </div>
  );

  if (!onInspect) {
    return <div className="rounded-[var(--radius-card)] border border-line bg-panel p-4">{body}</div>;
  }
  // The inspect target is a stretched *sibling* button (never a nested one),
  // so the InfoTip button stays valid, reachable, and independently focusable.
  return (
    <div className="group relative rounded-[var(--radius-card)] border border-line bg-panel p-4 transition-colors duration-150 hover:border-line-2 focus-within:border-line-2">
      <button
        onClick={onInspect}
        aria-label={`Inspect ${meta.label}`}
        className="absolute inset-0 z-0 rounded-[var(--radius-card)]"
      />
      {body}
      <span
        aria-hidden="true"
        className="pointer-events-none relative z-10 mt-2 block text-[11px] text-ink-3 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        Click to inspect ↗
      </span>
    </div>
  );
}
