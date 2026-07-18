import { z } from 'zod';
import { makeRowSchema } from './canonical.js';

/* ---------------------------------- filters ---------------------------------- */

export const ComparisonMode = z.enum(['previous-period', 'previous-year', 'none']);
export type ComparisonMode = z.infer<typeof ComparisonMode>;

export const FiltersSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  compare: ComparisonMode.default('previous-period'),
  category: z.string().optional(),
  product: z.string().optional(),
  channel: z.string().optional(),
  store: z.string().optional(),
  country: z.string().optional(),
  customerType: z.enum(['new', 'returning']).optional(),
  importId: z.coerce.number().int().optional(),
});
export type Filters = z.infer<typeof FiltersSchema>;

/* ----------------------------------- KPIs ------------------------------------ */

export const KPI_KEYS = [
  'netSales',
  'grossSales',
  'orders',
  'unitsSold',
  'avgOrderValue',
  'refundRate',
  'discountRate',
  'repeatCustomerRate',
  'grossMargin',
] as const;
export type KpiKey = (typeof KPI_KEYS)[number];

export const KpiValue = z.object({
  key: z.enum(KPI_KEYS),
  current: z.number().nullable(),
  previous: z.number().nullable(),
  /** absolute change, current − previous */
  change: z.number().nullable(),
  /** relative change as a fraction, null when previous is 0/absent */
  changePct: z.number().nullable(),
  /** per-bucket values for the trend spark, current period */
  spark: z.array(z.number()),
});
export type KpiValue = z.infer<typeof KpiValue>;

export const SummaryResponse = z.object({
  filters: FiltersSchema,
  comparisonRange: z.object({ from: z.string(), to: z.string() }).nullable(),
  kpis: z.array(KpiValue),
  currency: z.string().nullable(),
  transactionCount: z.number(),
});
export type SummaryResponse = z.infer<typeof SummaryResponse>;

/* -------------------------------- timeseries --------------------------------- */

export const Granularity = z.enum(['day', 'week', 'month']);
export type Granularity = z.infer<typeof Granularity>;

export const TimeseriesPoint = z.object({
  period: z.string(),
  netSales: z.number(),
  grossSales: z.number(),
  orders: z.number(),
  units: z.number(),
  discounts: z.number(),
  refunds: z.number(),
});
export type TimeseriesPoint = z.infer<typeof TimeseriesPoint>;

export const TimeseriesResponse = z.object({
  granularity: Granularity,
  series: z.array(TimeseriesPoint),
  comparison: z.array(TimeseriesPoint).nullable(),
  anomalies: z.array(
    z.object({ period: z.string(), metric: z.literal('netSales'), zScore: z.number(), direction: z.enum(['high', 'low']) })
  ),
});
export type TimeseriesResponse = z.infer<typeof TimeseriesResponse>;

/* -------------------------------- breakdowns --------------------------------- */

export const BreakdownDimension = z.enum(['category', 'product', 'channel', 'store', 'country', 'customer', 'import', 'dayOfWeek', 'hourOfDay']);
export type BreakdownDimension = z.infer<typeof BreakdownDimension>;

export const BreakdownRow = z.object({
  key: z.string(),
  label: z.string(),
  netSales: z.number(),
  grossSales: z.number(),
  orders: z.number(),
  units: z.number(),
  refunds: z.number(),
  discounts: z.number(),
  cost: z.number().nullable(),
  previousNetSales: z.number().nullable(),
});
export type BreakdownRow = z.infer<typeof BreakdownRow>;

export const BreakdownResponse = z.object({
  dimension: BreakdownDimension,
  rows: z.array(BreakdownRow),
  totalNetSales: z.number(),
});
export type BreakdownResponse = z.infer<typeof BreakdownResponse>;

/* --------------------------------- customers --------------------------------- */

export const CustomerStatsResponse = z.object({
  identified: z.boolean(),
  newCustomers: z.number(),
  returningCustomers: z.number(),
  newRevenue: z.number(),
  returningRevenue: z.number(),
  repeatPurchaseRate: z.number().nullable(),
  valueBands: z.array(z.object({ band: z.string(), customers: z.number(), revenue: z.number() })),
  topCustomers: z.array(
    z.object({ customerId: z.string(), name: z.string(), orders: z.number(), netSales: z.number(), firstSeen: z.string(), lastSeen: z.string() })
  ),
});
export type CustomerStatsResponse = z.infer<typeof CustomerStatsResponse>;

/* ---------------------------------- insights --------------------------------- */

export const Insight = z.object({
  id: z.string(),
  severity: z.enum(['info', 'notable', 'attention']),
  kind: z.enum(['observation', 'hypothesis']),
  title: z.string(),
  body: z.string(),
  comparison: z.string(),
  /** app-relative link to the filtered view supporting the insight */
  href: z.string(),
  metric: z.string().optional(),
});
export type Insight = z.infer<typeof Insight>;

export const InsightsResponse = z.object({ insights: z.array(Insight) });
export type InsightsResponse = z.infer<typeof InsightsResponse>;

/* ---------------------------------- imports ---------------------------------- */

export const ImportRowsPayload = z.object({
  rows: z.array(makeRowSchema()).max(5000),
});

export const ImportJobStatus = z.enum(['pending', 'importing', 'complete', 'undone']);

export const ImportJob = z.object({
  id: z.number(),
  fileName: z.string(),
  status: ImportJobStatus,
  totalRows: z.number(),
  importedRows: z.number(),
  rejectedRows: z.number(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  dateMin: z.string().nullable(),
  dateMax: z.string().nullable(),
});
export type ImportJob = z.infer<typeof ImportJob>;

export const MappingPreset = z.object({
  id: z.number(),
  name: z.string(),
  mapping: z.record(z.string(), z.string()),
  createdAt: z.string(),
});
export type MappingPreset = z.infer<typeof MappingPreset>;

/* ------------------------------ views & reports ------------------------------ */

export const SavedView = z.object({
  id: z.number(),
  name: z.string(),
  route: z.string(),
  /** serialized filter query string */
  query: z.string(),
  createdAt: z.string(),
});
export type SavedView = z.infer<typeof SavedView>;

export const ReportBlockType = z.enum(['heading', 'note', 'kpis', 'chart', 'insight', 'table']);

export const ReportBlock = z.object({
  id: z.number(),
  type: ReportBlockType,
  position: z.number(),
  /** block-type-specific config: chart kind, filters query, text, etc. */
  config: z.record(z.string(), z.unknown()),
});
export type ReportBlock = z.infer<typeof ReportBlock>;

export const Report = z.object({
  id: z.number(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  blocks: z.array(ReportBlock),
});
export type Report = z.infer<typeof Report>;

/* ------------------------------- data quality -------------------------------- */

export const DataQualityResponse = z.object({
  transactionCount: z.number(),
  duplicateTransactionIds: z.number(),
  missingFieldCounts: z.record(z.string(), z.number()),
  uncategorizedRows: z.number(),
  unidentifiedCustomerRows: z.number(),
  negativeNetRows: z.number(),
  imports: z.array(ImportJob),
});
export type DataQualityResponse = z.infer<typeof DataQualityResponse>;

/* ---------------------------------- errors ----------------------------------- */

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;
