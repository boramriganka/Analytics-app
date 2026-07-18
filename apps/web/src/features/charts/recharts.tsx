import type { ReactNode } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LabelList, Cell,
} from 'recharts';
import { chart, FONT_MONO } from './palette';
import { money, num, shortDate } from '../../lib/format';

const AXIS_TICK = { fill: chart.ink3, fontSize: 10, fontFamily: FONT_MONO } as const;

export function SigTooltip({ active, payload, label, formatLabel, moneyValues = true }: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }[];
  label?: string | number;
  formatLabel?: (l: string) => string;
  moneyValues?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-ink px-3 py-2 text-ink-inverse shadow-lg">
      {label !== undefined && (
        <p className="mb-1 font-mono text-[10px] tracking-wide text-ink-inverse/60 uppercase">
          {formatLabel ? formatLabel(String(label)) : String(label)}
        </p>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <p key={i} className="flex items-center gap-2 text-xs">
            {p.color && <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />}
            <span className="text-ink-inverse/70">{p.name}</span>
            <span className="tabular ml-auto pl-4 font-medium">
              {moneyValues ? money(Number(p.value)) : num(Number(p.value))}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

/** Two aligned measures of the same unit (e.g. gross vs net) — one axis. */
export function TwoLineChart({
  data, xKey, aKey, aLabel, bKey, bLabel, height = 280,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  aKey: string;
  aLabel: string;
  bKey: string;
  bLabel: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="px-2">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 14, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={chart.grid} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: chart.line2 }} tickFormatter={shortDate} minTickGap={40} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => money(v, { compact: true })} width={52} />
          <Tooltip content={<SigTooltip formatLabel={shortDate} />} cursor={{ stroke: chart.ink3, strokeDasharray: '3 3' }} />
          <Line type="monotone" dataKey={aKey} name={aLabel} stroke={chart.ink3} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          <Line type="monotone" dataKey={bKey} name={bLabel} stroke={chart.signal} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: chart.panel, strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
      <ChartLegend items={[{ label: bLabel, color: chart.signal }, { label: aLabel, color: chart.ink3, dashed: true }]} />
    </div>
  );
}

/** Multi-entity lines (e.g. channels) — validated trio palette, legend required. */
export function MultiLineChart({
  data, xKey, keys, height = 280, valueFormat = (v: number) => money(v, { compact: true }),
}: {
  data: Record<string, unknown>[];
  xKey: string;
  keys: string[];
  height?: number;
  valueFormat?: (v: number) => string;
}) {
  return (
    <div style={{ height }} className="px-2">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 14, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={chart.grid} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: chart.line2 }} tickFormatter={shortDate} minTickGap={40} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => valueFormat(v)} width={52} />
          <Tooltip content={<SigTooltip formatLabel={shortDate} />} cursor={{ stroke: chart.ink3, strokeDasharray: '3 3' }} />
          {keys.slice(0, 3).map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              name={k}
              stroke={chart.trio[i]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: chart.panel, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <ChartLegend items={keys.slice(0, 3).map((k, i) => ({ label: k, color: chart.trio[i]! }))} />
    </div>
  );
}

/** Vertical columns for cyclical dimensions (weekday, hour) — single hue,
 * selective direct labels on the peaks. */
export function CycleColumns({
  data, xKey, yKey, height = 220, labelEvery = 0, xTickFormat,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  height?: number;
  labelEvery?: number;
  xTickFormat?: (v: string) => string;
}) {
  const max = Math.max(...data.map((d) => Number(d[yKey]) || 0));
  return (
    <div style={{ height }} className="px-2">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 18, right: 8, bottom: 0, left: 8 }} barCategoryGap="25%">
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: chart.line2 }} tickFormatter={xTickFormat} interval={labelEvery} />
          <YAxis hide />
          <Tooltip content={<SigTooltip />} cursor={{ fill: 'rgba(28,26,23,0.05)' }} />
          <Bar dataKey={yKey} name="Net sales" radius={[3, 3, 0, 0]} maxBarSize={26}>
            {data.map((d, i) => (
              <Cell key={i} fill={Number(d[yKey]) === max ? chart.signal : '#9daae8'} />
            ))}
            <LabelList
              dataKey={yKey}
              position="top"
              formatter={(v: number) => (v === max ? money(v, { compact: true }) : '')}
              style={{ fill: chart.ink, fontSize: 10, fontFamily: FONT_MONO }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 pt-1 pb-2">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-ink-2">
          <span
            className="inline-block h-0.5 w-4 rounded"
            style={{ background: item.dashed ? 'transparent' : item.color, borderTop: item.dashed ? `2px dashed ${item.color}` : undefined }}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="mt-4 grid gap-4 lg:grid-cols-2">{children}</div>;
}
