import { motion } from 'framer-motion';
import { useApi } from '../../lib/useApi';
import { Card, StatusChip, Skeleton, ErrorNote } from '../../components/ui';
import { money, num, timeAgo } from '../../lib/format';

export default function Orders() {
  const { data, error, loading, retry } = useApi('/analytics/orders/recent?limit=50');

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-fog">The 50 most recent orders across every channel.</p>

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
                  <th className="px-3 py-2.5 font-medium">Order</th>
                  <th className="px-3 py-2.5 font-medium">Customer</th>
                  <th className="px-3 py-2.5 font-medium">Channel</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-right font-medium">Items</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  <th className="px-3 py-2.5 text-right font-medium">Placed</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id} className="border-t border-hairline transition-colors hover:bg-raised/50">
                    <td className="tabular px-3 py-2.5 text-fog">#{o.id}</td>
                    <td className="px-3 py-2.5 font-medium">{o.customer}</td>
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
