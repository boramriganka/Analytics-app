import { describe, it, expect } from 'vitest';
import { generateInsights, type EngineInput } from '../src/insights.js';
import { comparisonRange, granularityFor, pctChange, rangeDays } from '../src/compare.js';
import { detectAnomalies, trailingDeclineStreak } from '../src/anomaly.js';

const base: EngineInput = {
  comparisonLabel: 'the previous 30 days (1 Apr – 30 Apr)',
  filterQuery: 'from=2026-05-01&to=2026-05-30',
  current: { netSales: 118_400, grossSales: 125_000, orders: 900, refunds: 2_625, discounts: 3_975 },
  previous: { netSales: 100_000, grossSales: 105_000, orders: 850, refunds: 2_205, discounts: 2_795 },
  byProduct: [
    { key: 'p1', label: 'Product X', current: 60_300, previous: 18_000 },
    { key: 'p2', label: 'Product Y', current: 30_000, previous: 42_000 },
    { key: 'p3', label: 'Product Z', current: 28_100, previous: 40_000 },
  ],
  byCategory: [
    { key: 'c1', label: 'Category Y', current: 50_000, previous: 48_000, currentRefunds: 2_000, previousRefunds: 500 },
    { key: 'c2', label: 'Category Z', current: 68_400, previous: 52_000, currentRefunds: 625, previousRefunds: 1_705 },
  ],
  byChannel: [
    // Online 55% → 67.6% (+12.6pp) is unambiguously the largest share move
    { key: 'online', label: 'Online', current: 80_000, previous: 55_000 },
    { key: 'store', label: 'Store', current: 30_000, previous: 30_000 },
    { key: 'marketplace', label: 'Marketplace', current: 8_400, previous: 15_000 },
  ],
};

describe('net sales change insight', () => {
  it('names the dominant contributing product with the correct amount', () => {
    const insights = generateInsights(base);
    const net = insights.find((i) => i.id === 'net-sales-change');
    expect(net).toBeDefined();
    // change = 18,400 / 100,000 = 18.4%
    expect(net!.title).toContain('18.4%');
    // Product X delta = +42,300 which is 230% of the +18,400 total → dominant
    expect(net!.body).toContain('Product X');
    expect(net!.body).toContain('$42,300');
    expect(net!.kind).toBe('observation');
    expect(net!.comparison).toContain('previous 30 days');
    expect(net!.href).toContain('/app/products?from=2026-05-01');
  });

  it('does not claim a primary driver when the change is diffuse', () => {
    const diffuse: EngineInput = {
      ...base,
      byProduct: [
        // deltas +6,000 / +6,200 / +6,200 of a +18,400 total — max share 33.7% < 35%
        { key: 'p1', label: 'A', current: 36_000, previous: 30_000 },
        { key: 'p2', label: 'B', current: 42_200, previous: 36_000 },
        { key: 'p3', label: 'C', current: 40_200, previous: 34_000 },
      ],
    };
    const net = generateInsights(diffuse).find((i) => i.id === 'net-sales-change');
    expect(net!.body).toContain('spread across many products');
  });

  it('stays silent below the 3% threshold', () => {
    const flat = {
      ...base,
      current: { ...base.current, netSales: 101_000 },
    };
    expect(generateInsights(flat).find((i) => i.id === 'net-sales-change')).toBeUndefined();
  });
});

describe('refund rate insight', () => {
  it('reports the rate change and the concentrating category', () => {
    const input: EngineInput = {
      ...base,
      current: { ...base.current, grossSales: 100_000, refunds: 4_800 },
      previous: { ...base.previous!, grossSales: 100_000, refunds: 2_100 },
      byCategory: [
        { key: 'c1', label: 'Category Y', current: 50_000, previous: 48_000, currentRefunds: 4_000, previousRefunds: 1_500 },
        { key: 'c2', label: 'Category Z', current: 50_000, previous: 52_000, currentRefunds: 800, previousRefunds: 600 },
      ],
    };
    const refund = generateInsights(input).find((i) => i.id === 'refund-rate-up');
    expect(refund).toBeDefined();
    expect(refund!.title).toContain('2.1%');
    expect(refund!.title).toContain('4.8%');
    expect(refund!.body).toContain('Category Y');
    expect(refund!.severity).toBe('attention'); // +2.7pp ≥ 2pp
    expect(refund!.href).toContain('/app/refunds');
  });
});

