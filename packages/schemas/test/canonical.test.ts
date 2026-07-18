import { describe, it, expect } from 'vitest';
import { makeRowSchema, parseNumberLike, parseDateLike, suggestMapping } from '../src/canonical.js';

describe('parseNumberLike', () => {
  it('parses plain and formatted numbers', () => {
    expect(parseNumberLike('42')).toBe(42);
    expect(parseNumberLike('1,234.56')).toBe(1234.56);
    expect(parseNumberLike('$1,299.00')).toBe(1299);
    expect(parseNumberLike('₹42,300')).toBe(42300);
    expect(parseNumberLike('€ 12.50')).toBe(12.5);
    expect(parseNumberLike('(45.00)')).toBe(-45);
    expect(parseNumberLike('1.234,56')).toBe(1234.56);
    expect(parseNumberLike(17.5)).toBe(17.5);
  });
  it('rejects garbage', () => {
    expect(parseNumberLike('abc')).toBeNull();
    expect(parseNumberLike('')).toBeNull();
    expect(parseNumberLike(null)).toBeNull();
    expect(parseNumberLike(NaN)).toBeNull();
  });
});

describe('parseDateLike', () => {
  it('parses ISO dates and datetimes', () => {
    expect(parseDateLike('2026-03-05')).toBe('2026-03-05T00:00:00.000Z');
    expect(parseDateLike('2026-03-05T14:30:00Z')).toBe('2026-03-05T14:30:00.000Z');
    expect(parseDateLike('2026-03-05 14:30:00')).toMatch(/^2026-03-05T/);
  });
  it('disambiguates D/M vs M/D', () => {
    expect(parseDateLike('25/03/2026')).toBe('2026-03-25T00:00:00.000Z'); // first > 12 → day first
    expect(parseDateLike('03/25/2026')).toBe('2026-03-25T00:00:00.000Z'); // second > 12 → month first
    expect(parseDateLike('03/04/2026', true)).toBe('2026-04-03T00:00:00.000Z'); // dayFirst flag
    expect(parseDateLike('03/04/2026', false)).toBe('2026-03-04T00:00:00.000Z');
  });
  it('parses unix seconds', () => {
    expect(parseDateLike('1767225600')).toBe('2026-01-01T00:00:00.000Z');
  });
  it('rejects invalid dates', () => {
    expect(parseDateLike('13/13/2026')).toBeNull();
    expect(parseDateLike('not a date')).toBeNull();
    expect(parseDateLike('')).toBeNull();
  });
});

describe('row schema', () => {
  const schema = makeRowSchema();

  it('accepts a complete valid row and computes netSales', () => {
    const result = schema.safeParse({
      orderId: 'A-100',
      timestamp: '2026-05-01',
      productName: 'Walnut Desk',
      quantity: '2',
      grossSales: '$1,200.00',
      discounts: '100',
      refunds: '',
      currency: 'usd',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.netSales).toBe(1100);
      expect(result.data.refunds).toBe(0);
      expect(result.data.currency).toBe('USD');
      expect(result.data.quantity).toBe(2);
    }
  });

  it('respects an explicit netSales over the computed one', () => {
    const r = schema.parse({
      orderId: 'A-101',
      timestamp: '2026-05-01',
      productName: 'Lamp',
      quantity: 1,
      grossSales: 100,
      netSales: 80,
    });
    expect(r.netSales).toBe(80);
  });

  it('collects row errors for the reject file', () => {
    const result = schema.safeParse({
      orderId: '',
      timestamp: 'yesterday-ish',
      productName: 'Lamp',
      quantity: '1.5',
      grossSales: 'free',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(' | ');
      expect(messages).toContain('Date is invalid');
      expect(messages).toContain('Quantity');
      expect(messages).toContain('Gross sales');
    }
  });
});

describe('suggestMapping', () => {
  it('maps common header variants', () => {
    expect(suggestMapping('Order Number')).toBe('orderId');
    expect(suggestMapping('SKU')).toBe('productId');
    expect(suggestMapping('order_date')).toBe('timestamp');
    expect(suggestMapping('Qty')).toBe('quantity');
    expect(suggestMapping('Revenue')).toBe('grossSales');
    expect(suggestMapping('mystery_column')).toBeNull();
  });
});
