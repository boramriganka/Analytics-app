import { Link } from 'react-router-dom';
import { FilterBar } from '../../features/filters/FilterBar';
import { useFilters } from '../../lib/filters';
import { useCustomerStats } from '../../lib/queries';
import { ChartContainer } from '../../design/ChartContainer';
import { InsightStrip } from '../../features/insights/InsightStrip';
import { Skeleton, ErrorState, EmptyState } from '../../design/primitives';
import { chart } from '../../features/charts/palette';
import { money, num, pct, rangeLabel, isoDate } from '../../lib/format';

export default function Customers() {
  const { filters, query } = useFilters();
  const stats = useCustomerStats(query);
  const periodLabel = rangeLabel(filters.from, filters.to);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <FilterBar title="Customers" lede={`Who bought, and who came back — ${periodLabel}.`} />

      {stats.isError ? (
        <ErrorState message={(stats.error as Error).message} retry={() => stats.refetch()} />
      ) : stats.isLoading || !stats.data ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-72" />
        </div>
      ) : !stats.data.identified ? (
        <EmptyState
          title="No identified customers in this period"
          body="Customer analytics needs a customer ID column (an email works well). Map one on your next import to unlock new-vs-returning, repeat rate and lifetime value."
          action={
            <Link to="/onboarding/import" className="rounded-[var(--radius-control)] bg-signal px-4 py-2 text-sm font-medium text-white hover:bg-signal-ink">
              Import data
            </Link>
          }
        />
      ) : (
        <CustomerBody statsData={stats.data} periodLabel={periodLabel} query={query} />
      )}
    </div>
  );
}

