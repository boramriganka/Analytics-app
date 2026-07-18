import { useState } from 'react';
import type { BreakdownDimension } from '@signalroom/schemas';
import { FilterBar } from '../../features/filters/FilterBar';
import { useFilters } from '../../lib/filters';
import { useBreakdown } from '../../lib/queries';
import { ChartContainer } from '../../design/ChartContainer';
import { BreakdownBars } from '../../features/charts/BreakdownBars';
import { AddToReportDialog, type PendingBlock } from '../../features/reports/AddToReportDialog';
import { SegmentedControl, Skeleton, ErrorState, EmptyState } from '../../design/primitives';
import { money, num, pct, rangeLabel } from '../../lib/format';

const DIMENSIONS: { value: BreakdownDimension; label: string }[] = [
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product' },
  { value: 'channel', label: 'Channel' },
  { value: 'store', label: 'Store' },
  { value: 'country', label: 'Country' },
  { value: 'customer', label: 'Customer' },
  { value: 'import', label: 'Import' },
];

export default function Explore() {
  const { filters, query } = useFilters();
  const [dimension, setDimension] = useState<BreakdownDimension>('category');
  const breakdown = useBreakdown(query, dimension, 100);
  const [pending, setPending] = useState<PendingBlock | null>(null);
  const periodLabel = rangeLabel(filters.from, filters.to);
  const dimLabel = DIMENSIONS.find((d) => d.value === dimension)?.label ?? dimension;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <FilterBar title="Explore" lede="Slice net sales by any dimension, under the current filters." />

      <div className="mb-4 overflow-x-auto pb-1">
        <SegmentedControl
          label="Breakdown dimension"
          value={dimension}
          onChange={setDimension}
          options={DIMENSIONS}
          size="sm"
        />
      </div>

      {breakdown.isError ? (
        <ErrorState message={(breakdown.error as Error).message} retry={() => breakdown.refetch()} />
      ) : breakdown.isLoading || !breakdown.data ? (
        <Skeleton className="h-96" />
      ) : breakdown.data.rows.length === 0 ? (
        <EmptyState title="Nothing to break down" body="No transactions match the current period and filters." />
      ) : (
        <ChartContainer
          title={`Net sales by ${dimLabel.toLowerCase()}`}
          subtitle={`${breakdown.data.rows.length} groups · ${periodLabel}`}
          summary={`Net sales broken down by ${dimLabel.toLowerCase()} for ${periodLabel}.`}
          csvName={`explore-${dimension}.csv`}
          columns={[
            { key: 'label', label: dimLabel },
            { key: 'netSales', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
            { key: 'orders', label: 'Orders', numeric: true, format: (v) => num(v as number) },
            { key: 'units', label: 'Units', numeric: true, format: (v) => num(v as number) },
            { key: 'refunds', label: 'Refunds', numeric: true, format: (v) => money(v as number) },
          ]}
          rows={breakdown.data.rows}
          onAddToReport={() =>
            setPending({ type: 'chart', config: { chart: 'breakdown', dimension, query, title: `${dimLabel} — ${periodLabel}` } })
          }
        >
          <BreakdownBars
            rows={breakdown.data.rows.map((r) => ({ key: r.key, label: r.label, value: r.netSales, previous: r.previousNetSales }))}
            format={(v) => money(v, { compact: true })}
            maxBars={20}
          />
          {breakdown.data.rows.length > 20 && (
            <p className="px-5 pb-3 text-[11px] text-ink-3">
              Top 20 shown — the table view and CSV contain all {breakdown.data.rows.length}. Share shown:{' '}
              {pct(
                breakdown.data.rows.slice(0, 20).reduce((a, r) => a + r.netSales, 0) / (breakdown.data.totalNetSales || 1)
              )}{' '}
              of the total.
            </p>
          )}
        </ChartContainer>
      )}
      <AddToReportDialog open={pending !== null} onClose={() => setPending(null)} block={pending} />
    </div>
  );
}
