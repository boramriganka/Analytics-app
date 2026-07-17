import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const DB_PATH = path.join(dataDir, 'xorai.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'member',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      sku      TEXT NOT NULL UNIQUE,
      name     TEXT NOT NULL,
      category TEXT NOT NULL,
      price    REAL NOT NULL,
      cost     REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      city       TEXT NOT NULL,
      country    TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      channel     TEXT NOT NULL CHECK (channel IN ('online','in-store','wholesale')),
      status      TEXT NOT NULL CHECK (status IN ('completed','refunded','cancelled')),
      total       REAL NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity   INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_created  ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_items_order     ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_items_product   ON order_items(product_id);
  `);
}
