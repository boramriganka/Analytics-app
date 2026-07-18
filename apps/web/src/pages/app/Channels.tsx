import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FilterBar } from '../../features/filters/FilterBar';
import { useFilters } from '../../lib/filters';
import { useBreakdown } from '../../lib/queries';
import { useSession } from '../../lib/session';
import { api } from '../../lib/api';
import { ChartContainer } from '../../design/ChartContainer';
import { MultiLineChart } from '../../features/charts/recharts';
import { BreakdownBars } from '../../features/charts/BreakdownBars';
import { InsightStrip } from '../../features/insights/InsightStrip';
import { AddToReportDialog, type PendingBlock } from '../../features/reports/AddToReportDialog';
import { Skeleton, ErrorState } from '../../design/primitives';
import { money, num, pct, rangeLabel } from '../../lib/format';

interface TimeseriesBy {
  granularity: string;
  keys: string[];
  series: { period: string; values: Record<string, number>; other: number }[];
}

export default function Channels() {
  const { filters, query } = useFilters();
  const channels = useBreakdown(query, 'channel');
  const stores = useBreakdown(query, 'store');
  const { session } = useSession();
  const byTime = useQuery<TimeseriesBy>({
    queryKey: [session?.workspace.id, `/analytics/timeseries-by?${query}&dimension=channel`],
    queryFn: ({ signal }) => api(`/analytics/timeseries-by?${query}&dimension=channel`, { signal }),
    enabled: Boolean(session),
    staleTime: 60_000,
  });
  const [pending, setPending] = useState<PendingBlock | null>(null);
  const periodLabel = rangeLabel(filters.from, filters.to);

  const totalNet = channels.data?.rows.reduce((a, r) => a + r.netSales, 0) ?? 0;
  const prevTotal = channels.data?.rows.reduce((a, r) => a + (r.previousNetSales ?? 0), 0) ?? 0;

  const lineData =
    byTime.data?.series.map((p) => ({ period: p.period, ...p.values })) ?? [];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <FilterBar title="Channels & stores" lede={`Where revenue comes from, ${periodLabel}.`} />

      {channels.isError ? (
        <ErrorState message={(channels.error as Error).message} retry={() => channels.refetch()} />
      ) : channels.isLoading || !channels.data ? (
        <div className="space-y-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-80" />
        </div>
      ) : (
        <>
          {/* contribution + share shift table */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartContainer
              title="Channel contribution"
              subtitle="net sales share with change vs comparison"
              summary={`Net sales by channel for ${periodLabel}.`}
              csvName="channel-contribution.csv"
              columns={[
                { key: 'label', label: 'Channel' },
                { key: 'netSales', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
                { key: 'orders', label: 'Orders', numeric: true, format: (v) => num(v as number) },
              ]}
              rows={channels.data.rows}
              onAddToReport={() =>
                setPending({ type: 'chart', config: { chart: 'breakdown', dimension: 'channel', query, title: `Channels — ${periodLabel}` } })
              }
            >
              <BreakdownBars
                rows={channels.data.rows.map((r) => ({ key: r.key, label: r.label, value: r.netSales, previous: r.previousNetSales }))}
                format={(v) => money(v, { compact: true })}
              />
            </ChartContainer>

            <section className="rounded-[var(--radius-card)] border border-line bg-panel" aria-label="Cross-channel changes">
              <h2 className="border-b border-line px-4 py-3 text-[15px] font-semibold text-ink sm:px-5">Cross-channel changes</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-3">
                      <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Channel</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Share now</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Share before</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Δ share</th>
                      <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">AOV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.data.rows.map((r) => {
                      const share = totalNet > 0 ? r.netSales / totalNet : 0;
                      const prevShare = prevTotal > 0 && r.previousNetSales !== null ? r.previousNetSales / prevTotal : null;
                      const shift = prevShare !== null ? share - prevShare : null;
                      return (
                        <tr key={r.key} className="border-b border-line/60 last:border-0">
                          <td className="px-4 py-2.5 font-medium text-ink capitalize sm:px-5">{r.label}</td>
                          <td className="tabular px-4 py-2.5 text-right">{pct(share)}</td>
                          <td className="tabular px-4 py-2.5 text-right text-ink-2">{prevShare === null ? '—' : pct(prevShare)}</td>
                          <td className={`tabular px-4 py-2.5 text-right font-mono text-xs ${shift === null ? 'text-ink-3' : shift > 0.002 ? 'text-up' : shift < -0.002 ? 'text-down' : 'text-ink-3'}`}>
                            {shift === null ? '—' : `${shift > 0 ? '+' : ''}${(shift * 100).toFixed(1)}pt`}
                          </td>
                          <td className="tabular hidden px-4 py-2.5 text-right sm:table-cell">{r.orders ? money(r.netSales / r.orders) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-line px-4 py-2.5 text-[11px] leading-relaxed text-ink-3 sm:px-5">
                Share of net sales within each period. Δ is percentage points vs the comparison period.
              </p>
            </section>
          </div>

          {/* channel trend lines */}
          {byTime.data && byTime.data.series.length > 1 && (
            <div className="mt-4">
              <ChartContainer
                title="Channel trend"
                subtitle={`net sales by ${byTime.data.granularity}, top ${Math.min(3, byTime.data.keys.length)} channels`}
                summary={`Net sales per channel over time for ${periodLabel}.`}
                csvName="channel-trend.csv"
                columns={[
                  { key: 'period', label: 'Period' },
                  ...byTime.data.keys.map((k) => ({ key: k, label: k, numeric: true, format: (v: unknown) => money((v as number) ?? 0) })),
                ]}
                rows={lineData}
              >
                <MultiLineChart data={lineData} xKey="period" keys={byTime.data.keys} />
              </ChartContainer>
            </div>
          )}

          <InsightStrip query={query} include={(id) => id.startsWith('channel')} periodLabel={periodLabel} />

          {/* store comparison */}
          {stores.data && stores.data.rows.filter((r) => r.key !== 'No store').length > 0 && (
            <div className="mt-4">
              <ChartContainer
                title="Store comparison"
                subtitle="in-person locations by net sales"
                summary={`Net sales by store for ${periodLabel}.`}
                csvName="stores.csv"
                columns={[
                  { key: 'label', label: 'Store' },
                  { key: 'netSales', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
                  { key: 'orders', label: 'Orders', numeric: true, format: (v) => num(v as number) },
                ]}
                rows={stores.data.rows.filter((r) => r.key !== 'No store')}
                onAddToReport={() =>
                  setPending({ type: 'chart', config: { chart: 'breakdown', dimension: 'store', query, title: `Stores — ${periodLabel}` } })
                }
              >
                <BreakdownBars
                  rows={stores.data.rows
                    .filter((r) => r.key !== 'No store')
                    .map((r) => ({ key: r.key, label: r.label, value: r.netSales, previous: r.previousNetSales }))}
                  format={(v) => money(v, { compact: true })}
                />
              </ChartContainer>
            </div>
          )}
        </>
      )}
      <AddToReportDialog open={pending !== null} onClose={() => setPending(null)} block={pending} />
    </div>
  );
}
