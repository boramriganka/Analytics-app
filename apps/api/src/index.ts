import { openDb } from './db/client.js';
import { seedDemoWorkspace } from './seed/seed.js';
import { buildApp } from './app.js';
import { logger } from './lib/http.js';

const PORT = Number(process.env.PORT || 4000);
const { sqlite } = openDb();

// First run: make the demo workspace exist so the app works out of the box.
seedDemoWorkspace(sqlite, { log: (m) => logger.info(m) });

const app = buildApp(sqlite);
app.listen(PORT, () => logger.info(`Signalroom API listening on http://localhost:${PORT}`));
