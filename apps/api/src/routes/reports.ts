import { Router } from 'express';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { h, parse, HttpError } from '../lib/http.js';

const CreateView = z.object({
  name: z.string().trim().min(1).max(120),
  route: z.string().startsWith('/app'),
  query: z.string().max(2000),
});
const CreateReport = z.object({ title: z.string().trim().min(1).max(160) });
const PatchReport = z.object({ title: z.string().trim().min(1).max(160) });
const CreateBlock = z.object({
  type: z.enum(['heading', 'note', 'kpis', 'chart', 'insight', 'table']),
  config: z.record(z.string(), z.unknown()),
  position: z.number().int().min(0).optional(),
});
const PatchBlock = z.object({ config: z.record(z.string(), z.unknown()) });
const ReorderBlocks = z.object({ order: z.array(z.number().int()) });

export function reportsRouter(sqlite: Database.Database): Router {
  const r = Router();

  /* -------------------------------- saved views ------------------------------- */

  r.get(
    '/views',
    h((req, res) => {
      const rows = sqlite
        .prepare('SELECT id, name, route, query, created_at createdAt FROM saved_views WHERE workspace_id = ? ORDER BY created_at DESC')
        .all(req.auth.wsId);
      res.json({ views: rows });
    })
  );

  r.post(
    '/views',
    h((req, res) => {
      const body = parse(CreateView, req.body, 'view');
      const info = sqlite
        .prepare('INSERT INTO saved_views (workspace_id, name, route, query, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(req.auth.wsId, body.name, body.route, body.query, new Date().toISOString());
      res.status(201).json({ id: Number(info.lastInsertRowid) });
    })
  );

  r.delete(
    '/views/:id',
    h((req, res) => {
      sqlite.prepare('DELETE FROM saved_views WHERE id = ? AND workspace_id = ?').run(Number(req.params.id), req.auth.wsId);
      res.json({ ok: true });
    })
  );

  /* ---------------------------------- reports --------------------------------- */

  function getReport(wsId: number, id: number) {
    const report = sqlite.prepare('SELECT * FROM reports WHERE id = ? AND workspace_id = ?').get(id, wsId) as
      | { id: number; title: string; created_at: string; updated_at: string }
      | undefined;
    if (!report) throw new HttpError(404, 'report_not_found', 'That report does not exist in this workspace.');
    return report;
  }

  function touch(id: number) {
    sqlite.prepare('UPDATE reports SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id);
  }

  function reportJson(wsId: number, id: number) {
    const rep = getReport(wsId, id);
    const blocks = (
      sqlite
        .prepare('SELECT id, type, position, config_json FROM report_blocks WHERE report_id = ? ORDER BY position, id')
        .all(id) as { id: number; type: string; position: number; config_json: string }[]
    ).map((b) => ({ id: b.id, type: b.type, position: b.position, config: JSON.parse(b.config_json) }));
    return { id: rep.id, title: rep.title, createdAt: rep.created_at, updatedAt: rep.updated_at, blocks };
  }

  r.get(
    '/reports',
    h((req, res) => {
      const rows = sqlite
        .prepare(
          `SELECT r2.id, r2.title, r2.created_at createdAt, r2.updated_at updatedAt,
                  (SELECT COUNT(*) FROM report_blocks b WHERE b.report_id = r2.id) blockCount
           FROM reports r2 WHERE r2.workspace_id = ? ORDER BY r2.updated_at DESC`
        )
        .all(req.auth.wsId);
      res.json({ reports: rows });
    })
  );

  r.post(
    '/reports',
    h((req, res) => {
      const body = parse(CreateReport, req.body, 'report');
      const now = new Date().toISOString();
      const info = sqlite
        .prepare('INSERT INTO reports (workspace_id, title, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .run(req.auth.wsId, body.title, now, now);
      res.status(201).json(reportJson(req.auth.wsId, Number(info.lastInsertRowid)));
    })
  );

  r.get(
    '/reports/:id',
    h((req, res) => {
      res.json(reportJson(req.auth.wsId, Number(req.params.id)));
    })
  );

  r.patch(
    '/reports/:id',
    h((req, res) => {
      const id = Number(req.params.id);
      getReport(req.auth.wsId, id);
      const body = parse(PatchReport, req.body, 'report');
      sqlite.prepare('UPDATE reports SET title = ?, updated_at = ? WHERE id = ?').run(body.title, new Date().toISOString(), id);
      res.json(reportJson(req.auth.wsId, id));
    })
  );

  r.delete(
    '/reports/:id',
    h((req, res) => {
      const id = Number(req.params.id);
      getReport(req.auth.wsId, id);
      sqlite.transaction(() => {
        sqlite.prepare('DELETE FROM report_blocks WHERE report_id = ?').run(id);
        sqlite.prepare('DELETE FROM reports WHERE id = ?').run(id);
      })();
      res.json({ ok: true });
    })
  );

  r.post(
    '/reports/:id/blocks',
    h((req, res) => {
      const id = Number(req.params.id);
      getReport(req.auth.wsId, id);
      const body = parse(CreateBlock, req.body, 'report block');
      const max = (sqlite.prepare('SELECT COALESCE(MAX(position), -1) p FROM report_blocks WHERE report_id = ?').get(id) as { p: number }).p;
      const position = body.position ?? max + 1;
      sqlite
        .prepare('INSERT INTO report_blocks (report_id, type, position, config_json) VALUES (?, ?, ?, ?)')
        .run(id, body.type, position, JSON.stringify(body.config));
      touch(id);
      res.status(201).json(reportJson(req.auth.wsId, id));
    })
  );

  r.patch(
    '/reports/:id/blocks/:blockId',
    h((req, res) => {
      const id = Number(req.params.id);
      getReport(req.auth.wsId, id);
      const body = parse(PatchBlock, req.body, 'report block');
      const info = sqlite
        .prepare('UPDATE report_blocks SET config_json = ? WHERE id = ? AND report_id = ?')
        .run(JSON.stringify(body.config), Number(req.params.blockId), id);
      if (!info.changes) throw new HttpError(404, 'block_not_found', 'That block does not exist.');
      touch(id);
      res.json(reportJson(req.auth.wsId, id));
    })
  );

  r.put(
    '/reports/:id/blocks',
    h((req, res) => {
      const id = Number(req.params.id);
      getReport(req.auth.wsId, id);
      const { order } = parse(ReorderBlocks, req.body, 'block order');
      sqlite.transaction(() => {
        order.forEach((blockId, idx) => {
          sqlite.prepare('UPDATE report_blocks SET position = ? WHERE id = ? AND report_id = ?').run(idx, blockId, id);
        });
      })();
      touch(id);
      res.json(reportJson(req.auth.wsId, id));
    })
  );

  r.delete(
    '/reports/:id/blocks/:blockId',
    h((req, res) => {
      const id = Number(req.params.id);
      getReport(req.auth.wsId, id);
      sqlite.prepare('DELETE FROM report_blocks WHERE id = ? AND report_id = ?').run(Number(req.params.blockId), id);
      touch(id);
      res.json(reportJson(req.auth.wsId, id));
    })
  );

  return r;
}