describe('weekday streak insight', () => {
  it('fires on three consecutive weekly declines', () => {
    const input: EngineInput = {
      ...base,
      weekdayWeeklyTotals: { 6: [9_000, 9_400, 8_800, 8_100, 7_600] }, // Saturday
    };
    const streak = generateInsights(input).find((i) => i.id === 'weekday-decline-6');
    expect(streak).toBeDefined();
    expect(streak!.title).toBe('Saturday sales declined for 3 consecutive weeks');
  });

  it('does not fire on two declines', () => {
    const input: EngineInput = { ...base, weekdayWeeklyTotals: { 6: [8_000, 9_400, 8_800, 8_100] } };
    expect(generateInsights(input).find((i) => i.id === 'weekday-decline-6')).toBeUndefined();
  });
});

describe('returning customer insight', () => {
  it('reports revenue share vs count share', () => {
    const input: EngineInput = {
      ...base,
      customers: { newCount: 660, returningCount: 340, newRevenue: 46_176, returningRevenue: 72_224 },
    };
    const ins = generateInsights(input).find((i) => i.id === 'returning-share');
    expect(ins).toBeDefined();
    expect(ins!.body).toContain('61%');
    expect(ins!.body).toContain('34%');
  });
});

describe('channel share shift', () => {
  it('reports the largest share move in points', () => {
    const ins = generateInsights(base).find((i) => i.id?.startsWith('channel-shift'));
    expect(ins).toBeDefined();
    // Online: 55/100 = 55% → 80/118.4 = 67.6% → +12.6pp
    expect(ins!.title).toContain('Online');
    expect(ins!.body).toContain('gained');
  });
});

describe('severity ordering', () => {
  it('sorts attention first', () => {
    const input: EngineInput = {
      ...base,
      current: { ...base.current, grossSales: 100_000, refunds: 4_800 },
      previous: { ...base.previous!, grossSales: 100_000, refunds: 2_100 },
    };
    const severities = generateInsights(input).map((i) => i.severity);
    const first = severities.indexOf('attention');
    const lastNonInfo = severities.lastIndexOf('attention');
    expect(first).toBe(0);
    expect(lastNonInfo).toBeLessThan(severities.indexOf('info') === -1 ? Infinity : severities.indexOf('info') + severities.length);
  });
});

/* ------------------------- compare.ts ------------------------- */

describe('comparisonRange', () => {
  it('previous-period is the same length immediately before', () => {
    expect(comparisonRange({ from: '2026-05-01', to: '2026-05-30' }, 'previous-period')).toEqual({
      from: '2026-04-01',
      to: '2026-04-30',
    });
  });
  it('previous-year matches dates one year back', () => {
    expect(comparisonRange({ from: '2026-05-01', to: '2026-05-30' }, 'previous-year')).toEqual({
      from: '2025-05-01',
      to: '2025-05-30',
    });
  });
  it('none returns null', () => {
    expect(comparisonRange({ from: '2026-05-01', to: '2026-05-30' }, 'none')).toBeNull();
  });
});

describe('granularity + math helpers', () => {
  it('picks buckets by span', () => {
    expect(granularityFor({ from: '2026-05-01', to: '2026-05-30' })).toBe('day');
    expect(granularityFor({ from: '2026-01-01', to: '2026-05-30' })).toBe('week');
    expect(granularityFor({ from: '2025-01-01', to: '2026-05-30' })).toBe('month');
  });
  it('rangeDays is inclusive', () => {
    expect(rangeDays({ from: '2026-05-01', to: '2026-05-30' })).toBe(30);
  });
  it('pctChange handles zero previous', () => {
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(110, 100)).toBeCloseTo(0.1);
  });
});

/* ------------------------- anomaly.ts ------------------------- */

describe('detectAnomalies', () => {
  it('flags a spike against the weekday distribution', () => {
    // 8 weeks of flat Mondays..Sundays, one huge Wednesday
    const values: number[] = [];
    const weekdays: number[] = [];
    for (let w = 0; w < 8; w++) {
      for (let d = 0; d < 7; d++) {
        values.push(100 + d * 10 + (w % 2)); // deterministic mild variation
        weekdays.push(d);
      }
    }
    values[3 + 7 * 5] = 900; // Wednesday of week 6
    const anomalies = detectAnomalies(values, { weekdays });
    expect(anomalies.some((a) => a.index === 3 + 7 * 5 && a.direction === 'high')).toBe(true);
    expect(anomalies.length).toBeLessThan(4);
  });
  it('returns nothing for short series', () => {
    expect(detectAnomalies([1, 2, 3])).toEqual([]);
  });
});

describe('trailingDeclineStreak', () => {
  it('counts consecutive declines at the tail', () => {
    expect(trailingDeclineStreak([10, 9, 8, 7])).toBe(3);
    expect(trailingDeclineStreak([7, 8, 9, 10])).toBe(0);
    expect(trailingDeclineStreak([10, 7, 9, 8])).toBe(1);
  });
});
