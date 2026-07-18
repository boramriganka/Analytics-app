import express from 'express';
import cors from 'cors';
import type Database from 'better-sqlite3';
import { errorMiddleware, requestLogger, requireAuth } from './lib/http.js';
import { authRouter } from './routes/auth.js';
import { analyticsRouter } from './routes/analytics.js';
import { importsRouter } from './routes/imports.js';
import { reportsRouter } from './routes/reports.js';

export function buildApp(sqlite: Database.Database) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '12mb' })); // import row batches
  app.use(requestLogger);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', authRouter(sqlite));
  app.use('/api/analytics', requireAuth, analyticsRouter(sqlite));
  app.use('/api', requireAuth, importsRouter(sqlite));
  app.use('/api', requireAuth, reportsRouter(sqlite));

  app.use(errorMiddleware);
  return app;
}
