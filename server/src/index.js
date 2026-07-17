import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate, db, DB_PATH } from './db.js';
import { authRouter, requireAuth } from './auth.js';
import { analyticsRouter } from './analytics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;

migrate();

// First run: seed automatically so the app works out of the box.
const hasData = db.prepare('SELECT COUNT(*) n FROM orders').get().n > 0;
if (!hasData) {
  console.log('Empty database — seeding demo dataset…');
  execFileSync(process.execPath, [path.join(__dirname, 'seed.js')], { stdio: 'inherit' });
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, db: fs.existsSync(DB_PATH) }));
app.use('/api/auth', authRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);

// Serve the built client in production.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Xorai API listening on http://localhost:${PORT}`));
