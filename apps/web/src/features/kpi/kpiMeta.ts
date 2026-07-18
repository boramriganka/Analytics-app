import type { KpiKey, KpiValue } from '@signalroom/schemas';
import { money, num, pct, pts } from '../../lib/format';

export interface KpiMeta {
  key: KpiKey;
  label: string;
  definition: string;
  format: (v: number | null) => string;
  formatDelta: (k: KpiValue) => string | null;
  goodWhenUp: boolean | null; // null → neutral (no good/bad coloring)
  /** one calm sentence about what happened */
  plain: (k: KpiValue) => string;
}

const moneyFmt = (v: number | null) => money(v);
const numFmt = (v: number | null) => num(v);
const pctFmt = (v: number | null) => pct(v);

function pctDelta(k: KpiValue): string | null {
  return k.changePct === null ? null : pct(k.changePct, { signed: true });
}
function ptsDelta(k: KpiValue): string | null {
  return k.change === null ? null : pts(k.change);
}

function direction(k: KpiValue, up: string, down: string, flat = 'held steady'): string {
  if (k.changePct === null || k.previous === null) return 'has no comparison period';
  if (Math.abs(k.changePct) < 0.005) return flat;
  return k.changePct > 0 ? up : down;
}

export const KPI_META: Record<KpiKey, KpiMeta> = {
  netSales: {
    key: 'netSales',
    label: 'Net sales',
    definition: 'Gross sales minus discounts and refunds. The revenue you actually kept.',
    format: moneyFmt,
    formatDelta: pctDelta,
    goodWhenUp: true,
    plain: (k) =>
      k.changePct === null
        ? `${money(k.current)} in the selected period.`
        : `Net sales ${direction(k, `grew ${pct(Math.abs(k.changePct))}`, `fell ${pct(Math.abs(k.changePct ?? 0))}`)} vs the comparison period (${money(k.previous)} → ${money(k.current)}).`,
  },
  grossSales: {
    key: 'grossSales',
    label: 'Gross sales',
    definition: 'Total sales value before discounts and refunds are deducted.',
    format: moneyFmt,
    formatDelta: pctDelta,
    goodWhenUp: true,
    plain: (k) =>
      k.changePct === null
        ? `${money(k.current)} before discounts and refunds.`
        : `Gross sales ${direction(k, 'rose', 'fell')} ${k.changePct !== null ? pct(Math.abs(k.changePct)) : ''} against the comparison period.`,
  },
  orders: {
    key: 'orders',
    label: 'Orders',
    definition: 'Number of distinct orders placed in the period.',
    format: numFmt,
    formatDelta: pctDelta,
    goodWhenUp: true,
    plain: (k) =>
      k.changePct === null
        ? `${num(k.current)} orders in the period.`
        : `Customers placed ${num(k.current)} orders — ${k.changePct >= 0 ? `${pct(k.changePct)} more` : `${pct(Math.abs(k.changePct ?? 0))} fewer`} than the comparison period.`,
  },
  unitsSold: {
    key: 'unitsSold',
    label: 'Units sold',
    definition: 'Total quantity of items sold across all orders.',
    format: numFmt,
    formatDelta: pctDelta,
    goodWhenUp: true,
    plain: (k) => `${num(k.current)} items went out the door${k.changePct !== null ? ` (${pct(k.changePct, { signed: true })} vs comparison)` : ''}.`,
  },
  avgOrderValue: {
    key: 'avgOrderValue',
    label: 'Average order value',
    definition: 'Net sales divided by the number of orders.',
    format: (v) => money(v, { cents: true }),
    formatDelta: pctDelta,
    goodWhenUp: true,
    plain: (k) =>
      k.previous === null
        ? `The typical order was worth ${money(k.current, { cents: true })}.`
        : `The typical order ${direction(k, 'grew', 'shrank')} from ${money(k.previous, { cents: true })} to ${money(k.current, { cents: true })}.`,
  },
  refundRate: {
    key: 'refundRate',
    label: 'Refund rate',
    definition: 'Refunded value as a share of gross sales.',
    format: pctFmt,
    formatDelta: ptsDelta,
    goodWhenUp: false,
    plain: (k) =>
      k.previous === null
        ? `${pct(k.current)} of gross sales was refunded.`
        : `Refunds ${direction(k, 'climbed', 'eased')} from ${pct(k.previous)} to ${pct(k.current)} of gross sales.`,
  },
  discountRate: {
    key: 'discountRate',
    label: 'Discount rate',
    definition: 'Discount value as a share of gross sales.',
    format: pctFmt,
    formatDelta: ptsDelta,
    goodWhenUp: null,
    plain: (k) =>
      k.previous === null
        ? `${pct(k.current)} of gross sales was given as discounts.`
        : `Discounting moved from ${pct(k.previous)} to ${pct(k.current)} of gross sales.`,
  },
  repeatCustomerRate: {
    key: 'repeatCustomerRate',
    label: 'Repeat-customer rate',
    definition: 'Share of identified customers in the period who had purchased before it began. Needs customer IDs in your data.',
    format: pctFmt,
    formatDelta: ptsDelta,
    goodWhenUp: true,
    plain: (k) =>
      k.current === null
        ? 'No identified customers in this period — import customer IDs to unlock this.'
        : `${pct(k.current)} of this period’s customers had bought before.`,
  },
  grossMargin: {
    key: 'grossMargin',
    label: 'Gross margin',
    definition: 'Net sales minus cost of goods, as a share of net sales. Only computed for rows that include cost.',
    format: pctFmt,
    formatDelta: ptsDelta,
    goodWhenUp: true,
    plain: (k) =>
      k.current === null
        ? 'No cost data in this period — include a cost column to unlock margin.'
        : `You kept ${pct(k.current)} of net sales after cost of goods.`,
  },
};

export const KPI_ORDER: KpiKey[] = [
  'netSales',
  'orders',
  'avgOrderValue',
  'grossMargin',
  'grossSales',
  'unitsSold',
  'refundRate',
  'discountRate',
  'repeatCustomerRate',
];
