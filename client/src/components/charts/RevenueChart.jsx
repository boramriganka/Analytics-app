import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { chart } from './chartTheme';
import ChartTooltip from './ChartTooltip';
import { money, shortMonth } from '../../lib/format';

export default function RevenueChart({ series, granularity }) {
  return (
    <div className="h-72 w-full px-2 pb-2" role="img" aria-label="Net revenue over time">
      <ResponsiveContainer>
        <AreaChart data={series} margin={{ top: 16, right: 16, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.accent} stopOpacity={0.22} />
              <stop offset="100%" stopColor={chart.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={chart.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={shortMonth}
            tick={{ fill: chart.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: chart.grid }}
            minTickGap={36}
          />
          <YAxis
            tickFormatter={(v) => money(v, { compact: true })}
            tick={{ fill: chart.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={54}
          />
          <Tooltip
            cursor={{ stroke: chart.axis, strokeDasharray: '3 3' }}
            content={
              <ChartTooltip
                formatLabel={shortMonth}
                rows={(payload) => [
                  { name: 'Revenue', value: money(payload[0]?.value), color: chart.accent },
                  { name: 'Orders', value: payload[0]?.payload?.orders },
                ]}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={chart.accent}
            strokeWidth={2}
            fill="url(#revFill)"
            dot={false}
            activeDot={{ r: 4, fill: chart.accent, stroke: chart.surface, strokeWidth: 2 }}
            name={granularity === 'month' ? 'Monthly revenue' : 'Daily revenue'}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
