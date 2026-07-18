import { z } from 'zod';

/**
 * Canonical transaction fields. Imports map source columns onto these keys;
 * the same schema validates rows on the client (fast feedback, reject file)
 * and on the server (trust boundary).
 */
export interface CanonicalField {
  key: CanonicalKey;
  label: string;
  required: boolean;
  kind: 'string' | 'number' | 'date' | 'integer';
  description: string;
  /** lowercase header names that auto-map to this field */
  aliases: string[];
}

export const CANONICAL_KEYS = [
  'transactionId',
  'orderId',
  'timestamp',
  'productId',
  'productName',
  'category',
  'quantity',
  'grossSales',
  'discounts',
  'refunds',
  'netSales',
  'cost',
  'customerId',
  'customerName',
  'channel',
  'store',
  'country',
  'currency',
] as const;

export type CanonicalKey = (typeof CANONICAL_KEYS)[number];

export const CANONICAL_FIELDS: CanonicalField[] = [
  { key: 'transactionId', label: 'Transaction ID', required: false, kind: 'string', description: 'Unique line identifier from the source system. Used for duplicate detection.', aliases: ['transaction id', 'transaction_id', 'txn id', 'txn', 'line id', 'id'] },
  { key: 'orderId', label: 'Order ID', required: true, kind: 'string', description: 'Groups lines into one order. Order counts and AOV depend on it.', aliases: ['order id', 'order_id', 'order', 'order number', 'order no', 'receipt', 'invoice', 'invoice id'] },
  { key: 'timestamp', label: 'Date / time', required: true, kind: 'date', description: 'When the sale happened. Accepts ISO 8601, YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY and unix seconds.', aliases: ['date', 'datetime', 'time', 'timestamp', 'order date', 'created at', 'created_at', 'purchase date'] },
  { key: 'productId', label: 'Product ID', required: false, kind: 'string', description: 'SKU or product code.', aliases: ['sku', 'product id', 'product_id', 'item id', 'product code'] },
  { key: 'productName', label: 'Product name', required: true, kind: 'string', description: 'Human-readable product name.', aliases: ['product', 'product name', 'item', 'item name', 'description', 'title'] },
  { key: 'category', label: 'Category', required: false, kind: 'string', description: 'Product category. Rows without one are grouped as “Uncategorized”.', aliases: ['category', 'product category', 'department', 'product type', 'type'] },
  { key: 'quantity', label: 'Quantity', required: true, kind: 'integer', description: 'Units sold on this line. Must be a whole number.', aliases: ['quantity', 'qty', 'units', 'count', 'amount sold'] },
  { key: 'grossSales', label: 'Gross sales', required: true, kind: 'number', description: 'Line revenue before discounts and refunds. Currency symbols and thousands separators are accepted.', aliases: ['gross sales', 'gross', 'revenue', 'sales', 'total', 'line total', 'subtotal', 'price total', 'gross_sales'] },
  { key: 'discounts', label: 'Discounts', required: false, kind: 'number', description: 'Discount value applied to this line (positive number). Defaults to 0.', aliases: ['discount', 'discounts', 'promo', 'promotion', 'discount amount'] },
  { key: 'refunds', label: 'Refunds', required: false, kind: 'number', description: 'Refunded value on this line (positive number). Defaults to 0.', aliases: ['refund', 'refunds', 'returns', 'refund amount', 'returned'] },
  { key: 'netSales', label: 'Net sales', required: false, kind: 'number', description: 'Revenue after discounts and refunds. Computed as gross − discounts − refunds when not supplied.', aliases: ['net sales', 'net', 'net revenue', 'net_sales', 'net amount'] },
  { key: 'cost', label: 'Cost', required: false, kind: 'number', description: 'Cost of goods for this line. Enables gross margin.', aliases: ['cost', 'cogs', 'unit cost', 'cost of goods', 'total cost'] },
  { key: 'customerId', label: 'Customer ID', required: false, kind: 'string', description: 'Stable customer identifier. Enables repeat-customer and cohort analytics.', aliases: ['customer id', 'customer_id', 'buyer id', 'client id', 'email', 'customer email'] },
  { key: 'customerName', label: 'Customer name', required: false, kind: 'string', description: 'Display name for the customer.', aliases: ['customer', 'customer name', 'buyer', 'client', 'name'] },
  { key: 'channel', label: 'Channel', required: false, kind: 'string', description: 'Sales channel, e.g. online, store, marketplace.', aliases: ['channel', 'sales channel', 'source', 'platform'] },
  { key: 'store', label: 'Store', required: false, kind: 'string', description: 'Store or location name for in-person sales.', aliases: ['store', 'location', 'branch', 'shop', 'outlet', 'pos'] },
  { key: 'country', label: 'Country', required: false, kind: 'string', description: 'Customer or order country.', aliases: ['country', 'market', 'region', 'ship country', 'shipping country'] },
  { key: 'currency', label: 'Currency', required: false, kind: 'string', description: '3-letter currency code. Recorded, not converted.', aliases: ['currency', 'currency code', 'iso currency'] },
];

