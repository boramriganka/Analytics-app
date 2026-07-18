import type Database from 'better-sqlite3';
import { openDb } from '../db/client.js';
import { generateDataset, type SeedSize } from './generate.js';

export const DEMO_WORKSPACE_NAME = 'Harbor & Field';

/**
 * Idempotent: creates (or refreshes with `force`) the shared demo workspace.
 * Returns the demo workspace id.
 */
export function seedDemoWorkspace(
  sqlite: Database.Database,
  opts: { size?: SeedSize; force?: boolean; log?: (msg: string) => void } = {}
): number {
  const size = opts.size ?? ((process.env.SEED_SIZE as SeedSize) || '25k');
  const log = opts.log ?? (() => {});
  const now = new Date().toISOString();

  let ws = sqlite.prepare('SELECT id FROM workspaces WHERE is_demo = 1').get() as { id: number } | undefined;
  if (!ws) {
    const info = sqlite
      .prepare('INSERT INTO workspaces (name, owner_user_id, is_demo, created_at) VALUES (?, NULL, 1, ?)')
      .run(DEMO_WORKSPACE_NAME, now);
    ws = { id: Number(info.lastInsertRowid) };
  }
  const wsId = ws.id;

  const existing = sqlite
    .prepare('SELECT COUNT(*) n FROM transactions WHERE workspace_id = ?')
    .get(wsId) as { n: number };
  if (existing.n > 0 && !opts.force) {
    log(`Demo workspace #${wsId} already seeded (${existing.n} transactions) — skipping. Use force to reseed.`);
    return wsId;
  }

  log(`Generating ${size} dataset…`);
  const rows = generateDataset(size);

  const insertTx = sqlite.prepare(`
    INSERT INTO transactions (
      workspace_id, import_job_id, transaction_id, order_id, ts, day,
      product_id, product_name, category, quantity,
      gross_sales, discounts, refunds, net_sales, cost,
      customer_id, customer_name, channel, store, country, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  sqlite.transaction(() => {
    // wipe workspace-scoped state so reset is a true reset
    sqlite.prepare('DELETE FROM transactions WHERE workspace_id = ?').run(wsId);
    sqlite
      .prepare('DELETE FROM report_blocks WHERE report_id IN (SELECT id FROM reports WHERE workspace_id = ?)')
      .run(wsId);
    for (const table of ['reports', 'saved_views', 'import_mappings', 'import_jobs']) {
      sqlite.prepare(`DELETE FROM ${table} WHERE workspace_id = ?`).run(wsId);
    }

    const jobInfo = sqlite
      .prepare(
        `INSERT INTO import_jobs (workspace_id, file_name, status, total_rows, imported_rows, rejected_rows, created_at, completed_at)
         VALUES (?, 'sample-dataset.csv', 'complete', ?, ?, 0, ?, ?)`
      )
      .run(wsId, rows.length, rows.length, now, now);
    const jobId = Number(jobInfo.lastInsertRowid);

    for (const r of rows) {
      insertTx.run(
        wsId, jobId, r.transactionId, r.orderId, r.ts, r.day,
        r.productId, r.productName, r.category, r.quantity,
        r.grossSales, r.discounts, r.refunds, r.netSales, r.cost,
        r.customerId, r.customerName, r.channel, r.store, r.country, r.currency
      );
    }
  })();

  const stats = sqlite
    .prepare(
      "SELECT COUNT(*) lines, COUNT(DISTINCT order_id) orders, ROUND(SUM(net_sales)) net FROM transactions WHERE workspace_id = ?"
    )
    .get(wsId) as { lines: number; orders: number; net: number };
  log(`Seeded workspace #${wsId}: ${stats.lines} lines, ${stats.orders} orders, $${Number(stats.net).toLocaleString()} net sales.`);
  return wsId;
}

// CLI entry: npm run seed [-- --force --size=25k]
const isCli = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');
if (isCli) {
  const force = process.argv.includes('--force');
  const sizeArg = process.argv.find((a) => a.startsWith('--size='))?.split('=')[1] as SeedSize | undefined;
  const { sqlite } = openDb();
  seedDemoWorkspace(sqlite, { force, size: sizeArg, log: console.log });
  sqlite.close();
}
