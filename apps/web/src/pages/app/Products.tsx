import { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { FilterBar } from '../../features/filters/FilterBar';
import { useFilters } from '../../lib/filters';
import { useBreakdown } from '../../lib/queries';
import { ChartContainer, downloadCsv, type ChartColumn } from '../../design/ChartContainer';
import { BreakdownBars } from '../../features/charts/BreakdownBars';
import { InsightStrip } from '../../features/insights/InsightStrip';
import { AddToReportDialog, type PendingBlock } from '../../features/reports/AddToReportDialog';
import { Skeleton, ErrorState, EmptyState, Button } from '../../design/primitives';
import { money, num, pct, rangeLabel } from '../../lib/format';
import type { BreakdownRow } from '@signalroom/schemas';

type SortKey = 'netSales' | 'units' | 'orders' | 'refunds' | 'margin' | 'delta';

export default function Products() {
  const { filters, query } = useFilters();
  const products = useBreakdown(query, 'product', 200);
  const categories = useBreakdown(query, 'category');
  const [pending, setPending] = useState<PendingBlock | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('netSales');
  const [sortDir, setSortDir] = useState<-1 | 1>(-1);
  const periodLabel = rangeLabel(filters.from, filters.to);

  const rows = useMemo(() => {
    const list = (products.data?.rows ?? []).map((r) => ({
      ...r,
      margin: r.cost !== null && r.netSales > 0 ? (r.netSales - r.cost) / r.netSales : null,
      delta: r.previousNetSales !== null && r.previousNetSales > 0 ? (r.netSales - r.previousNetSales) / r.previousNetSales : null,
    }));
    const val = (r: (typeof list)[number]) => {
      const v = r[sortKey];
      return v === null || v === undefined ? -Infinity : (v as number);
    };
    return list.sort((a, b) => (val(b) - val(a)) * -sortDir * -1);
  }, [products.data, sortKey, sortDir]);

  const movers = useMemo(() => {
    const eligible = rows.filter((r) => r.previousNetSales !== null && (r.netSales >= 200 || (r.previousNetSales ?? 0) >= 200));
    const withDelta = eligible.map((r) => ({ ...r, absDelta: r.netSales - (r.previousNetSales ?? 0) }));
    const growing = [...withDelta].sort((a, b) => b.absDelta - a.absDelta).filter((r) => r.absDelta > 0).slice(0, 5);
    const declining = [...withDelta].sort((a, b) => a.absDelta - b.absDelta).filter((r) => r.absDelta < 0).slice(0, 5);
    return { growing, declining };
  }, [rows]);

  const hasCost = rows.some((r) => r.margin !== null);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === -1 ? 1 : -1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  const tableColumns: ChartColumn[] = [
    { key: 'label', label: 'Product' },
    { key: 'netSales', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
    { key: 'units', label: 'Units', numeric: true, format: (v) => num(v as number) },
    { key: 'orders', label: 'Orders', numeric: true, format: (v) => num(v as number) },
    { key: 'refunds', label: 'Refunds', numeric: true, format: (v) => money(v as number) },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <FilterBar title="Products" lede={`What sold, what grew, what slipped — ${periodLabel}.`} />

      {products.isError ? (
        <ErrorState message={(products.error as Error).message} retry={() => products.refetch()} />
      ) : products.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-96" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No products in this period" body="Widen the date range or remove a filter." />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* top products */}
            <ChartContainer
              title="Top products"
              subtitle="by net sales, with change vs comparison"
              summary={`Top products by net sales for ${periodLabel}.`}
              csvName="top-products.csv"
              columns={tableColumns}
              rows={rows.slice(0, 10) as unknown as Record<string, unknown>[]}
              onAddToReport={() =>
                setPending({ type: 'chart', config: { chart: 'breakdown', dimension: 'product', query, title: `Top products — ${periodLabel}` } })
              }
            >
              <BreakdownBars
                rows={rows.slice(0, 10).map((r) => ({ key: r.key, label: r.label, value: r.netSales, previous: r.previousNetSales }))}
                format={(v) => money(v, { compact: true })}
                maxBars={10}
              />
            </ChartContainer>

            {/* category performance */}
            {categories.data && (
              <ChartContainer
                title="Category performance"
                subtitle="net sales by category"
                summary={`Net sales by category for ${periodLabel}.`}
                csvName="category-performance.csv"
                columns={[
                  { key: 'label', label: 'Category' },
                  { key: 'netSales', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
                  { key: 'units', label: 'Units', numeric: true, format: (v) => num(v as number) },
                  { key: 'refunds', label: 'Refunds', numeric: true, format: (v) => money(v as number) },
                ]}
                rows={categories.data.rows}
                onAddToReport={() =>
                  setPending({ type: 'chart', config: { chart: 'breakdown', dimension: 'category', query, title: `Categories — ${periodLabel}` } })
                }
              >
                <BreakdownBars
                  rows={categories.data.rows.map((r) => ({ key: r.key, label: r.label, value: r.netSales, previous: r.previousNetSales }))}
                  format={(v) => money(v, { compact: true })}
                />
              </ChartContainer>
            )}
          </div>

          {/* growth & decline */}
          {(movers.growing.length > 0 || movers.declining.length > 0) && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <MoversList
                title="Growing"
                icon={<TrendingUp size={14} className="text-up" aria-hidden="true" />}
                items={movers.growing.map((r) => ({ label: r.label, delta: r.absDelta, pctDelta: r.delta }))}
                tone="up"
              />
              <MoversList
                title="Declining"
                icon={<TrendingDown size={14} className="text-down" aria-hidden="true" />}
                items={movers.declining.map((r) => ({ label: r.label, delta: r.absDelta, pctDelta: r.delta }))}
                tone="down"
              />
            </div>
          )}

          <InsightStrip query={query} include={(id) => id.startsWith('net-sales')} periodLabel={periodLabel} />

          {/* full table */}
          <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-panel" aria-label="All products">
            <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">All products</h2>
                <p className="mt-0.5 text-xs text-ink-3">Click a column to sort. {hasCost ? 'Margin uses rows with cost data.' : 'Add a cost column on import to unlock margin.'}</p>
              </div>
              <Button size="sm" onClick={() => downloadCsv('products.csv', tableColumns, rows as unknown as Record<string, unknown>[])}>
                Download CSV
              </Button>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-3">
                    <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Product</th>
                    <SortableTh label="Net sales" k="netSales" current={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableTh label="Δ vs prior" k="delta" current={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableTh label="Units" k="units" current={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableTh label="Orders" k="orders" current={sortKey} dir={sortDir} onSort={toggleSort} />
                    <SortableTh label="Refunds" k="refunds" current={sortKey} dir={sortDir} onSort={toggleSort} />
                    {hasCost && <SortableTh label="Margin" k="margin" current={sortKey} dir={sortDir} onSort={toggleSort} />}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r) => (
                    <tr key={r.key} className="border-b border-line/60 last:border-0 hover:bg-well/40">
                      <td className="max-w-52 truncate px-4 py-2.5 font-medium text-ink sm:px-5">{r.label}</td>
                      <td className="tabular px-4 py-2.5 text-right">{money(r.netSales)}</td>
                      <td className={`tabular px-4 py-2.5 text-right font-mono text-xs ${r.delta === null ? 'text-ink-3' : r.delta > 0.005 ? 'text-up' : r.delta < -0.005 ? 'text-down' : 'text-ink-3'}`}>
                        {r.delta === null ? '—' : pct(r.delta, { signed: true })}
                      </td>
                      <td className="tabular px-4 py-2.5 text-right">{num(r.units)}</td>
                      <td className="tabular px-4 py-2.5 text-right">{num(r.orders)}</td>
                      <td className="tabular px-4 py-2.5 text-right text-ink-2">{money(r.refunds)}</td>
                      {hasCost && <td className="tabular px-4 py-2.5 text-right">{r.margin === null ? '—' : pct(r.margin)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 100 && (
              <p className="border-t border-line px-4 py-2 text-[11px] text-ink-3 sm:px-5">
                Showing the top 100 of {rows.length} — the CSV download contains all of them.
              </p>
            )}
          </section>
        </>
      )}
      <AddToReportDialog open={pending !== null} onClose={() => setPending(null)} block={pending} />
    </div>
  );
}

function SortableTh({ label, k, current, dir, onSort }: { label: string; k: SortKey; current: SortKey; dir: -1 | 1; onSort: (k: SortKey) => void }) {
  const active = current === k;
  return (
    <th scope="col" className="px-4 py-2.5 text-right font-medium" aria-sort={active ? (dir === -1 ? 'descending' : 'ascending') : undefined}>
      <button onClick={() => onSort(k)} className={`inline-flex items-center gap-0.5 ${active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}>
        {label}
        <span aria-hidden="true" className="font-mono text-[9px]">{active ? (dir === -1 ? '▼' : '▲') : ''}</span>
      </button>
    </th>
  );
}

function MoversList({ title, icon, items, tone }: {
  title: string;
  icon: React.ReactNode;
  items: { label: string; delta: number; pctDelta: number | null }[];
  tone: 'up' | 'down';
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-panel" aria-label={`${title} products`}>
      <h2 className="flex items-center gap-1.5 border-b border-line px-4 py-3 text-[15px] font-semibold text-ink sm:px-5">
        {icon} {title}
      </h2>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-3 sm:px-5">Nothing meaningful moved {tone === 'up' ? 'up' : 'down'} vs the comparison period.</p>
      ) : (
        <ol className="divide-y divide-line/60">
          {items.map((item) => (
            <li key={item.label} className="flex items-baseline justify-between gap-3 px-4 py-2.5 sm:px-5">
              <span className="min-w-0 truncate text-sm font-medium text-ink">{item.label}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                {item.pctDelta !== null && (
                  <span className={`font-mono text-[11px] ${tone === 'up' ? 'text-up' : 'text-down'}`}>{pct(item.pctDelta, { signed: true })}</span>
                )}
                <span className={`tabular text-sm font-semibold ${tone === 'up' ? 'text-up' : 'text-down'}`}>
                  {item.delta > 0 ? '+' : '−'}{money(Math.abs(item.delta), { compact: true })}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
