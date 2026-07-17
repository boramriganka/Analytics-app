import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApi } from '../../lib/useApi';
import { Card, RangePicker, Skeleton, ErrorNote } from '../../components/ui';
import { money, num } from '../../lib/format';

export default function Products() {
  const [range, setRange] = useState('all');
  const { data, error, loading, retry } = useApi(`/analytics/products?range=${range}`);

  const maxRevenue = data ? Math.max(...data.products.map((p) => p.revenue), 1) : 1;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-fog">Catalog performance — units, revenue and margin per SKU.</p>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

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
                  <th className="px-3 py-2.5 font-medium">SKU</th>
                  <th className="px-3 py-2.5 font-medium">Product</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 text-right font-medium">Price</th>
                  <th className="px-3 py-2.5 text-right font-medium">Units</th>
                  <th className="px-3 py-2.5 text-right font-medium">Revenue</th>
                  <th className="px-3 py-2.5 text-right font-medium">Profit</th>
                  <th className="w-32 px-3 py-2.5 font-medium"><span className="sr-only">Revenue share</span></th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p) => (
                  <tr key={p.id} className="border-t border-hairline transition-colors hover:bg-raised/50">
                    <td className="tabular px-3 py-2.5 text-ash">{p.sku}</td>
                    <td className="px-3 py-2.5 font-medium">{p.name}</td>
                    <td className="px-3 py-2.5 text-fog">{p.category}</td>
                    <td className="tabular px-3 py-2.5 text-right text-fog">{money(p.price)}</td>
                    <td className="tabular px-3 py-2.5 text-right">{num(p.units)}</td>
                    <td className="tabular px-3 py-2.5 text-right font-medium">{money(p.revenue)}</td>
                    <td className="tabular px-3 py-2.5 text-right text-fog">{money(p.profit)}</td>
                    <td className="px-3 py-2.5">
                      <div className="h-1 overflow-hidden rounded-full bg-raised">
                        <div className="h-full rounded-full bg-series-1" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} />
                      </div>
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
