import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList,
} from 'recharts';
import { chart } from './chartTheme';
import ChartTooltip from './ChartTooltip';
import { money, num } from '../../lib/format';

// Magnitude comparison across one entity type → single hue, length carries the value.
export default function CategoryBars({ categories }) {
  const height = Math.max(180, categories.length * 44);
  return (
    <div style={{ height }} className="w-full px-2 pb-3" role="img" aria-label="Revenue by category">
      <ResponsiveContainer>
        <BarChart data={categories} layout="vertical" margin={{ top: 4, right: 76, bottom: 0, left: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fill: chart.fog, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={92}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={
              <ChartTooltip
                rows={(payload) => [
                  { name: 'Revenue', value: money(payload[0]?.value), color: chart.series[0] },
                  { name: 'Units', value: num(payload[0]?.payload?.units) },
                ]}
              />
            }
          />
          <Bar dataKey="revenue" fill={chart.series[0]} barSize={16} radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="revenue"
              position="right"
              formatter={(v) => money(v, { compact: true })}
              style={{ fill: chart.fog, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
