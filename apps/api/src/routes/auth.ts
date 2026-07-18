import { Router } from 'express';
import type Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { h, parse, signToken, HttpError, requireAuth } from '../lib/http.js';
import { seedDemoWorkspace } from '../seed/seed.js';

const Credentials = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
const RegisterBody = Credentials.extend({ name: z.string().trim().min(1, 'Enter your name') });

export function authRouter(sqlite: Database.Database): Router {
  const r = Router();

  function demoWorkspaceId(): number {
    const ws = sqlite.prepare('SELECT id FROM workspaces WHERE is_demo = 1').get() as { id: number } | undefined;
    if (ws) return ws.id;
    return seedDemoWorkspace(sqlite, {});
  }

  /* Guest demo session — the zero-friction entry */
  r.post(
    '/demo/session',
    h((_req, res) => {
      const wsId = demoWorkspaceId();
      const token = signToken({ userId: null, wsId, name: 'Guest' }, '24h');
      res.json({ token, workspace: { id: wsId, name: 'Harbor & Field', isDemo: true }, user: null });
    })
  );

  r.post(
    '/demo/reset',
    requireAuth,
    h((req, res) => {
      const ws = sqlite.prepare('SELECT id, is_demo FROM workspaces WHERE id = ?').get(req.auth.wsId) as
        | { id: number; is_demo: number }
        | undefined;
      if (!ws?.is_demo) throw new HttpError(403, 'not_demo', 'Only the sample workspace can be reset.');
      seedDemoWorkspace(sqlite, { force: true });
      res.json({ ok: true });
    })
  );

  r.post(
    '/auth/register',
    h((req, res) => {
      const body = parse(RegisterBody, req.body, 'registration');
      const email = body.email.toLowerCase();
      if (sqlite.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
        throw new HttpError(409, 'email_taken', 'An account with that email already exists.');
      }
      const now = new Date().toISOString();
      const userInfo = sqlite
        .prepare('INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
        .run(body.name, email, bcrypt.hashSync(body.password, 10), now);
      const userId = Number(userInfo.lastInsertRowid);
      const wsInfo = sqlite
        .prepare('INSERT INTO workspaces (name, owner_user_id, is_demo, created_at) VALUES (?, ?, 0, ?)')
        .run(`${body.name}’s workspace`, userId, now);
      const wsId = Number(wsInfo.lastInsertRowid);
      res.status(201).json({
        token: signToken({ userId, wsId, name: body.name }),
        workspace: { id: wsId, name: `${body.name}’s workspace`, isDemo: false },
        user: { id: userId, name: body.name, email },
      });
    })
  );

  r.post(
    '/auth/login',
    h((req, res) => {
      const body = parse(Credentials, req.body, 'login');
      const user = sqlite.prepare('SELECT * FROM users WHERE email = ?').get(body.email.toLowerCase()) as
        | { id: number; name: string; email: string; password_hash: string }
        | undefined;
      if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
        throw new HttpError(401, 'bad_credentials', 'Email or password is incorrect.');
      }
      const ws = sqlite
        .prepare('SELECT id, name FROM workspaces WHERE owner_user_id = ? ORDER BY id LIMIT 1')
        .get(user.id) as { id: number; name: string };
      res.json({
        token: signToken({ userId: user.id, wsId: ws.id, name: user.name }),
        workspace: { id: ws.id, name: ws.name, isDemo: false },
        user: { id: user.id, name: user.name, email: user.email },
      });
    })
  );

  r.get(
    '/auth/session',
    requireAuth,
    h((req, res) => {
      const ws = sqlite.prepare('SELECT id, name, is_demo isDemo FROM workspaces WHERE id = ?').get(req.auth.wsId) as
        | { id: number; name: string; isDemo: number }
        | undefined;
      if (!ws) throw new HttpError(401, 'workspace_gone', 'This workspace no longer exists.');
      const user =
        req.auth.userId === null
          ? null
          : (sqlite.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.auth.userId) ?? null);
      res.json({ workspace: { ...ws, isDemo: Boolean(ws.isDemo) }, user });
    })
  );

  return r;
}
