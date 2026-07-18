import { useState } from 'react';
import { FilterBar } from '../../features/filters/FilterBar';
import { useFilters } from '../../lib/filters';
import { useSummary, useTimeseries, useBreakdown } from '../../lib/queries';
import { ChartContainer } from '../../design/ChartContainer';
import { TwoLineChart, CycleColumns } from '../../features/charts/recharts';
import { InsightStrip } from '../../features/insights/InsightStrip';
import { AddToReportDialog, type PendingBlock } from '../../features/reports/AddToReportDialog';
import { Metric } from '../../design/Metric';
import { KPI_META } from '../../features/kpi/kpiMeta';
import { Skeleton, ErrorState } from '../../design/primitives';
import { money, num, pct, rangeLabel } from '../../lib/format';

const SALES_INSIGHTS = (id: string) =>
  id.startsWith('net-sales') || id.startsWith('discount') || id.startsWith('aov') || id.startsWith('weekday');

export default function Sales() {
  const { filters, query } = useFilters();
  const summary = useSummary(query);
  const timeseries = useTimeseries(query);
  const byDow = useBreakdown(query, 'dayOfWeek');
  const byHour = useBreakdown(query, 'hourOfDay');
  const [pending, setPending] = useState<PendingBlock | null>(null);
  const periodLabel = rangeLabel(filters.from, filters.to);

  const bridge = summary.data
    ? (() => {
        const k = (key: string) => summary.data.kpis.find((x) => x.key === key)?.current ?? 0;
        return { gross: k('grossSales'), net: k('netSales') };
      })()
    : null;
  const totals = timeseries.data?.series.reduce(
    (acc, b) => ({ discounts: acc.discounts + b.discounts, refunds: acc.refunds + b.refunds }),
    { discounts: 0, refunds: 0 }
  );

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <FilterBar title="Sales" lede={`Revenue shape and rhythm, ${periodLabel}.`} />

      {summary.isError ? (
        <ErrorState message={(summary.error as Error).message} retry={() => summary.refetch()} />
      ) : (
        <>
          {/* headline metrics */}
          <section aria-label="Sales metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {summary.isLoading || !summary.data
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px]" />)
              : (['netSales', 'grossSales', 'discountRate', 'refundRate'] as const).map((key) => {
                  const kpi = summary.data.kpis.find((x) => x.key === key)!;
                  return <Metric key={key} kpi={kpi} meta={KPI_META[key]} />;
                })}
          </section>

          {/* gross vs net over time */}
          <div className="mt-4">
            {timeseries.isLoading ? (
              <Skeleton className="h-[340px]" />
            ) : timeseries.data && timeseries.data.series.length > 0 ? (
              <ChartContainer
                title="Gross vs net sales"
                subtitle={`by ${timeseries.data.granularity} · the gap is discounts and refunds`}
                summary={`Gross and net sales by ${timeseries.data.granularity} for ${periodLabel}. The vertical gap between the lines is the value lost to discounts and refunds.`}
                csvName="gross-vs-net.csv"
                columns={[
                  { key: 'period', label: 'Period' },
                  { key: 'grossSales', label: 'Gross', numeric: true, format: (v) => money(v as number) },
                  { key: 'netSales', label: 'Net', numeric: true, format: (v) => money(v as number) },
                  { key: 'discounts', label: 'Discounts', numeric: true, format: (v) => money(v as number) },
                  { key: 'refunds', label: 'Refunds', numeric: true, format: (v) => money(v as number) },
                ]}
                rows={timeseries.data.series}
                onAddToReport={() =>
                  setPending({ type: 'chart', config: { chart: 'gross-net', query, title: `Gross vs net — ${periodLabel}` } })
                }
              >
                <TwoLineChart
                  data={timeseries.data.series}
                  xKey="period"
                  aKey="grossSales"
                  aLabel="Gross"
                  bKey="netSales"
                  bLabel="Net"
                />
              </ChartContainer>
            ) : null}
          </div>

          {/* discount & refund impact bridge */}
          {bridge && totals && bridge.gross > 0 && (
            <section aria-label="From gross to net" className="mt-4 rounded-[var(--radius-card)] border border-line bg-panel px-4 py-4 sm:px-5">
              <h2 className="text-[15px] font-semibold text-ink">Where gross became net</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <BridgeCell label="Gross sales" value={money(bridge.gross)} />
                <BridgeCell label="Discounts" value={`− ${money(totals.discounts)}`} sub={pct(totals.discounts / bridge.gross)} tone="down" />
                <BridgeCell label="Refunds" value={`− ${money(totals.refunds)}`} sub={pct(totals.refunds / bridge.gross)} tone="down" />
                <BridgeCell label="Net sales" value={money(bridge.net)} emphasis />
              </div>
            </section>
          )}

          <InsightStrip query={query} include={SALES_INSIGHTS} periodLabel={periodLabel} />

          {/* rhythm */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {byDow.data && byDow.data.rows.length > 0 && (
              <ChartContainer
                title="Day-of-week performance"
                subtitle="net sales by weekday, strongest day labeled"
                summary={`Net sales by day of week for ${periodLabel}.`}
                csvName="day-of-week.csv"
                columns={[
                  { key: 'label', label: 'Day' },
                  { key: 'netSales', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
                  { key: 'orders', label: 'Orders', numeric: true, format: (v) => num(v as number) },
                ]}
                rows={byDow.data.rows}
              >
                <CycleColumns data={byDow.data.rows} xKey="label" yKey="netSales" xTickFormat={(v) => v.slice(0, 3)} />
              </ChartContainer>
            )}
            {byHour.data && byHour.data.rows.length > 0 && (
              <ChartContainer
                title="Hour-of-day performance"
                subtitle="net sales by hour, peak labeled"
                summary={`Net sales by hour of day for ${periodLabel}.`}
                csvName="hour-of-day.csv"
                columns={[
                  { key: 'label', label: 'Hour' },
                  { key: 'netSales', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
                  { key: 'orders', label: 'Orders', numeric: true, format: (v) => num(v as number) },
                ]}
                rows={byHour.data.rows}
              >
                <CycleColumns data={byHour.data.rows} xKey="label" yKey="netSales" labelEvery={3} />
              </ChartContainer>
            )}
          </div>
        </>
      )}
      <AddToReportDialog open={pending !== null} onClose={() => setPending(null)} block={pending} />
    </div>
  );
}

function BridgeCell({ label, value, sub, tone, emphasis }: { label: string; value: string; sub?: string; tone?: 'down'; emphasis?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${emphasis ? 'border-signal/30 bg-signal-wash/50' : 'border-line bg-paper'}`}>
      <p className="text-xs text-ink-3">{label}</p>
      <p className={`tabular mt-1 text-lg font-semibold ${tone === 'down' ? 'text-down' : 'text-ink'}`}>{value}</p>
      {sub && <p className="tabular mt-0.5 font-mono text-[10px] text-ink-3">{sub} of gross</p>}
    </div>
  );
}