export const REQUIRED_KEYS = CANONICAL_FIELDS.filter((f) => f.required).map((f) => f.key);

/* ------------------------------------------------------------------ */
/* Coercion helpers — tolerant of real-world CSV formatting            */
/* ------------------------------------------------------------------ */

const CURRENCY_CHARS = /[$€£₹¥,\s]/g;

export function parseNumberLike(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (s === '') return null;
  const negative = /^\(.*\)$/.test(s);
  if (negative) s = s.slice(1, -1);
  s = s.replace(CURRENCY_CHARS, '');
  // European decimal comma: "1.234,56" handled by the comma strip above only
  // when comma is thousands; detect trailing ",dd" style before stripping.
  const m = raw.trim().match(/^-?[\d.]+,(\d{1,2})$/);
  if (m) s = raw.trim().replace(/\./g, '').replace(',', '.').replace(CURRENCY_CHARS, '');
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}([T ].*)?$/;
const DMY_RE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})([ T](\d{1,2}):(\d{2})(:(\d{2}))?)?$/;
const UNIX_RE = /^\d{10}$/;

/**
 * Parse a date-ish value to an ISO string.
 * `dayFirst` disambiguates 03/04/2025 — import detection sets it when any
 * value in the column has a first component > 12.
 */
export function parseDateLike(raw: unknown, dayFirst = false): string | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  if (typeof raw === 'number') {
    const d = new Date(raw > 1e12 ? raw : raw * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (s === '') return null;
  if (ISO_RE.test(s)) {
    const d = new Date(s.includes('T') || s.includes(' ') ? s.replace(' ', 'T') : `${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (UNIX_RE.test(s)) return new Date(Number(s) * 1000).toISOString();
  const m = s.match(DMY_RE);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = Number(m[3]);
    const hh = Number(m[5] ?? 0);
    const mm = Number(m[6] ?? 0);
    const ss = Number(m[8] ?? 0);
    let day: number, month: number;
    if (a > 12) [day, month] = [a, b];
    else if (b > 12) [day, month] = [b, a];
    else if (dayFirst) [day, month] = [a, b];
    else [day, month] = [b, a];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month - 1, day, hh, mm, ss));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* ------------------------------------------------------------------ */
/* Row schema                                                          */
/* ------------------------------------------------------------------ */

const requiredText = (label: string) =>
  z
    .union([z.string(), z.number()], { errorMap: () => ({ message: `${label} is required` }) })
    .transform((v) => String(v).trim())
    .pipe(z.string().min(1, `${label} is required`));

const optionalTrimmed = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  });

function moneyField(label: string, { required = false } = {}) {
  return z.unknown().transform((v, ctx) => {
    if (v === null || v === undefined || v === '') {
      if (required) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is required` });
        return z.NEVER;
      }
      return undefined;
    }
    const n = parseNumberLike(v);
    if (n === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is not a number: “${String(v)}”` });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });
}

export function makeRowSchema(opts: { dayFirst?: boolean } = {}) {
  return z
    .object({
      transactionId: optionalTrimmed,
      orderId: requiredText('Order ID'),
      timestamp: z.unknown().transform((v, ctx) => {
        const iso = parseDateLike(v, opts.dayFirst);
        if (!iso) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Date is invalid: “${String(v)}”` });
          return z.NEVER;
        }
        return iso;
      }),
      productId: optionalTrimmed,
      productName: requiredText('Product name'),
      category: optionalTrimmed,
      quantity: z.unknown().transform((v, ctx) => {
        const n = parseNumberLike(v);
        if (n === null || !Number.isInteger(n) || n === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Quantity must be a non-zero whole number: “${String(v)}”`,
          });
          return z.NEVER;
        }
        return n;
      }),
      grossSales: moneyField('Gross sales', { required: true }),
      discounts: moneyField('Discounts'),
      refunds: moneyField('Refunds'),
      netSales: moneyField('Net sales'),
      cost: moneyField('Cost'),
      customerId: optionalTrimmed,
      customerName: optionalTrimmed,
      channel: optionalTrimmed,
      store: optionalTrimmed,
      country: optionalTrimmed,
      currency: optionalTrimmed.pipe(
        z
          .string()
          .regex(/^[A-Za-z]{3}$/, 'Currency must be a 3-letter code')
          .transform((s) => s.toUpperCase())
          .optional()
      ),
    })
    .transform((row) => ({
      ...row,
      discounts: row.discounts ?? 0,
      refunds: row.refunds ?? 0,
      netSales: row.netSales ?? Math.round(((row.grossSales as number) - (row.discounts ?? 0) - (row.refunds ?? 0)) * 100) / 100,
    }));
}

export type CanonicalRow = z.output<ReturnType<typeof makeRowSchema>>;

/** Suggest a canonical field for a source header, or null. */
export function suggestMapping(header: string): CanonicalKey | null {
  const h = header.trim().toLowerCase().replace(/[_-]+/g, ' ');
  for (const field of CANONICAL_FIELDS) {
    if (field.aliases.includes(h) || field.key.toLowerCase() === h.replace(/ /g, '')) return field.key;
  }
  return null;
}
