import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function defaultDbPath(): string {
  const dir = path.join(__dirname, '..', '..', 'data');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'signalroom.db');
}

export function openDb(dbPath = process.env.DB_PATH || defaultDbPath()) {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  migrate(sqlite);
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

/** Apply SQL migrations from ./migrations, tracked in _migrations. */
export function migrate(sqlite: Database.Database) {
  sqlite.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const dir = path.join(__dirname, '..', '..', 'migrations');
  const applied = new Set(
    (sqlite.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map((r) => r.name)
  );
  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith('.sql') || applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    sqlite.transaction(() => {
      sqlite.exec(sql);
      sqlite.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, new Date().toISOString());
    })();
  }
}

export type Db = ReturnType<typeof openDb>;
export { schema };
