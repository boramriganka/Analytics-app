import { motion } from 'framer-motion';
import { useApi } from '../../lib/useApi';
import { Card, Skeleton, ErrorNote } from '../../components/ui';
import { money, num, timeAgo } from '../../lib/format';

export default function Customers() {
  const { data, error, loading, retry } = useApi('/analytics/customers?limit=50');

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Customers</h1>
      <p className="mt-1 text-sm text-fog">Top 50 accounts by lifetime completed revenue.</p>

      <Card className="mt-6">
        {loading ? (
          <Skeleton className="m-5 h-96" />
        ) : error ? (
          <div className="p-5"><ErrorNote error={error} retry={retry} /></div>
        ) : (
          <div className="overflow-x-auto px-2 py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ash">
                  <th className="px-3 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 font-medium">Location</th>
                  <th className="px-3 py-2.5 text-right font-medium">Orders</th>
                  <th className="px-3 py-2.5 text-right font-medium">Lifetime revenue</th>
                  <th className="px-3 py-2.5 text-right font-medium">Last order</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr key={c.id} className="border-t border-hairline transition-colors hover:bg-raised/50">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-xs font-semibold text-fog">
                          {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="truncate text-xs text-ash">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-fog">{c.city}, {c.country}</td>
                    <td className="tabular px-3 py-2.5 text-right">{num(c.orders)}</td>
                    <td className="tabular px-3 py-2.5 text-right font-medium">{money(c.revenue)}</td>
                    <td className="tabular px-3 py-2.5 text-right text-ash">
                      {c.last_order ? timeAgo(c.last_order) : '—'}
                    </td>
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
