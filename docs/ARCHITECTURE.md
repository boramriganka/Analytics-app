# Architecture

## Monorepo layout (npm workspaces)

```
apps/
  api/        Express + TypeScript HTTP API, Drizzle ORM, SQLite
  web/        React 18 + TypeScript strict + Vite + Tailwind v4
packages/
  schemas/    Zod schemas: canonical transaction fields, API contracts (shared)
  analytics/  Pure, unit-tested calculation + insight engine (no I/O)
docs/         Product and engineering documentation
e2e/          Playwright journeys + responsive screenshot harness
```

`packages/ui` and `packages/config` from the recommended layout are folded into
`apps/web/src/design` and root-level config files respectively: with a single
web app there is no second consumer to justify the package boundary, and fewer
workspace edges keep typecheck/build fast. The boundary that matters —
**calculations and contracts are importable and testable without a server or a
browser** — is held by `packages/analytics` and `packages/schemas`.

## Data flow

```
CSV file ──(client parse: PapaParse)──▶ preview + mapping UI
   └─ rows mapped to canonical fields ──(zod row schema, shared)──▶
      valid rows → POST /imports (batched)   rejects → downloadable CSV
                          │
                          ▼
                 SQLite (Drizzle ORM)
   transactions (wide, workspace- and import-scoped)
                          │
        SQL aggregation per request (server-side)
                          ▼
   /analytics/* endpoints → typed JSON (zod-parsed on the client)
                          │
              @signalroom/analytics insight engine
                          ▼
        KPIs · timeseries · breakdowns · insights → React Query cache
```

The same zod row schema validates on the client (fast feedback, reject file)
and again on the server (trust boundary). Analytics are aggregated in SQL —
the full transaction set is never shipped to the browser.

## Database choice: SQLite, deliberately

The brief recommends PostgreSQL. Signalroom uses **SQLite via Drizzle ORM**:

- The definition of done requires a fresh clone to run with documented
  commands and zero secrets; SQLite makes that a one-command reality.
- The schema is relational and written in Drizzle's dialect-portable core
  (integer PKs, ISO-8601 timestamps, real currency amounts, FKs, indexes);
  moving to Postgres is a driver + migration swap documented in
  `docs/DEPLOYMENT.md`, not a redesign.
- Analytics workloads here are read-heavy single-node aggregations; SQLite with
  WAL comfortably handles the 250k-transaction performance dataset.

MongoDB is gone: transactional analytics data is relational.

## Entities

`users`, `workspaces`, `import_jobs`, `import_mappings`, `transactions`,
`saved_views`, `reports`, `report_blocks`.

`Product`, `Customer`, `Store`, `Channel`, `Country`, `Category` are **derived
dimensions** of `transactions` (`SELECT DISTINCT` + aggregates), not tables:
in an import-first product the dimensions arrive embedded in transaction files,
and materializing them would create sync problems without a query-side payoff
at this scale. `DataSource` is represented by `import_jobs` (one job = one
source file). This is the one deliberate deviation from the suggested entity
list.

## API shape

REST under `/api`, JSON, zod-validated request/response, structured errors
`{ error: { code, message, details? } }`, structured request logging (pino).
Endpoint reference lives in `docs/DATA-MODEL.md` § API. OpenAPI generation was
skipped (single first-party consumer; the zod contracts in
`packages/schemas/src/api.ts` are the source of truth and are type-checked
against both sides).

## Auth model

- **Guest demo**: `POST /api/demo/session` issues a short-lived guest JWT bound
  to the shared demo workspace. No signup, no secrets. `POST /api/demo/reset`
  reseeds it.
- **Accounts**: email + password (bcrypt), JWT bearer; each user gets a private
  workspace. OAuth is intentionally absent — it can be added, but must never be
  the only path (legacy lesson).

## Frontend

- React Router v7 routes mirror the IA (`/`, `/demo`, `/onboarding/import/*`,
  `/app/*`).
- TanStack Query v5 for all server state; keys include workspace + filters so
  caching and stale-cancellation come free. Local state only for UI concerns.
- Filters live in the URL (`?from=&to=&compare=&category=…`) via a single
  `useFilters` hook — shareable, back-button-safe, and the mobile bottom sheet
  writes through the same hook.
- Charts: Recharts for standard forms; the Revenue Pulse signature
  visualization is hand-built SVG (custom scrubbing, comparison band, anomaly
  and annotation layers don't fit a chart library's abstractions).
- Design tokens are Tailwind v4 `@theme` variables defined once in
  `apps/web/src/styles/tokens.css`; fonts are self-hosted woff2.

## Testing

- `packages/analytics`, `packages/schemas`: Vitest unit tests with
  deterministic fixtures and hand-computed expected values.
- `apps/api`: Vitest integration tests against a temp SQLite file.
- `e2e/`: Playwright journeys (demo→overview→drill→save view→report→export,
  import happy/invalid paths, keyboard-only navigation, mobile import + filter
  sheet, reduced-motion) and screenshot sweeps at 8 breakpoints.

## Local development

```
npm install
npm run seed        # seeds the demo workspace (idempotent)
npm run dev         # api :4000 + web :3000 (proxy /api)
```

No environment variables are required for development; `.env.example`
documents the optional ones (PORT, JWT_SECRET, DB_PATH, SEED_SIZE).
