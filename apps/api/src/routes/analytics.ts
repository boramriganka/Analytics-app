import { Router } from 'express';
import type Database from 'better-sqlite3';
import {
  FiltersSchema,
  type Filters,
  KPI_KEYS,
  type KpiValue,
  type BreakdownDimension,
} from '@signalroom/schemas';
import {
  comparisonRange,
  granularityFor,
  pctChange,
  detectAnomalies,
  generateInsights,
  rangeDays,
  type EngineInput,
  type DateRange,
} from '@signalroom/analytics';
import { h, parse, HttpError } from '../lib/http.js';
import { z } from 'zod';

interface Agg {
  netSales: number;
  grossSales: number;
  orders: number;
  units: number;
  refunds: number;
  discounts: number;
  costedNet: number;
  cost: number;
  costedRows: number;
  rows: number;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function analyticsRouter(sqlite: Database.Database): Router {
  const r = Router();

  /* ------------------------- filter → WHERE builder ------------------------- */

  function where(wsId: number, f: Filters, range: DateRange, alias = ''): { sql: string; params: unknown[] } {
    const c = alias ? `${alias}.` : '';
    const clauses = [`${c}workspace_id = ?`, `${c}day >= ?`, `${c}day <= ?`];
    const params: unknown[] = [wsId, range.from, range.to];
    if (f.category) {
      if (f.category === 'Uncategorized') clauses.push(`${c}category IS NULL`);
      else {
        clauses.push(`${c}category = ?`);
        params.push(f.category);
      }
    }
    if (f.product) {
      clauses.push(`${c}product_name = ?`);
      params.push(f.product);
    }
    if (f.channel) {
      clauses.push(`${c}channel = ?`);
      params.push(f.channel);
    }
    if (f.store) {
      clauses.push(`${c}store = ?`);
      params.push(f.store);
    }
    if (f.country) {
      clauses.push(`${c}country = ?`);
      params.push(f.country);
    }
    if (f.importId) {
      clauses.push(`${c}import_job_id = ?`);
      params.push(f.importId);
    }
    if (f.customerType) {
      const op = f.customerType === 'new' ? '>=' : '<';
      clauses.push(
        `${c}customer_id IS NOT NULL AND ${c}customer_id IN (
           SELECT customer_id FROM transactions WHERE workspace_id = ? AND customer_id IS NOT NULL
           GROUP BY customer_id HAVING MIN(day) ${op} ?
         )`
      );
      params.push(wsId, f.from);
    }
    return { sql: clauses.join(' AND '), params };
  }

  function agg(wsId: number, f: Filters, range: DateRange): Agg {
    const w = where(wsId, f, range);
    const row = sqlite
      .prepare(
        `SELECT
           COALESCE(SUM(net_sales), 0) netSales,
           COALESCE(SUM(gross_sales), 0) grossSales,
           COUNT(DISTINCT order_id) orders,
           COALESCE(SUM(quantity), 0) units,
           COALESCE(SUM(refunds), 0) refunds,
           COALESCE(SUM(discounts), 0) discounts,
           COALESCE(SUM(CASE WHEN cost IS NOT NULL THEN net_sales END), 0) costedNet,
           COALESCE(SUM(cost), 0) cost,
           SUM(CASE WHEN cost IS NOT NULL THEN 1 ELSE 0 END) costedRows,
           COUNT(*) rows
         FROM transactions WHERE ${w.sql}`
      )
      .get(...w.params) as Agg;
    return row;
  }

  function repeatRate(wsId: number, f: Filters, range: DateRange): number | null {
    const w = where(wsId, f, range);
    const row = sqlite
      .prepare(
        `WITH in_range AS (
           SELECT DISTINCT customer_id FROM transactions
           WHERE ${w.sql} AND customer_id IS NOT NULL
         ),
         firsts AS (
           SELECT customer_id, MIN(day) first_day FROM transactions
           WHERE workspace_id = ? AND customer_id IS NOT NULL GROUP BY customer_id
         )
         SELECT COUNT(*) total,
                SUM(CASE WHEN firsts.first_day < ? THEN 1 ELSE 0 END) returners
         FROM in_range JOIN firsts USING (customer_id)`
      )
      .get(...w.params, wsId, range.from) as { total: number; returners: number };
    if (!row.total) return null;
    return row.returners / row.total;
  }

  function bucketExpr(granularity: 'day' | 'week' | 'month'): string {
    if (granularity === 'day') return 'day';
    if (granularity === 'week') return "date(day, '-6 days', 'weekday 1')";
    return 'substr(day, 1, 7)';
  }

  interface BucketRow {
    period: string;
    netSales: number;
    grossSales: number;
    orders: number;
    units: number;
    discounts: number;
    refunds: number;
  }

  function buckets(wsId: number, f: Filters, range: DateRange, granularity: 'day' | 'week' | 'month'): BucketRow[] {
    const w = where(wsId, f, range);
    return sqlite
      .prepare(
        `SELECT ${bucketExpr(granularity)} period,
                ROUND(COALESCE(SUM(net_sales), 0), 2) netSales,
                ROUND(COALESCE(SUM(gross_sales), 0), 2) grossSales,
                COUNT(DISTINCT order_id) orders,
                COALESCE(SUM(quantity), 0) units,
                ROUND(COALESCE(SUM(discounts), 0), 2) discounts,
                ROUND(COALESCE(SUM(refunds), 0), 2) refunds
         FROM transactions WHERE ${w.sql}
         GROUP BY period ORDER BY period`
      )
      .all(...w.params) as BucketRow[];
  }

  function getFilters(req: { query: unknown; auth: { wsId: number } }): { f: Filters; range: DateRange; prev: DateRange | null } {
    const f = parse(FiltersSchema, req.query, 'filters');
    if (f.from > f.to) throw new HttpError(400, 'bad_range', 'The start date is after the end date.');
    if (rangeDays({ from: f.from, to: f.to }) > 1100) throw new HttpError(400, 'bad_range', 'Date range is too large (max 3 years).');
    const range = { from: f.from, to: f.to };
    return { f, range, prev: comparisonRange(range, f.compare) };
  }

  /* --------------------------------- summary -------------------------------- */

  r.get(
    '/summary',
    h((req, res) => {
      const { f, range, prev } = getFilters(req);
      const wsId = req.auth.wsId;
      const cur = agg(wsId, f, range);
      const before = prev ? agg(wsId, f, prev) : null;
      const curRepeat = repeatRate(wsId, f, range);
      const prevRepeat = prev ? repeatRate(wsId, f, prev) : null;

      const granularity = granularityFor(range);
      const series = buckets(wsId, f, range, granularity);

      const val = (a: Agg | null, key: string): number | null => {
        if (!a) return null;
        switch (key) {
          case 'netSales': return a.netSales;
          case 'grossSales': return a.grossSales;
          case 'orders': return a.orders;
          case 'unitsSold': return a.units;
          case 'avgOrderValue': return a.orders ? a.netSales / a.orders : null;
          case 'refundRate': return a.grossSales ? a.refunds / a.grossSales : null;
          case 'discountRate': return a.grossSales ? a.discounts / a.grossSales : null;
          case 'grossMargin': return a.costedRows > 0 && a.costedNet > 0 ? (a.costedNet - a.cost) / a.costedNet : null;
          default: return null;
        }
      };

      const sparkFor = (key: string): number[] =>
        series.map((b) => {
          switch (key) {
            case 'netSales': return b.netSales;
            case 'grossSales': return b.grossSales;
            case 'orders': return b.orders;
            case 'unitsSold': return b.units;
            case 'avgOrderValue': return b.orders ? b.netSales / b.orders : 0;
            case 'refundRate': return b.grossSales ? b.refunds / b.grossSales : 0;
            case 'discountRate': return b.grossSales ? b.discounts / b.grossSales : 0;
            default: return 0;
          }
        });

      const kpis: KpiValue[] = KPI_KEYS.map((key) => {
        const current = key === 'repeatCustomerRate' ? curRepeat : val(cur, key);
        const previous = key === 'repeatCustomerRate' ? prevRepeat : val(before, key);
        return {
          key,
          current,
          previous,
          change: current !== null && previous !== null ? current - previous : null,
          changePct: current !== null && previous !== null ? pctChange(current, previous) : null,
          spark: key === 'repeatCustomerRate' || key === 'grossMargin' ? [] : sparkFor(key),
        };
      });

      const currency = (
        sqlite
          .prepare('SELECT currency FROM transactions WHERE workspace_id = ? AND currency IS NOT NULL GROUP BY currency ORDER BY COUNT(*) DESC LIMIT 1')
          .get(wsId) as { currency: string } | undefined
      )?.currency ?? null;

      res.json({
        filters: f,
        comparisonRange: prev,
        kpis,
        currency,
        transactionCount: cur.rows,
      });
    })
  );

  /* -------------------------------- timeseries ------------------------------- */

  r.get(
    '/timeseries',
    h((req, res) => {
      const { f, range, prev } = getFilters(req);
      const wsId = req.auth.wsId;
      const granularity = granularityFor(range);
      const series = buckets(wsId, f, range, granularity);
      const comparison = prev ? buckets(wsId, f, prev, granularity) : null;

      let anomalies: { period: string; metric: 'netSales'; zScore: number; direction: 'high' | 'low' }[] = [];
      if (granularity === 'day' && series.length >= 14) {
        const weekdays = series.map((b) => new Date(`${b.period}T00:00:00Z`).getUTCDay());
        anomalies = detectAnomalies(series.map((b) => b.netSales), { weekdays })
          .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
          .slice(0, 8)
          .map((a) => ({
            period: series[a.index]!.period,
            metric: 'netSales' as const,
            zScore: a.zScore,
            direction: a.direction,
          }))
          .sort((a, b) => a.period.localeCompare(b.period));
      }
      res.json({ granularity, series, comparison, anomalies });
    })
  );

  /* --------------------------- timeseries by dimension ------------------------ */

  const TimeseriesByQuery = z.object({
    dimension: z.enum(['channel', 'category', 'store', 'country']),
    limit: z.coerce.number().int().min(1).max(6).default(3),
  });

  r.get(
    '/timeseries-by',
    h((req, res) => {
      const { f, range } = getFilters(req);
      const { dimension, limit } = parse(TimeseriesByQuery, req.query, 'timeseries query');
      const wsId = req.auth.wsId;
      const granularity = granularityFor(range);
      const col: Record<string, string> = {
        channel: "COALESCE(channel, 'Unattributed')",
        category: "COALESCE(category, 'Uncategorized')",
        store: "COALESCE(store, 'No store')",
        country: "COALESCE(country, 'Unknown')",
      };
      const dim = col[dimension]!;
      const w = where(wsId, f, range);
      const top = (
        sqlite
          .prepare(`SELECT ${dim} k FROM transactions WHERE ${w.sql} GROUP BY ${dim} ORDER BY SUM(net_sales) DESC LIMIT ?`)
          .all(...w.params, limit) as { k: string }[]
      ).map((x) => x.k);
      const rows = sqlite
        .prepare(
          `SELECT ${bucketExpr(granularity)} period, ${dim} k, ROUND(SUM(net_sales), 2) net
           FROM transactions WHERE ${w.sql} GROUP BY period, k ORDER BY period`
        )
        .all(...w.params) as { period: string; k: string; net: number }[];

      const periods = [...new Set(rows.map((x) => x.period))].sort();
      const series = periods.map((period) => {
        const values: Record<string, number> = {};
        let other = 0;
        for (const row of rows) {
          if (row.period !== period) continue;
          if (top.includes(row.k)) values[row.k] = row.net;
          else other += row.net;
        }
        return { period, values, other: Math.round(other * 100) / 100 };
      });
      res.json({ granularity, keys: top, series });
    })
  );

  /* -------------------------------- breakdown -------------------------------- */

  const BreakdownQuery = z.object({ dimension: z.enum(['category', 'product', 'channel', 'store', 'country', 'customer', 'import', 'dayOfWeek', 'hourOfDay']), limit: z.coerce.number().int().min(1).max(500).default(50) });

  r.get(
    '/breakdown',
    h((req, res) => {
      const { f, range, prev } = getFilters(req);
      const { dimension, limit } = parse(BreakdownQuery, req.query, 'breakdown query');
      const wsId = req.auth.wsId;

      const dims: Record<BreakdownDimension, { key: string; label?: string; order?: string; max?: number }> = {
        category: { key: "COALESCE(category, 'Uncategorized')" },
        product: { key: 'product_name' },
        channel: { key: "COALESCE(channel, 'Unattributed')" },
        store: { key: "COALESCE(store, 'No store')" },
        country: { key: "COALESCE(country, 'Unknown')" },
        customer: { key: "COALESCE(customer_id, '—')", label: "COALESCE(MAX(customer_name), 'Unidentified')" },
        import: { key: "CAST(COALESCE(import_job_id, 0) AS TEXT)" },
        dayOfWeek: { key: "strftime('%w', day)", order: 'key', max: 7 },
        hourOfDay: { key: "strftime('%H', ts)", order: 'key', max: 24 },
      };
      const d = dims[dimension];
      const w = where(wsId, f, range);
      const rows = sqlite
        .prepare(
          `SELECT ${d.key} key, ${d.label ?? d.key} label,
                  ROUND(COALESCE(SUM(net_sales), 0), 2) netSales,
                  ROUND(COALESCE(SUM(gross_sales), 0), 2) grossSales,
                  COUNT(DISTINCT order_id) orders,
                  COALESCE(SUM(quantity), 0) units,
                  ROUND(COALESCE(SUM(refunds), 0), 2) refunds,
                  ROUND(COALESCE(SUM(discounts), 0), 2) discounts,
                  ROUND(SUM(cost), 2) cost
           FROM transactions WHERE ${w.sql}
           GROUP BY ${d.key}
           ORDER BY ${d.order ?? 'netSales DESC'}
           LIMIT ?`
        )
        .all(...w.params, d.max ?? limit) as {
        key: string; label: string; netSales: number; grossSales: number; orders: number;
        units: number; refunds: number; discounts: number; cost: number | null;
      }[];

      // previous-period net sales for the same keys
      let prevMap = new Map<string, number>();
      if (prev) {
        const wp = where(wsId, f, prev);
        const prevRows = sqlite
          .prepare(
            `SELECT ${d.key} key, ROUND(COALESCE(SUM(net_sales), 0), 2) netSales
             FROM transactions WHERE ${wp.sql} GROUP BY ${d.key}`
          )
          .all(...wp.params) as { key: string; netSales: number }[];
        prevMap = new Map(prevRows.map((p) => [p.key, p.netSales]));
      }

      // import labels
      let importNames = new Map<string, string>();
      if (dimension === 'import') {
        const jobs = sqlite.prepare('SELECT id, file_name FROM import_jobs WHERE workspace_id = ?').all(wsId) as { id: number; file_name: string }[];
        importNames = new Map(jobs.map((j) => [String(j.id), j.file_name]));
      }

      const total = rows.reduce((a, x) => a + x.netSales, 0);
      res.json({
        dimension,
        totalNetSales: Math.round(total * 100) / 100,
        rows: rows.map((x) => ({
          ...x,
          label:
            dimension === 'dayOfWeek' ? WEEKDAYS[Number(x.key)]! :
            dimension === 'hourOfDay' ? `${x.key}:00` :
            dimension === 'import' ? (importNames.get(x.key) ?? 'Sample dataset') :
            x.label,
          cost: x.cost ?? null,
          previousNetSales: prev ? (prevMap.get(x.key) ?? 0) : null,
        })),
      });
    })
  );

  /* -------------------------------- customers -------------------------------- */

  r.get(
    '/customers',
    h((req, res) => {
      const { f, range } = getFilters(req);
      const wsId = req.auth.wsId;
      const w = where(wsId, f, range);

      const split = sqlite
        .prepare(
          `WITH firsts AS (
             SELECT customer_id, MIN(day) first_day FROM transactions
             WHERE workspace_id = ? AND customer_id IS NOT NULL GROUP BY customer_id
           )
           SELECT
             SUM(CASE WHEN firsts.first_day >= ? THEN 1 ELSE 0 END) newCustomers,
             SUM(CASE WHEN firsts.first_day < ? THEN 1 ELSE 0 END) returningCustomers,
             ROUND(SUM(CASE WHEN firsts.first_day >= ? THEN t.net ELSE 0 END), 2) newRevenue,
             ROUND(SUM(CASE WHEN firsts.first_day < ? THEN t.net ELSE 0 END), 2) returningRevenue
           FROM (
             SELECT customer_id, SUM(net_sales) net FROM transactions
             WHERE ${w.sql} AND customer_id IS NOT NULL GROUP BY customer_id
           ) t JOIN firsts USING (customer_id)`
        )
        .get(wsId, f.from, f.from, f.from, f.from, ...w.params) as {
        newCustomers: number | null; returningCustomers: number | null;
        newRevenue: number | null; returningRevenue: number | null;
      };

      const repeat = sqlite
        .prepare(
          `SELECT COUNT(*) total, SUM(CASE WHEN n >= 2 THEN 1 ELSE 0 END) repeaters FROM (
             SELECT customer_id, COUNT(DISTINCT order_id) n FROM transactions
             WHERE ${w.sql} AND customer_id IS NOT NULL GROUP BY customer_id
           )`
        )
        .get(...w.params) as { total: number; repeaters: number | null };

      const bandRows = sqlite
        .prepare(
          `SELECT
             CASE
               WHEN net < 50 THEN 'Under $50'
               WHEN net < 200 THEN '$50 – $200'
               WHEN net < 500 THEN '$200 – $500'
               WHEN net < 2000 THEN '$500 – $2,000'
               ELSE '$2,000+'
             END band,
             COUNT(*) customers, ROUND(SUM(net), 2) revenue
           FROM (
             SELECT customer_id, SUM(net_sales) net FROM transactions
             WHERE ${w.sql} AND customer_id IS NOT NULL GROUP BY customer_id
           ) GROUP BY band`
        )
        .all(...w.params) as { band: string; customers: number; revenue: number }[];
      const bandOrder = ['Under $50', '$50 – $200', '$200 – $500', '$500 – $2,000', '$2,000+'];
      bandRows.sort((a, b) => bandOrder.indexOf(a.band) - bandOrder.indexOf(b.band));

      const wt = where(wsId, f, range, 't');
      const top = sqlite
        .prepare(
          `SELECT t.customer_id customerId, COALESCE(MAX(t.customer_name), t.customer_id) name,
                  COUNT(DISTINCT t.order_id) orders, ROUND(SUM(t.net_sales), 2) netSales,
                  MIN(fst.first_day) firstSeen, MAX(t.day) lastSeen
           FROM transactions t
           JOIN (SELECT customer_id, MIN(day) first_day FROM transactions WHERE workspace_id = ? AND customer_id IS NOT NULL GROUP BY customer_id) fst
             ON fst.customer_id = t.customer_id
           WHERE ${wt.sql} AND t.customer_id IS NOT NULL
           GROUP BY t.customer_id ORDER BY netSales DESC LIMIT 10`
        )
        .all(wsId, ...wt.params) as {
        customerId: string; name: string; orders: number; netSales: number; firstSeen: string; lastSeen: string;
      }[];

      res.json({
        identified: (split.newCustomers ?? 0) + (split.returningCustomers ?? 0) > 0,
        newCustomers: split.newCustomers ?? 0,
        returningCustomers: split.returningCustomers ?? 0,
        newRevenue: split.newRevenue ?? 0,
        returningRevenue: split.returningRevenue ?? 0,
        repeatPurchaseRate: repeat.total ? (repeat.repeaters ?? 0) / repeat.total : null,
        valueBands: bandRows,
        topCustomers: top,
      });
    })
  );

  /* --------------------------------- insights -------------------------------- */

  r.get(
    '/insights',
    h((req, res) => {
      const { f, range, prev } = getFilters(req);
      const wsId = req.auth.wsId;
      const cur = agg(wsId, f, range);
      const before = prev ? agg(wsId, f, prev) : null;

      const deltasFor = (groupExpr: string, withRefunds = false) => {
        const w = where(wsId, f, range);
        const curRows = sqlite
          .prepare(
            `SELECT ${groupExpr} key, ${groupExpr} label, ROUND(SUM(net_sales), 2) net${withRefunds ? ', ROUND(SUM(refunds), 2) ref' : ''}
             FROM transactions WHERE ${w.sql} GROUP BY ${groupExpr} ORDER BY net DESC LIMIT 40`
          )
          .all(...w.params) as { key: string; label: string; net: number; ref?: number }[];
        let prevRows: { key: string; net: number; ref?: number }[] = [];
        if (prev) {
          const wp = where(wsId, f, prev);
          prevRows = sqlite
            .prepare(
              `SELECT ${groupExpr} key, ROUND(SUM(net_sales), 2) net${withRefunds ? ', ROUND(SUM(refunds), 2) ref' : ''}
               FROM transactions WHERE ${wp.sql} GROUP BY ${groupExpr}`
            )
            .all(...wp.params) as { key: string; net: number; ref?: number }[];
        }
        const prevMap = new Map(prevRows.map((p) => [p.key, p]));
        return curRows.map((c) => ({
          key: c.key,
          label: c.label,
          current: c.net,
          previous: prevMap.get(c.key)?.net ?? 0,
          currentRefunds: c.ref ?? 0,
          previousRefunds: prevMap.get(c.key)?.ref ?? 0,
        }));
      };

      // weekday weekly totals (day-of-week streaks) over the last 6 full weeks of the range
      const weekdayWeeklyTotals: Partial<Record<number, number[]>> = {};
      if (rangeDays(range) >= 28) {
        const w = where(wsId, f, range);
        const rows = sqlite
          .prepare(
            `SELECT strftime('%w', day) wd, date(day, '-6 days', 'weekday 1') week, ROUND(SUM(net_sales), 2) net
             FROM transactions WHERE ${w.sql} GROUP BY wd, week ORDER BY week`
          )
          .all(...w.params) as { wd: string; week: string; net: number }[];
        for (const row of rows) {
          const wd = Number(row.wd);
          (weekdayWeeklyTotals[wd] ??= []).push(row.net);
        }
        for (const wd of Object.keys(weekdayWeeklyTotals)) {
          const arr = weekdayWeeklyTotals[Number(wd)]!;
          // drop possibly-partial first/last weeks, keep last 6
          weekdayWeeklyTotals[Number(wd)] = arr.slice(1, -1).slice(-6);
        }
      }

      const custSplit = sqlite
        .prepare(
          `WITH firsts AS (
             SELECT customer_id, MIN(day) first_day FROM transactions
             WHERE workspace_id = ? AND customer_id IS NOT NULL GROUP BY customer_id
           )
           SELECT
             SUM(CASE WHEN firsts.first_day >= ? THEN 1 ELSE 0 END) newCount,
             SUM(CASE WHEN firsts.first_day < ? THEN 1 ELSE 0 END) returningCount,
             ROUND(SUM(CASE WHEN firsts.first_day >= ? THEN t.net ELSE 0 END), 2) newRevenue,
             ROUND(SUM(CASE WHEN firsts.first_day < ? THEN t.net ELSE 0 END), 2) returningRevenue
           FROM (
             SELECT customer_id, SUM(net_sales) net FROM transactions
             WHERE ${where(wsId, f, range).sql} AND customer_id IS NOT NULL GROUP BY customer_id
           ) t JOIN firsts USING (customer_id)`
        )
        .get(wsId, f.from, f.from, f.from, f.from, ...where(wsId, f, range).params) as {
        newCount: number | null; returningCount: number | null; newRevenue: number | null; returningRevenue: number | null;
      };

      const days = rangeDays(range);
      const comparisonLabel =
        f.compare === 'previous-year'
          ? `the same dates last year (${prev?.from} – ${prev?.to})`
          : `the previous ${days} days (${prev?.from} – ${prev?.to})`;

      const filterQuery = new URLSearchParams(
        Object.entries(f).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)])
      ).toString();

      const input: EngineInput = {
        comparisonLabel,
        filterQuery,
        current: cur,
        previous: before,
        byProduct: deltasFor('product_name'),
        byCategory: deltasFor("COALESCE(category, 'Uncategorized')", true),
        byChannel: deltasFor("COALESCE(channel, 'Unattributed')"),
        weekdayWeeklyTotals,
        customers:
          custSplit.newCount !== null
            ? {
                newCount: custSplit.newCount ?? 0,
                returningCount: custSplit.returningCount ?? 0,
                newRevenue: custSplit.newRevenue ?? 0,
                returningRevenue: custSplit.returningRevenue ?? 0,
              }
            : null,
      };

      res.json({ insights: prev ? generateInsights(input) : [] });
    })
  );

  /* ------------------------------- data quality ------------------------------ */

  r.get(
    '/data-quality',
    h((req, res) => {
      const wsId = req.auth.wsId;
      const total = (sqlite.prepare('SELECT COUNT(*) n FROM transactions WHERE workspace_id = ?').get(wsId) as { n: number }).n;
      const dup = sqlite
        .prepare(
          `SELECT COALESCE(SUM(n - 1), 0) extra FROM (
             SELECT COUNT(*) n FROM transactions
             WHERE workspace_id = ? AND transaction_id IS NOT NULL
             GROUP BY transaction_id HAVING COUNT(*) > 1
           )`
        )
        .get(wsId) as { extra: number };

      const missing = sqlite
        .prepare(
          `SELECT
             SUM(CASE WHEN category IS NULL THEN 1 ELSE 0 END) category,
             SUM(CASE WHEN customer_id IS NULL THEN 1 ELSE 0 END) customerId,
             SUM(CASE WHEN channel IS NULL THEN 1 ELSE 0 END) channel,
             SUM(CASE WHEN store IS NULL AND channel = 'store' THEN 1 ELSE 0 END) storeOnStoreChannel,
             SUM(CASE WHEN country IS NULL THEN 1 ELSE 0 END) country,
             SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) cost,
             SUM(CASE WHEN transaction_id IS NULL THEN 1 ELSE 0 END) transactionId,
             SUM(CASE WHEN net_sales < 0 THEN 1 ELSE 0 END) negativeNet
           FROM transactions WHERE workspace_id = ?`
        )
        .get(wsId) as Record<string, number | null>;

      const imports = sqlite
        .prepare(
          `SELECT j.id, j.file_name fileName, j.status, j.total_rows totalRows, j.imported_rows importedRows,
                  j.rejected_rows rejectedRows, j.created_at createdAt, j.completed_at completedAt,
                  MIN(t.day) dateMin, MAX(t.day) dateMax
           FROM import_jobs j LEFT JOIN transactions t ON t.import_job_id = j.id
           WHERE j.workspace_id = ? GROUP BY j.id ORDER BY j.created_at DESC`
        )
        .all(wsId);

      const { negativeNet, ...missingFields } = missing;
      res.json({
        transactionCount: total,
        duplicateTransactionIds: dup.extra,
        missingFieldCounts: Object.fromEntries(Object.entries(missingFields).map(([k, v]) => [k, v ?? 0])),
        uncategorizedRows: missing.category ?? 0,
        unidentifiedCustomerRows: missing.customerId ?? 0,
        negativeNetRows: negativeNet ?? 0,
        imports,
      });
    })
  );

  /* ----------------------------------- meta ---------------------------------- */

  r.get(
    '/meta',
    h((req, res) => {
      const wsId = req.auth.wsId;
      const list = (col: string) =>
        (
          sqlite
            .prepare(`SELECT DISTINCT ${col} v FROM transactions WHERE workspace_id = ? AND ${col} IS NOT NULL ORDER BY v`)
            .all(wsId) as { v: string }[]
        ).map((r2) => r2.v);
      const bounds = sqlite
        .prepare('SELECT MIN(day) minDay, MAX(day) maxDay FROM transactions WHERE workspace_id = ?')
        .get(wsId) as { minDay: string | null; maxDay: string | null };
      const products = (
        sqlite
          .prepare(
            `SELECT product_name v FROM transactions WHERE workspace_id = ?
             GROUP BY product_name ORDER BY SUM(net_sales) DESC LIMIT 200`
          )
          .all(wsId) as { v: string }[]
      ).map((r2) => r2.v);
      const imports = sqlite
        .prepare("SELECT id, file_name fileName FROM import_jobs WHERE workspace_id = ? AND status = 'complete' ORDER BY id DESC")
        .all(wsId);
      const hasCategoryNulls = (sqlite.prepare('SELECT COUNT(*) n FROM transactions WHERE workspace_id = ? AND category IS NULL').get(wsId) as { n: number }).n > 0;
      const categories = list('category');
      if (hasCategoryNulls) categories.push('Uncategorized');
      res.json({
        categories,
        channels: list('channel'),
        stores: list('store'),
        countries: list('country'),
        products,
        imports,
        minDay: bounds.minDay,
        maxDay: bounds.maxDay,
      });
    })
  );

  return r;
}
