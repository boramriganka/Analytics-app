import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../../lib/useApi';
import { RangePicker, StatTile, Card, StatusChip, Skeleton, ErrorNote } from '../../components/ui';
import RevenueChart from '../../components/charts/RevenueChart';
import CategoryBars from '../../components/charts/CategoryBars';
import ChannelDonut from '../../components/charts/ChannelDonut';
import { money, num, timeAgo } from '../../lib/format';

const RANGE_LABEL = { '7d': 'last 7 days', '30d': 'last 30 days', '90d': 'last 90 days', '12m': 'trailing 12 months', all: 'all time' };

export default function Overview() {
  const [range, setRange] = useState('30d');
  const summary = useApi(`/analytics/summary?range=${range}`);
  const revenue = useApi(`/analytics/revenue?range=${range}`);
  const categories = useApi(`/analytics/categories?range=${range}`);
  const channels = useApi(`/analytics/channels?range=${range}`);
  const topProducts = useApi(`/analytics/products/top?range=${range}&limit=5`);
  const topCustomers = useApi(`/analytics/customers/top?range=${range}&limit=5`);
  const recent = useApi('/analytics/orders/recent?limit=7');

  const s = summary.data;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-fog">Business performance, {RANGE_LABEL[range]}.</p>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {/* KPI tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {summary.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px]" />)
        ) : summary.error ? (
          <div className="col-span-full"><ErrorNote error={summary.error} retry={summary.retry} /></div>
        ) : (
          <>
            <StatTile label="Net revenue" value={s.revenue} delta={s.deltas?.revenue} />
            <StatTile label="Orders" value={s.orders} delta={s.deltas?.orders} format="num" />
            <StatTile label="Units sold" value={s.units} delta={s.deltas?.units} format="num" />
            <StatTile label="Refunded" value={s.refundAmount} delta={s.deltas?.refundAmount} goodWhenUp={false} />
          </>
        )}
      </div>

      {/* Revenue + channels */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card
          title="Net revenue"
          subtitle={revenue.data ? `by ${revenue.data.granularity}` : ' '}
          className="xl:col-span-2"
        >
          {revenue.loading ? (
            <Skeleton className="m-5 h-64" />
          ) : revenue.error ? (
            <div className="p-5"><ErrorNote error={revenue.error} retry={revenue.retry} /></div>
          ) : (
            <RevenueChart series={revenue.data.series} granularity={revenue.data.granularity} />
          )}
        </Card>

        <Card title="Channel split" subtitle="share of completed revenue">
          {channels.loading ? (
            <Skeleton className="m-5 h-64" />
          ) : channels.error ? (
            <div className="p-5"><ErrorNote error={channels.error} retry={channels.retry} /></div>
          ) : (
            <ChannelDonut channels={channels.data.channels} />
          )}
        </Card>
      </div>

      {/* Categories + top products + top customers */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Revenue by category" subtitle="completed orders only">
          {categories.loading ? (
            <Skeleton className="m-5 h-56" />
          ) : categories.error ? (
            <div className="p-5"><ErrorNote error={categories.error} retry={categories.retry} /></div>
          ) : (
            <CategoryBars categories={categories.data.categories} />
          )}
        </Card>

        <Card title="Top products" subtitle="by revenue">
          {topProducts.loading ? (
            <Skeleton className="m-5 h-56" />
          ) : topProducts.error ? (
            <div className="p-5"><ErrorNote error={topProducts.error} retry={topProducts.retry} /></div>
          ) : (
            <RankList
              items={topProducts.data.products.map((p) => ({
                id: p.id, title: p.name, sub: p.category, value: p.revenue,
              }))}
            />
          )}
        </Card>

        <Card title="Top customers" subtitle="by revenue">
          {topCustomers.loading ? (
            <Skeleton className="m-5 h-56" />
          ) : topCustomers.error ? (
            <div className="p-5"><ErrorNote error={topCustomers.error} retry={topCustomers.retry} /></div>
          ) : (
            <RankList
              items={topCustomers.data.customers.map((c) => ({
                id: c.id, title: c.name, sub: `${c.city}, ${c.country}`, value: c.revenue,
              }))}
            />
          )}
        </Card>
      </div>

      {/* Recent orders */}
      <Card title="Recent orders" subtitle="latest activity across all channels" className="mt-4">
        {recent.loading ? (
          <Skeleton className="m-5 h-48" />
        ) : recent.error ? (
          <div className="p-5"><ErrorNote error={recent.error} retry={recent.retry} /></div>
        ) : (
          <div className="overflow-x-auto px-2 pb-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ash">
                  <th className="px-3 py-2.5 font-medium">Order</th>
                  <th className="px-3 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 font-medium">Channel</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium">Items</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th className="px-3 py-2.5 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {recent.data.orders.map((o) => (
                  <tr key={o.id} className="border-t border-hairline transition-colors hover:bg-raised/50">
                    <td className="tabular px-3 py-2.5 text-fog">#{o.id}</td>
                    <td className="px-3 py-2.5">{o.customer}</td>
                    <td className="px-3 py-2.5 text-fog capitalize">{o.channel}</td>
                    <td className="px-3 py-2.5"><StatusChip status={o.status} /></td>
                    <td className="tabular px-3 py-2.5 text-right text-fog">{num(o.items)}</td>
                    <td className="tabular px-3 py-2.5 text-right font-medium">{money(o.total)}</td>
                    <td className="tabular px-3 py-2.5 text-right text-ash">{timeAgo(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function RankList({ items }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ol className="space-y-1 px-3 pb-4">
      {items.map((item, idx) => (
        <li key={item.id} className="rounded-xl px-2 py-2 transition-colors hover:bg-raised/50">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display w-4 text-xs text-ash">{idx + 1}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-ash">{item.sub}</p>
            </div>
            <span className="tabular ml-auto text-sm font-medium">{money(item.value, { compact: true })}</span>
          </div>
          <div className="mt-1.5 ml-6.5 h-1 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-series-1"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
