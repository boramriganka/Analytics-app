import { Router } from 'express';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { ImportRowsPayload } from '@signalroom/schemas';
import { h, parse, HttpError } from '../lib/http.js';

const CreateImport = z.object({
  fileName: z.string().trim().min(1).max(200),
  totalRows: z.number().int().min(0),
});
const CompleteImport = z.object({ rejectedRows: z.number().int().min(0) });
const CreateMapping = z.object({
  name: z.string().trim().min(1).max(100),
  mapping: z.record(z.string(), z.string()),
});

export function importsRouter(sqlite: Database.Database): Router {
  const r = Router();

  function getJob(wsId: number, id: number) {
    const job = sqlite
      .prepare('SELECT * FROM import_jobs WHERE id = ? AND workspace_id = ?')
      .get(id, wsId) as
      | { id: number; status: string; total_rows: number; imported_rows: number; rejected_rows: number }
      | undefined;
    if (!job) throw new HttpError(404, 'import_not_found', 'That import does not exist in this workspace.');
    return job;
  }

  const jobJson = (wsId: number, id: number) => {
    const row = sqlite
      .prepare(
        `SELECT j.id, j.file_name fileName, j.status, j.total_rows totalRows, j.imported_rows importedRows,
                j.rejected_rows rejectedRows, j.created_at createdAt, j.completed_at completedAt,
                MIN(t.day) dateMin, MAX(t.day) dateMax
         FROM import_jobs j LEFT JOIN transactions t ON t.import_job_id = j.id
         WHERE j.id = ? AND j.workspace_id = ? GROUP BY j.id`
      )
      .get(id, wsId);
    return row;
  };

  r.get(
    '/imports',
    h((req, res) => {
      const rows = sqlite
        .prepare(
          `SELECT j.id, j.file_name fileName, j.status, j.total_rows totalRows, j.imported_rows importedRows,
                  j.rejected_rows rejectedRows, j.created_at createdAt, j.completed_at completedAt,
                  MIN(t.day) dateMin, MAX(t.day) dateMax
           FROM import_jobs j LEFT JOIN transactions t ON t.import_job_id = j.id
           WHERE j.workspace_id = ? GROUP BY j.id ORDER BY j.created_at DESC`
        )
        .all(req.auth.wsId);
      res.json({ imports: rows });
    })
  );

  r.post(
    '/imports',
    h((req, res) => {
      const body = parse(CreateImport, req.body, 'import');
      const info = sqlite
        .prepare(
          `INSERT INTO import_jobs (workspace_id, file_name, status, total_rows, created_at)
           VALUES (?, ?, 'pending', ?, ?)`
        )
        .run(req.auth.wsId, body.fileName, body.totalRows, new Date().toISOString());
      res.status(201).json({ id: Number(info.lastInsertRowid) });
    })
  );

  const insertTx = sqlite.prepare(`
    INSERT INTO transactions (
      workspace_id, import_job_id, transaction_id, order_id, ts, day,
      product_id, product_name, category, quantity,
      gross_sales, discounts, refunds, net_sales, cost,
      customer_id, customer_name, channel, store, country, currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  r.post(
    '/imports/:id/rows',
    h((req, res) => {
      const id = Number(req.params.id);
      const job = getJob(req.auth.wsId, id);
      if (job.status !== 'pending' && job.status !== 'importing') {
        throw new HttpError(409, 'import_closed', 'This import is already finalized.');
      }
      // Server-side re-validation with the same shared schema the client used.
      const { rows } = parse(ImportRowsPayload, req.body, 'import rows');
      sqlite.transaction(() => {
        for (const row of rows) {
          insertTx.run(
            req.auth.wsId, id, row.transactionId ?? null, row.orderId, row.timestamp, row.timestamp.slice(0, 10),
            row.productId ?? null, row.productName, row.category ?? null, row.quantity,
            row.grossSales, row.discounts, row.refunds, row.netSales, row.cost ?? null,
            row.customerId ?? null, row.customerName ?? null, row.channel ?? null,
            row.store ?? null, row.country ?? null, row.currency ?? null
          );
        }
        sqlite
          .prepare("UPDATE import_jobs SET status = 'importing', imported_rows = imported_rows + ? WHERE id = ?")
          .run(rows.length, id);
      })();
      res.json({ imported: rows.length });
    })
  );

  r.post(
    '/imports/:id/complete',
    h((req, res) => {
      const id = Number(req.params.id);
      getJob(req.auth.wsId, id);
      const body = parse(CompleteImport, req.body, 'completion');
      sqlite
        .prepare("UPDATE import_jobs SET status = 'complete', rejected_rows = ?, completed_at = ? WHERE id = ?")
        .run(body.rejectedRows, new Date().toISOString(), id);
      res.json(jobJson(req.auth.wsId, id));
    })
  );

  /** Undo: removes the import's transactions and marks the job undone. */
  r.delete(
    '/imports/:id',
    h((req, res) => {
      const id = Number(req.params.id);
      getJob(req.auth.wsId, id);
      const removed = sqlite.transaction(() => {
        const info = sqlite
          .prepare('DELETE FROM transactions WHERE import_job_id = ? AND workspace_id = ?')
          .run(id, req.auth.wsId);
        sqlite.prepare("UPDATE import_jobs SET status = 'undone', completed_at = ? WHERE id = ?").run(new Date().toISOString(), id);
        return info.changes;
      })();
      res.json({ ok: true, removedTransactions: removed });
    })
  );

  /* ------------------------------ mapping presets ----------------------------- */

  r.get(
    '/mappings',
    h((req, res) => {
      const rows = sqlite
        .prepare('SELECT id, name, mapping_json, created_at createdAt FROM import_mappings WHERE workspace_id = ? ORDER BY created_at DESC')
        .all(req.auth.wsId) as { id: number; name: string; mapping_json: string; createdAt: string }[];
      res.json({ presets: rows.map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt, mapping: JSON.parse(p.mapping_json) })) });
    })
  );

  r.post(
    '/mappings',
    h((req, res) => {
      const body = parse(CreateMapping, req.body, 'mapping preset');
      const info = sqlite
        .prepare('INSERT INTO import_mappings (workspace_id, name, mapping_json, created_at) VALUES (?, ?, ?, ?)')
        .run(req.auth.wsId, body.name, JSON.stringify(body.mapping), new Date().toISOString());
      res.status(201).json({ id: Number(info.lastInsertRowid) });
    })
  );

  r.delete(
    '/mappings/:id',
    h((req, res) => {
      sqlite.prepare('DELETE FROM import_mappings WHERE id = ? AND workspace_id = ?').run(Number(req.params.id), req.auth.wsId);
      res.json({ ok: true });
    })
  );

  return r;
}
