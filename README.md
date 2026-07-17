# Xorai — retail analytics, beautifully legible

A full-stack analytics dashboard for a retail business: net revenue, orders,
units, refunds, channel split, category performance, top products and top
customers — over a seeded dataset of **~15,000 orders across 24 months**.

Works out of the box. No API keys, no external services, no database server —
the API seeds its own SQLite database on first boot.

## Stack

| Layer | Tech |
|---|---|
| API | Node.js, Express, better-sqlite3, JWT (jsonwebtoken + bcryptjs) |
| Database | SQLite (file-based, auto-seeded with deterministic demo data) |
| Client | React 18, Vite, Tailwind CSS v4, Recharts, framer-motion, React Router 7 |

## Quick start

```bash
npm install        # root tooling (concurrently)
npm run setup      # installs server/ and client/ dependencies
npm run dev        # API on :5000 + Vite dev server on :3000
```

Open **http://localhost:3000**, hit **“Explore with demo account”**, done.

- Demo login: `demo@xorai.app` / `demo1234` (or the one-click demo button)
- Or register your own account from the login page.

### Production build

```bash
npm run build      # builds client/dist
npm start          # Express serves the API and the built client on :5000
```

### Reseed the dataset

```bash
npm run seed
```

The seed is deterministic (fixed PRNG seed), with weekly rhythm, holiday
seasonality, a growth trend, three sales channels (online / in-store /
wholesale) and realistic refund/cancellation rates.

## API

All analytics routes require `Authorization: Bearer <token>`.
`range` is one of `7d | 30d | 90d | 12m | all`.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account → `{ token, user }` |
| POST | `/api/auth/login` | Sign in → `{ token, user }` |
| POST | `/api/auth/demo` | One-click demo session |
| GET | `/api/auth/me` | Current user |
| GET | `/api/analytics/summary?range=` | KPIs + period-over-period deltas |
| GET | `/api/analytics/revenue?range=` | Revenue timeseries (day/month buckets) |
| GET | `/api/analytics/categories?range=` | Revenue by category |
| GET | `/api/analytics/channels?range=` | Revenue/orders by channel |
| GET | `/api/analytics/products/top?range=&limit=` | Top products |
| GET | `/api/analytics/customers/top?range=&limit=` | Top customers |
| GET | `/api/analytics/orders/recent?limit=` | Latest orders |
| GET | `/api/analytics/products?range=` | Full catalog with units/revenue/profit |
| GET | `/api/analytics/customers?limit=` | Customers with lifetime value |

## Configuration

Optional environment variables (sensible defaults for local dev):

- `PORT` — API port (default `5000`)
- `JWT_SECRET` — set this in production

## Project layout

```
server/          Express API
  src/db.js        SQLite connection + schema
  src/seed.js      deterministic demo dataset
  src/auth.js      JWT auth routes + middleware
  src/analytics.js analytics queries
client/          React app
  src/pages/       Landing, Login, dashboard pages
  src/components/  layout, UI primitives, charts
```

Chart colors are a colorblind-validated categorical set (all-pairs CVD ΔE
check on the dark surface); magnitude comparisons use a single hue, and
identity is never encoded by color alone.
