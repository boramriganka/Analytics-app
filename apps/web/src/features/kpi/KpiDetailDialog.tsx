import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { KpiValue } from '@signalroom/schemas';
import { Dialog } from '../../design/overlay';
import { DeltaChip } from '../../design/Metric';
import { Skeleton } from '../../design/primitives';
import { BreakdownBars } from '../charts/BreakdownBars';
import { useBreakdown } from '../../lib/queries';
import { money, rangeLabel } from '../../lib/format';
import { KPI_META } from './kpiMeta';

/**
 * "Inspect a KPI": definition, what happened in plain language, and the
 * products contributing most to the change (or the level, when no comparison).
 */
export function KpiDetailDialog({
  kpi,
  query,
  comparisonRange,
  onClose,
}: {
  kpi: KpiValue | null;
  query: string;
  comparisonRange: { from: string; to: string } | null;
  onClose: () => void;
}) {
  const breakdown = useBreakdown(query, 'product', 30);
  if (!kpi) return null;
  const meta = KPI_META[kpi.key];

  const rows = (breakdown.data?.rows ?? [])
    .map((r) => ({
      key: r.key,
      label: r.label,
      value: r.netSales,
      previous: r.previousNetSales,
      delta: r.previousNetSales !== null ? r.netSales - r.previousNetSales : null,
    }))
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
  const hasComparison = comparisonRange !== null;
  const contributing = hasComparison ? rows.slice(0, 6) : rows.sort((a, b) => b.value - a.value).slice(0, 6);

  return (
    <Dialog open onClose={onClose} title={meta.label} width="max-w-lg">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="tabular text-3xl font-semibold tracking-tight text-ink">{meta.format(kpi.current)}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <DeltaChip kpi={kpi} meta={meta} />
            {kpi.previous !== null && (
              <span className="text-xs text-ink-3">
                from {meta.format(kpi.previous)}
                {comparisonRange && ` (${rangeLabel(comparisonRange.from, comparisonRange.to)})`}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-2">{meta.plain(kpi)}</p>
      <p className="mt-2 rounded-md bg-well px-3 py-2 text-xs leading-relaxed text-ink-2">
        <span className="font-medium text-ink">Definition.</span> {meta.definition}
      </p>

      <div className="mt-4 border-t border-line pt-3">
        <h3 className="text-sm font-semibold text-ink">
          {hasComparison ? 'Products moving this number' : 'Top products in this period'}
        </h3>
        <p className="mt-0.5 text-xs text-ink-3">
          {hasComparison ? 'Sorted by the size of their net-sales change vs the comparison period.' : 'By net sales.'}
        </p>
        {breakdown.isLoading ? (
          <div className="space-y-2 py-3">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : (
          <div className="-mx-4">
            <BreakdownBars rows={contributing} format={(v) => money(v, { compact: true })} />
          </div>
        )}
        <Link
          to={`/app/products?${query}`}
          onClick={onClose}
          className="group inline-flex items-center gap-1 text-xs font-medium text-signal-ink hover:underline"
        >
          Open the full product view
          <ArrowRight size={12} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Dialog>
  );
}
