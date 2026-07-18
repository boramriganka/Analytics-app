import { pct } from '../../lib/format';

export interface BarRow {
  key: string;
  label: string;
  value: number;
  previous?: number | null;
}

/**
 * Magnitude comparison across one entity type → single hue; length carries the
 * value, direct labels carry the numbers (relief for sub-3:1 series colors is
 * irrelevant here — bars use the signal hue at full contrast).
 */
export function BreakdownBars({
  rows,
  format,
  showDelta = true,
  maxBars = 8,
}: {
  rows: BarRow[];
  format: (v: number) => string;
  showDelta?: boolean;
  maxBars?: number;
}) {
  const shown = rows.slice(0, maxBars);
  const max = Math.max(...shown.map((r) => r.value), 1);
  return (
    <ol className="flex flex-col gap-2.5 px-4 py-3 sm:px-5">
      {shown.map((r) => {
        const delta = showDelta && r.previous != null && r.previous > 0 ? (r.value - r.previous) / r.previous : null;
        return (
          <li key={r.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-ink">{r.label}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                {delta !== null && (
                  <span className={`tabular font-mono text-[11px] ${delta > 0.005 ? 'text-up' : delta < -0.005 ? 'text-down' : 'text-ink-3'}`}>
                    {pct(delta, { signed: true })}
                  </span>
                )}
                <span className="tabular font-medium text-ink">{format(r.value)}</span>
              </span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-sm bg-well" aria-hidden="true">
              <div
                className="h-full rounded-sm bg-signal transition-[width] duration-300 ease-[var(--ease-swift)]"
                style={{ width: `${Math.max((r.value / max) * 100, r.value > 0 ? 1.5 : 0)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
