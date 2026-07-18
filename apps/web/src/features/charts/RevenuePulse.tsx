import { useCallback, useMemo, useRef, useState } from 'react';
import type { TimeseriesResponse } from '@signalroom/schemas';
import { money, shortDate, pct } from '../../lib/format';

/**
 * Revenue Pulse — Signalroom's signature visualization.
 * Time-series net revenue (signal line) over the comparison period rendered as
 * a neutral band, with robust-statistics anomaly markers and an interactive
 * scrub that works by pointer, touch, and arrow keys.
 */
export function RevenuePulse({ data, height = 300 }: { data: TimeseriesResponse; height?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [scrub, setScrub] = useState<number | null>(null);

  const measure = useCallback((node: HTMLDivElement | null) => {
    (wrapRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(node);
  }, []);

  const { series, comparison, anomalies, granularity } = data;
  const pad = { top: 18, right: 16, bottom: 26, left: 56 };
  const innerW = Math.max(80, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;

  const anomalyByIndex = useMemo(() => {
    const m = new Map<number, { zScore: number; direction: 'high' | 'low' }>();
    for (const a of anomalies) {
      const idx = series.findIndex((s) => s.period === a.period);
      if (idx >= 0) m.set(idx, a);
    }
    return m;
  }, [anomalies, series]);

  const maxY = useMemo(() => {
    let m = 0;
    for (const p of series) m = Math.max(m, p.netSales);
    if (comparison) for (const p of comparison) m = Math.max(m, p.netSales);
    return m || 1;
  }, [series, comparison]);

  const n = series.length;
  const x = (i: number) => (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => innerH - (v / (maxY * 1.06)) * innerH;

  const linePath = (pts: { netSales: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.netSales).toFixed(1)}`).join(' ');

  const areaPath = (pts: { netSales: number }[]) =>
    `${linePath(pts)} L${x(pts.length - 1).toFixed(1)},${innerH} L${x(0).toFixed(1)},${innerH} Z`;

  // y-axis: 3 round ticks
  const ticks = useMemo(() => {
    const step = niceStep(maxY / 3);
    const out: number[] = [];
    for (let v = step; v <= maxY * 1.02; v += step) out.push(v);
    return out.slice(0, 4);
  }, [maxY]);

  // x labels: as many as fit at ~92px apart, never colliding on small screens
  const xLabelIdx = useMemo(() => {
    const count = Math.max(2, Math.min(6, Math.floor(innerW / 92) + 1, n));
    if (count <= 1 || n <= 1) return [0];
    return [...new Set(Array.from({ length: count }, (_, i) => Math.round((i / (count - 1)) * (n - 1))))];
  }, [n, innerW]);

  function indexFromClientX(clientX: number): number {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return 0;
    const rel = clientX - rect.left - pad.left;
    return Math.max(0, Math.min(n - 1, Math.round((rel / innerW) * (n - 1))));
  }

  const active = scrub !== null ? series[scrub] : null;
  const activeCompare = scrub !== null && comparison ? comparison[scrub] : null;
  const last = series[n - 1];

  if (n === 0) return null;

  const scrubX = scrub !== null ? x(scrub) : null;
  const tooltipLeft = scrubX !== null ? Math.min(Math.max(scrubX + pad.left, 90), width - 110) : 0;

  return (
    <div ref={measure} className="relative select-none" style={{ height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Net revenue by ${granularity}. Use arrow keys to move through values.`}
        tabIndex={0}
        className="block outline-offset-4"
        onPointerMove={(e) => setScrub(indexFromClientX(e.clientX))}
        onPointerLeave={() => setScrub(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setScrub((s) => Math.min(n - 1, (s ?? n - 1) + (s === null ? 0 : 1)));
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setScrub((s) => Math.max(0, (s ?? n - 1) - 1));
          } else if (e.key === 'Escape') {
            setScrub(null);
          }
        }}
      >
        <g transform={`translate(${pad.left},${pad.top})`}>
          {/* grid + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke="var(--color-grid)" strokeWidth={1} />
              <text x={-10} y={y(t) + 3} textAnchor="end" className="fill-[var(--color-ink-3)] font-mono text-[10px]">
                {money(t, { compact: true })}
              </text>
            </g>
          ))}
          <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--color-line-2)" strokeWidth={1} />

          {/* comparison band */}
          {comparison && comparison.length > 1 && (
            <>
              <path d={areaPath(comparison.slice(0, n))} fill="var(--color-compare)" opacity={0.35} />
              <path d={linePath(comparison.slice(0, n))} fill="none" stroke="var(--color-compare)" strokeWidth={1.5} />
            </>
          )}

          {/* current series */}
          <path d={areaPath(series)} fill="var(--color-signal)" opacity={0.06} />
          <path d={linePath(series)} fill="none" stroke="var(--color-signal)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* anomaly markers */}
          {[...anomalyByIndex.entries()].map(([i, a]) => (
            <g key={i} transform={`translate(${x(i)},${y(series[i]!.netSales)})`}>
              <circle r={6.5} fill="none" stroke={a.direction === 'high' ? 'var(--color-signal)' : 'var(--color-down)'} strokeWidth={1.5} />
              <circle r={2.5} fill={a.direction === 'high' ? 'var(--color-signal)' : 'var(--color-down)'} />
            </g>
          ))}

          {/* direct end label */}
          {last && scrub === null && (
            <g transform={`translate(${x(n - 1)},${y(last.netSales)})`}>
              <circle r={3} fill="var(--color-signal)" />
              <text x={-6} y={-8} textAnchor="end" className="fill-[var(--color-ink)] font-mono text-[11px] font-medium">
                {money(last.netSales, { compact: true })}
              </text>
            </g>
          )}

          {/* scrub crosshair */}
          {scrub !== null && active && (
            <g>
              <line x1={x(scrub)} x2={x(scrub)} y1={0} y2={innerH} stroke="var(--color-ink-3)" strokeWidth={1} strokeDasharray="3 3" />
              {activeCompare && <circle cx={x(scrub)} cy={y(activeCompare.netSales)} r={3.5} fill="var(--color-compare)" stroke="var(--color-panel)" strokeWidth={1.5} />}
              <circle cx={x(scrub)} cy={y(active.netSales)} r={4.5} fill="var(--color-signal)" stroke="var(--color-panel)" strokeWidth={2} />
            </g>
          )}

          {/* x labels */}
          {xLabelIdx.map((i) => (
            <text key={i} x={x(i)} y={innerH + 17} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="fill-[var(--color-ink-3)] font-mono text-[10px]">
              {shortDate(series[i]!.period)}
            </text>
          ))}
        </g>
      </svg>

      {/* tooltip */}
      {scrub !== null && active && (
        <div
          className="pointer-events-none absolute top-1 z-10 w-48 -translate-x-1/2 rounded-lg border border-line bg-ink px-3 py-2 text-ink-inverse shadow-lg"
          style={{ left: tooltipLeft }}
          role="status"
        >
          <p className="font-mono text-[10px] tracking-wide text-ink-inverse/60 uppercase">
            {shortDate(active.period)}
            {anomalyByIndex.has(scrub) && (
              <span className={anomalyByIndex.get(scrub)!.direction === 'high' ? ' text-[#8fa4ff]' : ' text-[#ff9d97]'}>
                {' '}
                · unusual {anomalyByIndex.get(scrub)!.direction}
              </span>
            )}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <span className="text-xs text-ink-inverse/70">Net sales</span>
            <span className="tabular text-sm font-semibold">{money(active.netSales)}</span>
          </div>
          {activeCompare && (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-ink-inverse/70">Comparison</span>
                <span className="tabular text-xs">{money(activeCompare.netSales)}</span>
              </div>
              {activeCompare.netSales > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-ink-inverse/70">Change</span>
                  <span className="tabular text-xs">{pct((active.netSales - activeCompare.netSales) / activeCompare.netSales, { signed: true })}</span>
                </div>
              )}
            </>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-ink-inverse/70">Orders</span>
            <span className="tabular text-xs">{active.orders}</span>
          </div>
        </div>
      )}

      {/* legend (two series → always present) */}
      <div className="absolute top-0 right-2 flex items-center gap-3 rounded bg-panel/80 px-1 text-[11px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-signal" aria-hidden="true" /> Current
        </span>
        {comparison && (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-[var(--color-compare)]" aria-hidden="true" /> Comparison
          </span>
        )}
        {anomalies.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-signal" aria-hidden="true" /> Unusual day
          </span>
        )}
      </div>
    </div>
  );
}

function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const unit = raw / pow;
  const step = unit >= 5 ? 10 : unit >= 2 ? 5 : unit >= 1 ? 2 : 1;
  return step * pow;
}
