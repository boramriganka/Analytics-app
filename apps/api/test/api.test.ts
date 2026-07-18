import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import type { Server } from 'node:http';
import { openDb } from '../src/db/client.js';
import { seedDemoWorkspace } from '../src/seed/seed.js';
import { buildApp } from '../src/app.js';

let server: Server;
let base: string;
let token: string;
let dbPath: string;

async function api(pathname: string, init: RequestInit = {}) {
  const res = await fetch(`${base}${pathname}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json();
  return { status: res.status, body };
}

beforeAll(async () => {
  dbPath = path.join(os.tmpdir(), `signalroom-test-${Date.now()}.db`);
  const { sqlite } = openDb(dbPath);
  seedDemoWorkspace(sqlite, { size: '25k' });
  const app = buildApp(sqlite);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

afterAll(() => {
  server?.close();
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(dbPath + suffix, { force: true });
});

describe('demo session', () => {
  it('issues a guest token without credentials', async () => {
    const { status, body } = await api('/api/demo/session', { method: 'POST' });
    expect(status).toBe(200);
    expect(body.token).toBeTruthy();
    expect(body.workspace.isDemo).toBe(true);
    token = body.token;
  });

  it('rejects analytics without a token', async () => {
    const saved = token;
    token = '';
    const { status, body } = await api('/api/analytics/summary?from=2026-06-01&to=2026-06-30');
    expect(status).toBe(401);
    expect(body.error.code).toBe('unauthenticated');
    token = saved;
  });
});

describe('analytics', () => {
  const range = () => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    return `from=${from}&to=${to}`;
  };

  it('summary returns all nine KPIs with comparisons', async () => {
    const { status, body } = await api(`/api/analytics/summary?${range()}`);
    expect(status).toBe(200);
    expect(body.kpis).toHaveLength(9);
    const net = body.kpis.find((k: { key: string }) => k.key === 'netSales');
    expect(net.current).toBeGreaterThan(0);
    expect(net.previous).toBeGreaterThan(0);
    expect(net.spark.length).toBeGreaterThan(20);
    const margin = body.kpis.find((k: { key: string }) => k.key === 'grossMargin');
    expect(margin.current).toBeGreaterThan(0.3); // seeded costs ≈ 40–60% of price
    expect(margin.current).toBeLessThan(0.75);
    expect(body.currency).toBe('USD');
  });

  it('filters change the numbers and are internally consistent', async () => {
    const all = await api(`/api/analytics/summary?${range()}`);
    const kitchen = await api(`/api/analytics/summary?${range()}&category=Kitchen`);
    const allNet = all.body.kpis[0].current;
    const kitchenNet = kitchen.body.kpis[0].current;
    expect(kitchenNet).toBeGreaterThan(0);
    expect(kitchenNet).toBeLessThan(allNet);

    // breakdown by category should sum (approximately) to the unfiltered total
    const bd = await api(`/api/analytics/breakdown?${range()}&dimension=category`);
    const sum = bd.body.rows.reduce((a: number, r: { netSales: number }) => a + r.netSales, 0);
    expect(Math.abs(sum - allNet)).toBeLessThan(1);
    const kitchenRow = bd.body.rows.find((r: { key: string }) => r.key === 'Kitchen');
    expect(Math.abs(kitchenRow.netSales - kitchenNet)).toBeLessThan(1);
  });

  it('timeseries returns aligned comparison and anomaly candidates', async () => {
    const { body } = await api(`/api/analytics/timeseries?${range()}`);
    expect(body.granularity).toBe('day');
    expect(body.series.length).toBeGreaterThan(25);
    expect(body.comparison.length).toBeGreaterThan(25);
    // the seeded flash-sale spike (21 days ago) should be detected
    expect(body.anomalies.length).toBeGreaterThan(0);
  });

  it('rejects an inverted date range with a structured error', async () => {
    const { status, body } = await api('/api/analytics/summary?from=2026-06-30&to=2026-06-01');
    expect(status).toBe(400);
    expect(body.error.code).toBe('bad_range');
  });

  it('produces deterministic insights from the seeded signals', async () => {
    const { body } = await api(`/api/analytics/insights?${range()}`);
    expect(Array.isArray(body.insights)).toBe(true);
    for (const ins of body.insights) {
      expect(['observation', 'hypothesis']).toContain(ins.kind);
      expect(ins.comparison).toBeTruthy();
      expect(ins.href).toMatch(/^\/app\//);
    }
  });
});

describe('imports', () => {
  let importId: number;

  it('creates a job, accepts valid rows, completes, and undoes', async () => {
    const created = await api('/api/imports', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'test.csv', totalRows: 2 }),
    });
    expect(created.status).toBe(201);
    importId = created.body.id;

    const rows = [
      { orderId: 'X-1', timestamp: '2026-06-01', productName: 'Test Chair', quantity: 1, grossSales: 100 },
      { orderId: 'X-2', timestamp: '2026-06-02', productName: 'Test Lamp', quantity: '2', grossSales: '$50.00', discounts: '5' },
    ];
    const posted = await api(`/api/imports/${importId}/rows`, { method: 'POST', body: JSON.stringify({ rows }) });
    expect(posted.status).toBe(200);
    expect(posted.body.imported).toBe(2);

    const done = await api(`/api/imports/${importId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ rejectedRows: 1 }),
    });
    expect(done.status).toBe(200);
    expect(done.body.status).toBe('complete');
    expect(done.body.dateMin).toBe('2026-06-01');
    expect(done.body.dateMax).toBe('2026-06-02');

    // imported rows are queryable, scoped by importId
    // grossSales is the LINE total: 100 + (50 − 5 discount) = 145
    const sum = await api(`/api/analytics/summary?from=2026-06-01&to=2026-06-02&importId=${importId}`);
    expect(sum.body.kpis[0].current).toBe(145);

    const undone = await api(`/api/imports/${importId}`, { method: 'DELETE' });
    expect(undone.body.removedTransactions).toBe(2);
    const after = await api(`/api/analytics/summary?from=2026-06-01&to=2026-06-02&importId=${importId}`);
    expect(after.body.kpis[0].current).toBe(0);
  });

  it('rejects malformed rows at the trust boundary', async () => {
    const created = await api('/api/imports', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'bad.csv', totalRows: 1 }),
    });
    const bad = await api(`/api/imports/${created.body.id}/rows`, {
      method: 'POST',
      body: JSON.stringify({ rows: [{ orderId: 'Y-1', timestamp: 'not-a-date', productName: 'X', quantity: 1, grossSales: 10 }] }),
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('validation_failed');
  });
});

