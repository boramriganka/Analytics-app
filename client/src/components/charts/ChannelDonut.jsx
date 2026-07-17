import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { chart, CHANNEL_COLORS, CHANNEL_LABELS } from './chartTheme';
import ChartTooltip from './ChartTooltip';
import { money, pct } from '../../lib/format';

// Identity split across 3 channels → validated categorical slots, 2px surface
// gaps between segments, legend + direct share labels (identity never color-alone).
export default function ChannelDonut({ channels }) {
  const total = channels.reduce((s, c) => s + c.revenue, 0);
  const data = channels.map((c) => ({
    ...c,
    label: CHANNEL_LABELS[c.channel] ?? c.channel,
    color: CHANNEL_COLORS[c.channel] ?? chart.series[0],
  }));

  return (
    <div className="flex flex-col items-center gap-2 px-5 pb-5">
      <div className="relative h-52 w-full" role="img" aria-label="Revenue share by sales channel">
        <ResponsiveContainer>
          <PieChart>
            <Tooltip
              content={
                <ChartTooltip
                  rows={(payload) => {
                    const p = payload[0]?.payload;
                    return [
                      { name: p?.label, value: money(p?.revenue), color: p?.color },
                      { name: 'Orders', value: p?.orders },
                    ];
                  }}
                />
              }
            />
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="label"
              innerRadius="68%"
              outerRadius="96%"
              paddingAngle={1.5}
              stroke={chart.surface}
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((d) => (
                <Cell key={d.channel} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs text-ash">Total</p>
          <p className="font-display text-xl font-semibold">{money(total, { compact: true })}</p>
        </div>
      </div>

      {/* Legend with direct share labels */}
      <ul className="w-full space-y-2">
        {data.map((d) => (
          <li key={d.channel} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} aria-hidden="true" />
            <span className="text-fog">{d.label}</span>
            <span className="tabular ml-auto text-cream">{money(d.revenue, { compact: true })}</span>
            <span className="tabular w-12 text-right text-ash">{total ? pct(d.revenue / total, { signed: false }) : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