function CustomerBody({
  statsData: d,
  periodLabel,
  query,
}: {
  statsData: NonNullable<ReturnType<typeof useCustomerStats>['data']>;
  periodLabel: string;
  query: string;
}) {
  const totalCustomers = d.newCustomers + d.returningCustomers;
  const totalRevenue = d.newRevenue + d.returningRevenue;
  const returningRevShare = totalRevenue > 0 ? d.returningRevenue / totalRevenue : 0;
  const returningCountShare = totalCustomers > 0 ? d.returningCustomers / totalCustomers : 0;

  return (
    <>
      {/* headline split */}
      <section aria-label="Customer split" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Customers" value={num(totalCustomers)} hint={`${num(d.newCustomers)} new · ${num(d.returningCustomers)} returning`} />
        <Stat label="Returning share of revenue" value={pct(returningRevShare)} hint={`from ${pct(returningCountShare)} of customers`} />
        <Stat label="Repeat purchase rate" value={pct(d.repeatPurchaseRate)} hint="bought 2+ times within the period" />
        <Stat label="Revenue per customer" value={totalCustomers ? money(totalRevenue / totalCustomers) : '—'} hint="identified customers only" />
      </section>

      {/* new vs returning — two entities, side-by-side bars with direct labels */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartContainer
          title="New vs returning"
          subtitle="customers and the revenue they generated"
          summary={`In ${periodLabel}, ${num(d.newCustomers)} new customers generated ${money(d.newRevenue)} and ${num(d.returningCustomers)} returning customers generated ${money(d.returningRevenue)}.`}
          csvName="new-vs-returning.csv"
          columns={[
            { key: 'segment', label: 'Segment' },
            { key: 'customers', label: 'Customers', numeric: true },
            { key: 'revenue', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
          ]}
          rows={[
            { segment: 'New', customers: d.newCustomers, revenue: d.newRevenue },
            { segment: 'Returning', customers: d.returningCustomers, revenue: d.returningRevenue },
          ]}
        >
          <div className="space-y-5 px-4 py-4 sm:px-5">
            <SplitBar
              title="Share of customers"
              a={{ label: 'New', value: d.newCustomers, color: chart.trio[1]! }}
              b={{ label: 'Returning', value: d.returningCustomers, color: chart.trio[0]! }}
              format={num}
            />
            <SplitBar
              title="Share of net sales"
              a={{ label: 'New', value: d.newRevenue, color: chart.trio[1]! }}
              b={{ label: 'Returning', value: d.returningRevenue, color: chart.trio[0]! }}
              format={(v) => money(v, { compact: true })}
            />
            <p className="text-xs leading-relaxed text-ink-3">
              A customer counts as returning if they purchased before the selected period began.
            </p>
          </div>
        </ChartContainer>

        {/* value distribution */}
        <ChartContainer
          title="Customer value distribution"
          subtitle="net sales per customer within the period"
          summary={`Distribution of customers across spend bands for ${periodLabel}.`}
          csvName="value-bands.csv"
          columns={[
            { key: 'band', label: 'Spend band' },
            { key: 'customers', label: 'Customers', numeric: true },
            { key: 'revenue', label: 'Net sales', numeric: true, format: (v) => money(v as number) },
          ]}
          rows={d.valueBands}
        >
          <ol className="flex flex-col gap-2.5 px-4 py-4 sm:px-5">
            {d.valueBands.map((band) => {
              const max = Math.max(...d.valueBands.map((b) => b.customers), 1);
              return (
                <li key={band.band}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-mono text-xs text-ink-2">{band.band}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="tabular text-xs text-ink-3">{money(band.revenue, { compact: true })}</span>
                      <span className="tabular font-medium text-ink">{num(band.customers)}</span>
                    </span>
                  </div>
                  <div className="h-[7px] overflow-hidden rounded-sm bg-well" aria-hidden="true">
                    <div className="h-full rounded-sm bg-signal" style={{ width: `${(band.customers / max) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
        </ChartContainer>
      </div>

      <InsightStrip query={query} include={(id) => id.startsWith('returning') || id.startsWith('aov')} periodLabel={periodLabel} />

      {/* top customers */}
      <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-panel" aria-label="Top customers">
        <h2 className="border-b border-line px-4 py-3 text-[15px] font-semibold text-ink sm:px-5">Top customers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-3">
                <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Customer</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Orders</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Net sales</th>
                <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">First seen</th>
                <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Last order</th>
              </tr>
            </thead>
            <tbody>
              {d.topCustomers.map((c) => (
                <tr key={c.customerId} className="border-b border-line/60 last:border-0 hover:bg-well/40">
                  <td className="px-4 py-2.5 sm:px-5">
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="ml-2 font-mono text-[10px] text-ink-3">{c.customerId}</span>
                  </td>
                  <td className="tabular px-4 py-2.5 text-right">{num(c.orders)}</td>
                  <td className="tabular px-4 py-2.5 text-right font-medium">{money(c.netSales)}</td>
                  <td className="tabular hidden px-4 py-2.5 text-right text-xs text-ink-3 sm:table-cell">{isoDate(c.firstSeen)}</td>
                  <td className="tabular hidden px-4 py-2.5 text-right text-xs text-ink-3 sm:table-cell">{isoDate(c.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-panel p-4">
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className="tabular mt-1.5 text-[1.55rem] leading-none font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-2 text-[11px] text-ink-3">{hint}</p>}
    </div>
  );
}

/** Two-segment share bar with direct labels — identity is never color-alone. */
function SplitBar({
  title, a, b, format,
}: {
  title: string;
  a: { label: string; value: number; color: string };
  b: { label: string; value: number; color: string };
  format: (v: number) => string;
}) {
  const total = a.value + b.value || 1;
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink">{title}</p>
      <div className="flex h-5 overflow-hidden rounded-sm" role="img" aria-label={`${title}: ${a.label} ${format(a.value)}, ${b.label} ${format(b.value)}`}>
        <div style={{ width: `${(a.value / total) * 100}%`, background: a.color }} className="border-r-2 border-panel" />
        <div style={{ width: `${(b.value / total) * 100}%`, background: b.color }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: a.color }} aria-hidden="true" />
          {a.label} · <span className="tabular">{format(a.value)}</span> ({pct(a.value / total)})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: b.color }} aria-hidden="true" />
          {b.label} · <span className="tabular">{format(b.value)}</span> ({pct(b.value / total)})
        </span>
      </div>
    </div>
  );
}
