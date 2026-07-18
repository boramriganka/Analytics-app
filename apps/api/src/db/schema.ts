import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
});

export const workspaces = sqliteTable('workspaces', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  /** 'demo' for the shared sample workspace, else owner user id */
  ownerUserId: integer('owner_user_id'),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const importJobs = sqliteTable('import_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  fileName: text('file_name').notNull(),
  status: text('status', { enum: ['pending', 'importing', 'complete', 'undone'] }).notNull(),
  totalRows: integer('total_rows').notNull().default(0),
  importedRows: integer('imported_rows').notNull().default(0),
  rejectedRows: integer('rejected_rows').notNull().default(0),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

export const importMappings = sqliteTable('import_mappings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name').notNull(),
  /** JSON: source header → canonical key */
  mappingJson: text('mapping_json').notNull(),
  createdAt: text('created_at').notNull(),
});

export const transactions = sqliteTable(
  'transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    importJobId: integer('import_job_id').references(() => importJobs.id),
    transactionId: text('transaction_id'),
    orderId: text('order_id').notNull(),
    /** ISO 8601 UTC */
    ts: text('ts').notNull(),
    /** 'YYYY-MM-DD' shard of ts, for fast range scans */
    day: text('day').notNull(),
    productId: text('product_id'),
    productName: text('product_name').notNull(),
    category: text('category'),
    quantity: integer('quantity').notNull(),
    grossSales: real('gross_sales').notNull(),
    discounts: real('discounts').notNull().default(0),
    refunds: real('refunds').notNull().default(0),
    netSales: real('net_sales').notNull(),
    cost: real('cost'),
    customerId: text('customer_id'),
    customerName: text('customer_name'),
    channel: text('channel'),
    store: text('store'),
    country: text('country'),
    currency: text('currency'),
  },
  (t) => [
    index('idx_tx_ws_day').on(t.workspaceId, t.day),
    index('idx_tx_ws_import').on(t.workspaceId, t.importJobId),
    index('idx_tx_ws_customer').on(t.workspaceId, t.customerId),
  ]
);

export const savedViews = sqliteTable('saved_views', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name').notNull(),
  route: text('route').notNull(),
  query: text('query').notNull(),
  createdAt: text('created_at').notNull(),
});

export const reports = sqliteTable('reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workspaceId: integer('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  title: text('title').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const reportBlocks = sqliteTable(
  'report_blocks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    reportId: integer('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['heading', 'note', 'kpis', 'chart', 'insight', 'table'] }).notNull(),
    position: integer('position').notNull(),
    configJson: text('config_json').notNull(),
  },
  (t) => [index('idx_blocks_report').on(t.reportId, t.position)]
);