describe('views and reports', () => {
  it('saves a view and builds a report end to end', async () => {
    const view = await api('/api/views', {
      method: 'POST',
      body: JSON.stringify({ name: 'June overview', route: '/app/overview', query: 'from=2026-06-01&to=2026-06-30' }),
    });
    expect(view.status).toBe(201);

    const report = await api('/api/reports', { method: 'POST', body: JSON.stringify({ title: 'June trading' }) });
    const reportId = report.body.id;

    const withBlock = await api(`/api/reports/${reportId}/blocks`, {
      method: 'POST',
      body: JSON.stringify({ type: 'chart', config: { chart: 'revenue', query: 'from=2026-06-01&to=2026-06-30' } }),
    });
    expect(withBlock.body.blocks).toHaveLength(1);

    const note = await api(`/api/reports/${reportId}/blocks`, {
      method: 'POST',
      body: JSON.stringify({ type: 'note', config: { text: 'Strong month.' } }),
    });
    const ids = note.body.blocks.map((b: { id: number }) => b.id);
    const reordered = await api(`/api/reports/${reportId}/blocks`, {
      method: 'PUT',
      body: JSON.stringify({ order: [ids[1], ids[0]] }),
    });
    expect(reordered.body.blocks[0].type).toBe('note');

    const list = await api('/api/reports');
    expect(list.body.reports.some((r: { id: number }) => r.id === reportId)).toBe(true);
  });
});

describe('demo reset', () => {
  it('reseeds the workspace', async () => {
    const { status, body } = await api('/api/demo/reset', { method: 'POST' });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
