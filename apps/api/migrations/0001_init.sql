CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  owner_user_id INTEGER,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  file_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','importing','complete','undone')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  rejected_rows INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS import_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  mapping_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  import_job_id INTEGER REFERENCES import_jobs(id),
  transaction_id TEXT,
  order_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  day TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER NOT NULL,
  gross_sales REAL NOT NULL,
  discounts REAL NOT NULL DEFAULT 0,
  refunds REAL NOT NULL DEFAULT 0,
  net_sales REAL NOT NULL,
  cost REAL,
  customer_id TEXT,
  customer_name TEXT,
  channel TEXT,
  store TEXT,
  country TEXT,
  currency TEXT
);

CREATE INDEX IF NOT EXISTS idx_tx_ws_day ON transactions(workspace_id, day);
CREATE INDEX IF NOT EXISTS idx_tx_ws_import ON transactions(workspace_id, import_job_id);
CREATE INDEX IF NOT EXISTS idx_tx_ws_customer ON transactions(workspace_id, customer_id);

CREATE TABLE IF NOT EXISTS saved_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  route TEXT NOT NULL,
  query TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('heading','note','kpis','chart','insight','table')),
  position INTEGER NOT NULL,
  config_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blocks_report ON report_blocks(report_id, position);
