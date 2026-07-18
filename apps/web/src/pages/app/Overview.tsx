import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { KpiValue } from '@signalroom/schemas';
import { FilterBar } from '../../features/filters/FilterBar';
import { useFilters } from '../../lib/filters';
import { useSummary, useTimeseries, useBreakdown, useInsights } from '../../lib/queries';
import { KPI_META, KPI_ORDER } from '../../features/kpi/kpiMeta';
import { Metric } from '../../design/Metric';
import { ChartContainer } from '../../design/ChartContainer';
import { RevenuePulse } from '../../features/charts/RevenuePulse';
import { BreakdownBars } from '../../features/charts/BreakdownBars';
import { InsightCard } from '../../features/insights/InsightCard';
import { KpiDetailDialog } from '../../features/kpi/KpiDetailDialog';
import { AddToReportDialog, type PendingBlock } from '../../features/reports/AddToReportDialog';
import { Skeleton, ErrorState, EmptyState, Button } from '../../design/primitives';
import { money, num, rangeLabel, setCurrency } from '../../lib/format';

export default function Overview() {
  const { filters, query } = useFilters();
  const summary = useSummary(query);
  const timeseries = useTimeseries(query);
  const categories = useBreakdown(query, 'category');
  const channels = useBreakdown(query, 'channel');
  const insights = useInsights(query);
  const navigate = useNavigate();

  const [inspecting, setInspecting] = useState<KpiValue | null>(null);
  const [pendingBlock, setPendingBlock] = useState<PendingBlock | null>(null);

  useEffect(() => {
    setCurrency(summary.data?.currency ?? null);
  }, [summary.data?.currency]);

  const kpis = summary.data
    ? KPI_ORDER.map((k) => summary.data.kpis.find((x) => x.key === k)).filter((k): k is KpiValue => Boolean(k))
    : [];
  const periodLabel = rangeLabel(filters.from, filters.to);

  if (summary.isError) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <FilterBar title="Overview" />
        <ErrorState message={(summary.error as Error).message} retry={() => summary.refetch()} />
      </div>
    );
  }

  const noData = summary.data && summary.data.transactionCount === 0;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <FilterBar title="Overview" lede={`How the business performed, ${periodLabel}.`} />

      {noData ? (
        <EmptyState
          title="No transactions in this period"
          body="Widen the date range, remove a filter, or import data to see the overview."
          action={
            <Button variant="primary" onClick={() => navigate('/onboarding/import')}>
              Import data
            </Button>
          }
        />
      ) : (
        <>
          {/* KPI grid */}
          <section aria-label="Key performance indicators" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {summary.isLoading
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[118px]" />)
              : kpis.map((kpi) => (
                  <Metric key={kpi.key} kpi={kpi} meta={KPI_META[kpi.key]} onInspect={() => setInspecting(kpi)} />
                ))}
          </section>

          {/* Revenue Pulse */}
          <div className="mt-4">
            {timeseries.isLoading ? (
              <Skeleton className="h-[360px]" />
            ) : timeseries.isError ? (
              <ErrorState message={(timeseries.error as Error).message} retry={() => timeseries.refetch()} />
            ) : timeseries.data && timeseries.data.series.length > 0 ? (
              <ChartContainer
                title="Revenue Pulse"
                subtitle={`Net sales by ${timeseries.data.granularity} · ${periodLabel}${
                  timeseries.data.anomalies.length
                    ? ` · ${timeseries.data.anomalies.length} unusual ${timeseries.data.anomalies.length === 1 ? 'day' : 'days'} flagged`
                    : ''
                }`}
                summary={`Net sales by ${timeseries.data.granularity} for ${periodLabel}, compared against the previous period. ${timeseries.data.anomalies.length} unusual days are flagged.`}
                csvName="revenue-pulse.csv"
                columns={[
                  { key: 'period', label: 'Period' },
                  { key: 'netSales', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
                  { key: 'grossSales', label: 'Gross sales', numeric: true, format: (v) => money(v as number) },
                  { key: 'orders', label: 'Orders', numeric: true },
                  { key: 'units', label: 'Units', numeric: true },
                ]}
                rows={timeseries.data.series}
                onAddToReport={() =>
                  setPendingBlock({
                    type: 'chart',
                    config: { chart: 'revenue-pulse', query, title: `Revenue Pulse — ${periodLabel}` },
                  })
                }
              >
                <div className="px-3 pt-4 sm:px-4">
                  <RevenuePulse data={timeseries.data} />
                </div>
              </ChartContainer>
            ) : null}
          </div>

          {/* Insights */}
          {insights.data && insights.data.insights.length > 0 && (
            <section aria-label="Insights" className="mt-4">
              <h2 className="mb-2.5 text-[15px] font-semibold text-ink">What changed, and why it matters</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {insights.data.insights.slice(0, 6).map((ins) => (
                  <InsightCard
                    key={ins.id}
                    insight={ins}
                    onAddToReport={() =>
                      setPendingBlock({
                        type: 'insight',
                        config: { insight: ins, capturedAt: new Date().toISOString(), periodLabel },
                      })
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Category & channel snapshots */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {categories.data && categories.data.rows.length > 0 && (
              <ChartContainer
                title="Net sales by category"
                subtitle="with change vs the comparison period"
                summary={`Net sales by product category for ${periodLabel}.`}
                csvName="categories.csv"
                columns={[
                  { key: 'label', label: 'Category' },
                  { key: 'netSales', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
                  { key: 'units', label: 'Units', numeric: true, format: (v) => num(v as number) },
                ]}
                rows={categories.data.rows}
                onAddToReport={() =>
                  setPendingBlock({
                    type: 'chart',
                    config: { chart: 'breakdown', dimension: 'category', query, title: `Categories — ${periodLabel}` },
                  })
                }
              >
                <BreakdownBars
                  rows={categories.data.rows.map((r) => ({
                    key: r.key,
                    label: r.label,
                    value: r.netSales,
                    previous: r.previousNetSales,
                  }))}
                  format={(v) => money(v, { compact: true })}
                />
              </ChartContainer>
            )}
            {channels.data && channels.data.rows.length > 0 && (
              <ChartContainer
                title="Net sales by channel"
                subtitle="with change vs the comparison period"
                summary={`Net sales by sales channel for ${periodLabel}.`}
                csvName="channels.csv"
                columns={[
                  { key: 'label', label: 'Channel' },
                  { key: 'netSales', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
                  { key: 'orders', label: 'Orders', numeric: true },
                ]}
                rows={channels.data.rows}
                onAddToReport={() =>
                  setPendingBlock({
                    type: 'chart',
                    config: { chart: 'breakdown', dimension: 'channel', query, title: `Channels — ${periodLabel}` },
                  })
                }
              >
                <BreakdownBars
                  rows={channels.data.rows.map((r) => ({
                    key: r.key,
                    label: r.label,
                    value: r.netSales,
                    previous: r.previousNetSales,
                  }))}
                  format={(v) => money(v, { compact: true })}
                />
              </ChartContainer>
            )}
          </div>
        </>
      )}

      <KpiDetailDialog
        kpi={inspecting}
        query={query}
        comparisonRange={summary.data?.comparisonRange ?? null}
        onClose={() => setInspecting(null)}
      />
      <AddToReportDialog open={pendingBlock !== null} onClose={() => setPendingBlock(null)} block={pendingBlock} />
    </div>
  );
}
