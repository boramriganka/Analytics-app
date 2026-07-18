import { useMemo } from 'react';
import { FilterBar } from '../../features/filters/FilterBar';
import { useFilters } from '../../lib/filters';
import { useSummary, useTimeseries, useBreakdown } from '../../lib/queries';
import { ChartContainer } from '../../design/ChartContainer';
import { InsightStrip } from '../../features/insights/InsightStrip';
import { Metric } from '../../design/Metric';
import { KPI_META } from '../../features/kpi/kpiMeta';
import { Skeleton, ErrorState, EmptyState } from '../../design/primitives';
import { chart, FONT_MONO } from '../../features/charts/palette';
import { money, num, pct, rangeLabel, shortDate } from '../../lib/format';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { SigTooltip } from '../../features/charts/recharts';

export default function Refunds() {
  const { filters, query } = useFilters();
  const summary = useSummary(query);
  const timeseries = useTimeseries(query);
  const byProduct = useBreakdown(query, 'product', 200);
  const byCategory = useBreakdown(query, 'category');
  const byChannel = useBreakdown(query, 'channel');
  const periodLabel = rangeLabel(filters.from, filters.to);

  const rateSeries = useMemo(
    () =>
      (timeseries.data?.series ?? []).map((b) => ({
        period: b.period,
        rate: b.grossSales > 0 ? b.refunds / b.grossSales : 0,
        refunds: b.refunds,
      })),
    [timeseries.data]
  );

  const elevated = useMemo(() => {
    const rows = (byProduct.data?.rows ?? [])
      .filter((r) => r.grossSales >= 300)
      .map((r) => ({ ...r, rate: r.refunds / r.grossSales }))
      .filter((r) => r.refunds > 0)
      .sort((a, b) => b.refunds - a.refunds)
      .slice(0, 8);
    return rows;
  }, [byProduct.data]);

  const refundValue = summary.data
    ? (timeseries.data?.series ?? []).reduce((a, b) => a + b.refunds, 0)
    : 0;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <FilterBar title="Refunds" lede={`What came back, and where it concentrates — ${periodLabel}.`} />

      {summary.isError ? (
        <ErrorState message={(summary.error as Error).message} retry={() => summary.refetch()} />
      ) : summary.isLoading || !summary.data ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-72" />
        </div>
      ) : refundValue === 0 ? (
        <EmptyState title="No refunds in this period" body="Either genuinely none happened, or the imported data has no refund column." />
      ) : (
        <>
          <section aria-label="Refund metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Metric kpi={summary.data.kpis.find((k) => k.key === 'refundRate')!} meta={KPI_META.refundRate} />
            <div className="rounded-[var(--radius-card)] border border-line bg-panel p-4">
              <p className="text-[13px] text-ink-2">Refunded value</p>
              <p className="tabular mt-1.5 text-[1.55rem] leading-none font-semibold tracking-tight text-ink">{money(refundValue)}</p>
              <p className="mt-2 text-[11px] text-ink-3">across the selected period and filters</p>
            </div>
            <Metric kpi={summary.data.kpis.find((k) => k.key === 'netSales')!} meta={KPI_META.netSales} compact />
          </section>

          <InsightStrip query={query} include={(id) => id.startsWith('refund')} periodLabel={periodLabel} max={2} />

          {/* refund rate over time */}
          {rateSeries.length > 1 && (
            <div className="mt-4">
              <ChartContainer
                title="Refund rate over time"
                subtitle={`refunded value as a share of gross, by ${timeseries.data?.granularity}`}
                summary={`Refund rate over time for ${periodLabel}.`}
                csvName="refund-rate.csv"
                columns={[
                  { key: 'period', label: 'Period' },
                  { key: 'rate', label: 'Refund rate', numeric: true, format: (v) => pct(v as number) },
                  { key: 'refunds', label: 'Refunded value', numeric: true, format: (v) => money(v as number) },
                ]}
                rows={rateSeries}
              >
                <div className="h-64 px-2">
                  <ResponsiveContainer>
                    <LineChart data={rateSeries} margin={{ top: 12, right: 14, bottom: 4, left: 4 }}>
                      <CartesianGrid stroke={chart.grid} vertical={false} />
                      <XAxis dataKey="period" tick={{ fill: chart.ink3, fontSize: 10, fontFamily: FONT_MONO }} tickLine={false} axisLine={{ stroke: chart.line2 }} tickFormatter={shortDate} minTickGap={40} />
                      <YAxis tick={{ fill: chart.ink3, fontSize: 10, fontFamily: FONT_MONO }} tickLine={false} axisLine={false} tickFormatter={(v) => pct(v)} width={44} />
                      <Tooltip
                        content={<SigTooltip formatLabel={shortDate} moneyValues={false} />}
                        formatter={(v: number) => pct(v)}
                        cursor={{ stroke: chart.ink3, strokeDasharray: '3 3' }}
                      />
                      <Line type="monotone" dataKey="rate" name="Refund rate" stroke={chart.down} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: chart.panel, strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>
            </div>
          )}

          {/* elevated products + category/channel rates */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-[var(--radius-card)] border border-line bg-panel" aria-label="Products with elevated refunds">
              <h2 className="border-b border-line px-4 py-3 text-[15px] font-semibold text-ink sm:px-5">Products driving refunds</h2>
              {elevated.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-3 sm:px-5">No product has meaningful refund value in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-ink-3">
                        <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Product</th>
                        <th scope="col" className="px-4 py-2.5 text-right font-medium">Refunded</th>
                        <th scope="col" className="px-4 py-2.5 text-right font-medium">Refund rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {elevated.map((r) => (
                        <tr key={r.key} className="border-b border-line/60 last:border-0">
                          <td className="max-w-48 truncate px-4 py-2.5 font-medium text-ink sm:px-5">{r.label}</td>
                          <td className="tabular px-4 py-2.5 text-right">{money(r.refunds)}</td>
                          <td className={`tabular px-4 py-2.5 text-right ${r.rate > 0.08 ? 'font-semibold text-down' : 'text-ink-2'}`}>{pct(r.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="flex flex-col gap-4">
              <RateList title="Refund rate by category" rows={byCategory.data?.rows ?? []} />
              <RateList title="Refund rate by channel" rows={byChannel.data?.rows ?? []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RateList({ title, rows }: { title: string; rows: { key: string; label: string; refunds: number; grossSales: number }[] }) {
  const withRate = rows
    .filter((r) => r.grossSales > 0)
    .map((r) => ({ ...r, rate: r.refunds / r.grossSales }))
    .sort((a, b) => b.rate - a.rate);
  const max = Math.max(...withRate.map((r) => r.rate), 0.001);
  if (withRate.length === 0) return null;
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-panel" aria-label={title}>
      <h2 className="border-b border-line px-4 py-3 text-[15px] font-semibold text-ink sm:px-5">{title}</h2>
      <ol className="flex flex-col gap-2.5 px-4 py-3.5 sm:px-5">
        {withRate.slice(0, 6).map((r) => (
          <li key={r.key}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="min-w-0 truncate text-ink capitalize">{r.label}</span>
              <span className="flex items-baseline gap-2">
                <span className="tabular text-xs text-ink-3">{money(r.refunds, { compact: true })}</span>
                <span className={`tabular font-medium ${r.rate > 0.08 ? 'text-down' : 'text-ink'}`}>{pct(r.rate)}</span>
              </span>
            </div>
            <div className="h-[6px] overflow-hidden rounded-sm bg-well" aria-hidden="true">
              <div className="h-full rounded-sm" style={{ width: `${(r.rate / max) * 100}%`, background: r.rate > 0.08 ? chart.down : '#d98984' }} />
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t border-line px-4 pt-2 pb-2.5 text-[11px] text-ink-3 sm:px-5">{num(withRate.length)} groups · refunded share of gross sales</p>
    </section>
  );
}
