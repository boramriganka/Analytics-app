import { Router } from 'express';
import { db } from './db.js';

export const analyticsRouter = Router();

const RANGES = { '7d': 7, '30d': 30, '90d': 90, '12m': 365, all: null };

// Returns [start, end) of the selected window plus the window immediately
// before it (same length) for period-over-period deltas.
function windows(range) {
  const days = range in RANGES ? RANGES[range] : 30;
  const end = new Date();
  if (days === null) {
    const first = db.prepare('SELECT MIN(created_at) m FROM orders').get().m;
    const start = first ? new Date(first) : new Date(end.getTime() - 86400000);
    return { start, end, prevStart: start, prevEnd: start, days: null };
  }
  const start = new Date(end.getTime() - days * 86400000);
  const prevStart = new Date(start.getTime() - days * 86400000);
  return { start, end, prevStart, prevEnd: start, days };
}

const iso = (d) => d.toISOString();

function periodStats(startIso, endIso) {
  const core = db
    .prepare(
      `SELECT COUNT(*) orders, COALESCE(SUM(total), 0) revenue
       FROM orders
       WHERE status = 'completed' AND created_at >= ? AND created_at < ?`
    )
    .get(startIso, endIso);
  const units = db
    .prepare(
      `SELECT COALESCE(SUM(oi.quantity), 0) units
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'completed' AND o.created_at >= ? AND o.created_at < ?`
    )
    .get(startIso, endIso);
  const customers = db
    .prepare(
      `SELECT COUNT(DISTINCT customer_id) n FROM orders
       WHERE created_at >= ? AND created_at < ?`
    )
    .get(startIso, endIso);
  const refunds = db
    .prepare(
      `SELECT COUNT(*) count, COALESCE(SUM(total), 0) amount FROM orders
       WHERE status = 'refunded' AND created_at >= ? AND created_at < ?`
    )
    .get(startIso, endIso);
  return {
    revenue: core.revenue,
    orders: core.orders,
    units: units.units,
    activeCustomers: customers.n,
    avgOrderValue: core.orders ? core.revenue / core.orders : 0,
    refundAmount: refunds.amount,
    refundCount: refunds.count,
  };
}

function delta(current, previous) {
  if (!previous) return null;
  return (current - previous) / previous;
}

analyticsRouter.get('/summary', (req, res) => {
  const { start, end, prevStart, prevEnd, days } = windows(req.query.range);
  const cur = periodStats(iso(start), iso(end));
  const prev = days === null ? null : periodStats(iso(prevStart), iso(prevEnd));
  res.json({
    range: req.query.range || '30d',
    ...cur,
    deltas: prev
      ? {
          revenue: delta(cur.revenue, prev.revenue),
          orders: delta(cur.orders, prev.orders),
          units: delta(cur.units, prev.units),
          activeCustomers: delta(cur.activeCustomers, prev.activeCustomers),
          avgOrderValue: delta(cur.avgOrderValue, prev.avgOrderValue),
          refundAmount: delta(cur.refundAmount, prev.refundAmount),
        }
      : null,
  });
});

analyticsRouter.get('/revenue', (req, res) => {
  const { start, end, days } = windows(req.query.range);
  // Daily buckets for short windows, monthly for long ones.
  const monthly = days === null || days > 120;
  const bucket = monthly ? "strftime('%Y-%m', created_at)" : "strftime('%Y-%m-%d', created_at)";
  const rows = db
    .prepare(
      `SELECT ${bucket} period,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN total END), 0) revenue,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) orders
       FROM orders
       WHERE created_at >= ? AND created_at < ?
       GROUP BY period ORDER BY period`
    )
    .all(iso(start), iso(end));
  res.json({ granularity: monthly ? 'month' : 'day', series: rows });
});

analyticsRouter.get('/categories', (req, res) => {
  const { start, end } = windows(req.query.range);
  const rows = db
    .prepare(
      `SELECT p.category,
              ROUND(SUM(oi.quantity * oi.unit_price), 2) revenue,
              SUM(oi.quantity) units
       FROM order_items oi
       JOIN orders o   ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE o.status = 'completed' AND o.created_at >= ? AND o.created_at < ?
       GROUP BY p.category ORDER BY revenue DESC`
    )
    .all(iso(start), iso(end));
  res.json({ categories: rows });
});

analyticsRouter.get('/channels', (req, res) => {
  const { start, end } = windows(req.query.range);
  const rows = db
    .prepare(
      `SELECT channel, COUNT(*) orders, ROUND(SUM(total), 2) revenue
       FROM orders
       WHERE status = 'completed' AND created_at >= ? AND created_at < ?
       GROUP BY channel ORDER BY revenue DESC`
    )
    .all(iso(start), iso(end));
  res.json({ channels: rows });
});

analyticsRouter.get('/products/top', (req, res) => {
  const { start, end } = windows(req.query.range);
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 50);
  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.category, p.price,
              SUM(oi.quantity) units,
              ROUND(SUM(oi.quantity * oi.unit_price), 2) revenue
       FROM order_items oi
       JOIN orders o   ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE o.status = 'completed' AND o.created_at >= ? AND o.created_at < ?
       GROUP BY p.id ORDER BY revenue DESC LIMIT ?`
    )
    .all(iso(start), iso(end), limit);
  res.json({ products: rows });
});

analyticsRouter.get('/customers/top', (req, res) => {
  const { start, end } = windows(req.query.range);
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 50);
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.city, c.country,
              COUNT(o.id) orders,
              ROUND(SUM(o.total), 2) revenue
       FROM orders o JOIN customers c ON c.id = o.customer_id
       WHERE o.status = 'completed' AND o.created_at >= ? AND o.created_at < ?
       GROUP BY c.id ORDER BY revenue DESC LIMIT ?`
    )
    .all(iso(start), iso(end), limit);
  res.json({ customers: rows });
});

analyticsRouter.get('/orders/recent', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  const rows = db
    .prepare(
      `SELECT o.id, o.channel, o.status, o.total, o.created_at,
              c.name customer,
              (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) items
       FROM orders o JOIN customers c ON c.id = o.customer_id
       ORDER BY o.created_at DESC LIMIT ?`
    )
    .all(limit);
  res.json({ orders: rows });
});

analyticsRouter.get('/products', (req, res) => {
  const { start, end } = windows(req.query.range || 'all');
  const rows = db
    .prepare(
      `SELECT p.id, p.sku, p.name, p.category, p.price, p.cost,
              COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity END), 0) units,
              ROUND(COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity * oi.unit_price END), 0), 2) revenue,
              ROUND(COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity * (oi.unit_price - p.cost) END), 0), 2) profit
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id
              AND o.status = 'completed' AND o.created_at >= ? AND o.created_at < ?
       GROUP BY p.id ORDER BY revenue DESC`
    )
    .all(iso(start), iso(end));
  res.json({ products: rows });
});

analyticsRouter.get('/customers', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.email, c.city, c.country, c.created_at,
              COUNT(o.id) orders,
              ROUND(COALESCE(SUM(o.total), 0), 2) revenue,
              MAX(o.created_at) last_order
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completed'
       GROUP BY c.id ORDER BY revenue DESC LIMIT ?`
    )
    .all(limit);
  res.json({ customers: rows });
});
