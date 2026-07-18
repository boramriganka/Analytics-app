import { pctChange, ppChange } from './compare.js';
import { trailingDeclineStreak } from './anomaly.js';

/**
 * Deterministic insight engine. Input is pre-aggregated data; output is a list
 * of insights with the comparison stated, observation/hypothesis marked, and a
 * link to the filtered view that supports it. No causes are asserted beyond
 * arithmetic decomposition of the change.
 */

export interface EntityDelta {
  key: string;
  label: string;
  current: number;
  previous: number;
  /** refund value in each period, for refund concentration */
  currentRefunds?: number;
  previousRefunds?: number;
}

export interface EngineInput {
  /** e.g. "the previous 30 days (1 Apr – 30 Apr)" */
  comparisonLabel: string;
  /** query string that reproduces the current filters, e.g. "from=…&to=…" */
  filterQuery: string;
  current: {
    netSales: number;
    grossSales: number;
    orders: number;
    refunds: number;
    discounts: number;
  };
  previous: {
    netSales: number;
    grossSales: number;
    orders: number;
    refunds: number;
    discounts: number;
  } | null;
  byProduct: EntityDelta[];
  byCategory: EntityDelta[];
  byChannel: EntityDelta[];
  /** per weekday (0=Sun…6=Sat): net sales of each of the last N full weeks, oldest first */
  weekdayWeeklyTotals?: Partial<Record<number, number[]>>;
  customers?: {
    newCount: number;
    returningCount: number;
    newRevenue: number;
    returningRevenue: number;
  } | null;
  formatMoney?: (n: number) => string;
}

export interface EngineInsight {
  id: string;
  severity: 'info' | 'notable' | 'attention';
  kind: 'observation' | 'hypothesis';
  title: string;
  body: string;
  comparison: string;
  href: string;
  metric?: string;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const defaultMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pct = (f: number) => `${(f * 100).toFixed(1).replace(/\.0$/, '')}%`;

export function generateInsights(input: EngineInput): EngineInsight[] {
  const out: EngineInsight[] = [];
  const money = input.formatMoney ?? defaultMoney;
  const { current, previous, comparisonLabel, filterQuery } = input;

  /* 1 — Net sales change, decomposed by product contribution */
  if (previous && previous.netSales > 0) {
    const change = pctChange(current.netSales, previous.netSales)!;
    if (Math.abs(change) >= 0.03) {
      const direction = change > 0 ? 'increased' : 'decreased';
      const totalDelta = current.netSales - previous.netSales;
      const contributions = input.byProduct
        .map((p) => ({ ...p, delta: p.current - p.previous }))
        .filter((p) => Math.sign(p.delta) === Math.sign(totalDelta))
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      const top = contributions[0];
      const topShare = top && totalDelta !== 0 ? top.delta / totalDelta : 0;

      let body: string;
      if (top && topShare >= 0.35) {
        body = `Net sales ${direction} ${pct(Math.abs(change))}, primarily because ${top.label} contributed ${money(Math.abs(top.delta))} ${totalDelta > 0 ? 'more' : 'less'} than in the comparison period.`;
      } else {
        body = `Net sales ${direction} ${pct(Math.abs(change))} (${money(Math.abs(totalDelta))}). The change is spread across many products rather than driven by one.`;
      }
      out.push({
        id: 'net-sales-change',
        severity: change <= -0.15 ? 'attention' : Math.abs(change) >= 0.1 ? 'notable' : 'info',
        kind: 'observation',
        title: `Net sales ${direction} ${pct(Math.abs(change))}`,
        body,
        comparison: `Compared with ${comparisonLabel}.`,
        href: `/app/products?${filterQuery}`,
        metric: 'netSales',
      });
    }
  }

  /* 2 — Refund rate shift with category concentration */
  if (previous && previous.grossSales > 0 && current.grossSales > 0) {
    const curRate = current.refunds / current.grossSales;
    const prevRate = previous.refunds / previous.grossSales;
    const pp = ppChange(curRate, prevRate)!;
    if (pp >= 0.01 && current.refunds > 0) {
      const refundDeltas = input.byCategory
        .map((c) => ({ ...c, delta: (c.currentRefunds ?? 0) - (c.previousRefunds ?? 0) }))
        .filter((c) => c.delta > 0)
        .sort((a, b) => b.delta - a.delta);
      const top = refundDeltas[0];
      const totalRefundDelta = current.refunds - previous.refunds;
      const concentrated = top && totalRefundDelta > 0 && top.delta / totalRefundDelta >= 0.5;
      out.push({
        id: 'refund-rate-up',
        severity: pp >= 0.02 ? 'attention' : 'notable',
        kind: 'observation',
        title: `Refund rate rose from ${pct(prevRate)} to ${pct(curRate)}`,
        body: concentrated
          ? `Refunded value increased by ${money(totalRefundDelta)}, concentrated in ${top.label} (${money(top.delta)} of the increase).`
          : `Refunded value increased by ${money(Math.max(totalRefundDelta, 0))} across several categories.`,
        comparison: `Compared with ${comparisonLabel}.`,
        href: `/app/refunds?${filterQuery}`,
        metric: 'refundRate',
      });
    }
  }

  /* 3 — Weekday decline streaks */
  if (input.weekdayWeeklyTotals) {
    for (const [wd, totals] of Object.entries(input.weekdayWeeklyTotals)) {
      if (!totals || totals.length < 4) continue;
      const streak = trailingDeclineStreak(totals);
      if (streak >= 3) {
        const name = WEEKDAY_NAMES[Number(wd)];
        out.push({
          id: `weekday-decline-${wd}`,
          severity: 'notable',
          kind: 'observation',
          title: `${name} sales declined for ${streak} consecutive weeks`,
          body: `${name} net sales have fallen each week for the last ${streak} weeks (${money(totals[totals.length - streak - 1] ?? 0)} → ${money(totals[totals.length - 1] ?? 0)}).`,
          comparison: `Based on the last ${totals.length} full weeks in the selected range.`,
          href: `/app/sales?${filterQuery}`,
        });
      }
    }
  }

  /* 4 — Returning-customer revenue share */
  if (input.customers) {
    const { newCount, returningCount, newRevenue, returningRevenue } = input.customers;
    const totalCount = newCount + returningCount;
    const totalRevenue = newRevenue + returningRevenue;
    if (totalCount >= 20 && totalRevenue > 0) {
      const revShare = returningRevenue / totalRevenue;
      const countShare = returningCount / totalCount;
      if (revShare >= 0.5 && revShare - countShare >= 0.15) {
        out.push({
          id: 'returning-share',
          severity: 'info',
          kind: 'observation',
          title: `Returning customers generated ${pct(revShare)} of revenue`,
          body: `Returning customers generated ${pct(revShare)} of revenue despite representing ${pct(countShare)} of customers in this period.`,
          comparison: 'New vs returning within the selected range; a customer is “returning” if they purchased before the range began.',
          href: `/app/customers?${filterQuery}`,
        });
      }
    }
  }

  /* 5 — Discount pressure */
  if (previous && previous.grossSales > 0 && current.grossSales > 0) {
    const curRate = current.discounts / current.grossSales;
    const prevRate = previous.discounts / previous.grossSales;
    const pp = ppChange(curRate, prevRate)!;
    if (pp >= 0.02) {
      out.push({
        id: 'discount-rate-up',
        severity: 'info',
        kind: 'hypothesis',
        title: `Discount rate rose from ${pct(prevRate)} to ${pct(curRate)}`,
        body: `Discounting is ${pct(pp)} points higher than in the comparison period. If net sales did not rise proportionally, promotions may be trading margin for volume — worth verifying against the sales trend.`,
        comparison: `Compared with ${comparisonLabel}.`,
        href: `/app/sales?${filterQuery}`,
        metric: 'discountRate',
      });
    }
  }

  /* 6 — Channel share shift */
  if (previous && previous.netSales > 0 && current.netSales > 0 && input.byChannel.length >= 2) {
    const shifts = input.byChannel
      .map((c) => {
        const curShare = c.current / current.netSales;
        const prevShare = c.previous / previous.netSales;
        return { ...c, shift: curShare - prevShare, curShare, prevShare };
      })
      .sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift));
    const top = shifts[0];
    if (top && Math.abs(top.shift) >= 0.05) {
      out.push({
        id: `channel-shift-${top.key}`,
        severity: 'info',
        kind: 'observation',
        title: `${top.label} moved from ${pct(top.prevShare)} to ${pct(top.curShare)} of net sales`,
        body: `${top.label} ${top.shift > 0 ? 'gained' : 'lost'} ${pct(Math.abs(top.shift))} points of revenue share versus the comparison period.`,
        comparison: `Compared with ${comparisonLabel}.`,
        href: `/app/channels?${filterQuery}`,
      });
    }
  }

  /* 7 — AOV decomposition */
  if (previous && previous.orders > 0 && current.orders > 0) {
    const curAov = current.netSales / current.orders;
    const prevAov = previous.netSales / previous.orders;
    const change = pctChange(curAov, prevAov)!;
    const orderChange = pctChange(current.orders, previous.orders)!;
    if (Math.abs(change) >= 0.1) {
      const dir = change > 0 ? 'rose' : 'fell';
      let body = `Average order value ${dir} ${pct(Math.abs(change))} (${money(prevAov)} → ${money(curAov)}).`;
      let kind: 'observation' | 'hypothesis' = 'observation';
      if (change > 0 && orderChange < -0.05) {
        body += ` Order count fell ${pct(Math.abs(orderChange))} in the same period — larger baskets may be offsetting fewer orders, which is worth confirming in the product mix.`;
        kind = 'hypothesis';
      }
      out.push({
        id: 'aov-shift',
        severity: 'info',
        kind,
        title: `Average order value ${dir} ${pct(Math.abs(change))}`,
        body,
        comparison: `Compared with ${comparisonLabel}.`,
        href: `/app/sales?${filterQuery}`,
        metric: 'avgOrderValue',
      });
    }
  }

  const severityRank = { attention: 0, notable: 1, info: 2 };
  return out.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
