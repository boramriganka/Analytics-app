# Revamp changelog

Honest, stage-by-stage record of what is complete, partial, or deferred.

## Stage 0 — Audit ✅
- Full repository + git-history inspection; every broken runtime path documented in `docs/LEGACY-AUDIT.md`.
- Secrets scan of all history blobs: one real Google OAuth credential found in the 2021 history (`oath_keys/clentIdNsecret.txt`). Owner notified; **rotation still required**; history scrubbing is blocked in this environment and documented for the owner to run.
- Legacy and interim states tagged locally (`legacy-prototype`, `interim-xorai`) and preserved in branch history.

## Stage 1 — Safe foundation ✅
- npm-workspaces monorepo: `packages/schemas`, `packages/analytics`, `apps/api`, `apps/web`. TypeScript strict + `noUncheckedIndexedAccess` everywhere; ESLint 9 flat config + Prettier.
- `@signalroom/schemas`: canonical transaction fields with tolerant coercion (currency symbols, thousands separators, D/M vs M/D disambiguation, unix timestamps, parenthesized negatives), shared row schema used by both client validation and the server trust boundary, full API contracts. 10 unit tests.
- `@signalroom/analytics`: period/comparison math, robust median/MAD anomaly detection with weekday conditioning (chosen after mean/σ provably could not detect the seeded spike — an outlier inflates its own σ; small groups have a hard z-max of (n−1)/√n), deterministic insight engine (7 rules: change decomposition with ≥35% dominance threshold, refund concentration, weekday streaks, returning-customer share, discount pressure, channel share shift, AOV decomposition — observations vs hypotheses distinguished). 18 unit tests with hand-computed expectations.
- `apps/api`: Express + Drizzle/SQLite, tracked SQL migrations, structured errors + pino logging, JWT auth with guest demo sessions, demo reset, workspace scoping on every query. Deterministic seed (sizes 1k/25k/250k) with engineered, discoverable signals (Kitchen product surge, Bath refund spike, Saturday decline streak, flash-sale/outage anomalies pinned to fixed weekdays, growing marketplace share, deliberate data-quality quirks). 11 integration tests over a temp database, including the filter-consistency property (breakdown sums ≈ filtered totals).
- `apps/web`: Vite + React 18 + TS strict scaffold; design tokens (warm paper / carbon ink / ultramarine signal; IBM Plex Sans + Mono, Fraunces for public display only; **all fonts self-hosted**); CVD-validated chart palette (6-slot adjacent-pairs + 3-slot all-pairs pass on the panel surface; sub-3:1 slots carry the direct-label/table relief rule); app shell with desktop sidebar, mobile bottom nav + “More” sheet, skip link, focus-visible styles, reduced-motion discipline; URL-persisted filter hook; React Query wiring with per-workspace+filter cache keys; route-level code splitting.
- Legacy prototype and interim Xorai code fully removed (no localhost:5050, no config/keys.js, no dead Redux, no CSS-framework pileup).
- Gates: `npm install && npm run seed && npm run dev` works; `npm test` → 39 passing; `npm run typecheck` clean; ESLint clean.

## Stage 2 — Vertical slice ✅
The exact journey works end to end and was driven in a real browser (Playwright)
with zero console errors: open demo → overview → change date range (URL-persisted)
→ inspect a KPI (definition, plain-language sentence, contributing products
sorted by delta) → open the product view → save the view → add Revenue Pulse to
a new report → open the report → add a note → export via print stylesheet.

- Executive overview: all 9 KPIs with current/comparison/absolute/% change,
  trend sparks, definition tooltips, plain-language copy; delta color follows
  metric direction (a rising refund rate is bad).
- **Revenue Pulse v1** (hand-built SVG): net-sales series, neutral
  comparison-period band, robust-anomaly rings, pointer/touch scrubbing with a
  stable tooltip, arrow-key scrubbing when focused, direct end label,
  width-adaptive axis labels.
- Deterministic insights render on Overview with severity + observation/
  hypothesis chips and links to the supporting filtered view.
- One filter system: date presets + custom range, comparison mode, dimension
  filters with searchable values, active-filter chips, reset, URL persistence,
  mobile bottom sheet; saved views (create/apply/delete).
- Reports: list/create/delete; editor with heading/note (inline edit),
  KPI/chart/insight blocks that re-query live data from their captured filter
  query, reorder, delete; print-quality export via print stylesheet.
- Every chart ships with an accessible summary, a data-table alternative and
  CSV export. Fixed en route: nested-button violation in KPI tiles (stretched
  sibling button pattern), x-label collisions at 390px, and a customer model
  rewrite (explicit first purchases → ~30% new customers per window instead of
  a closed pool showing 98.7% repeat rate).
## Stage 3 — Import journey ✅
Both journeys driven end to end in Playwright with zero console errors:
a messy file (6 engineered defects → all 6 caught with specific, named
errors; reject CSV downloaded and verified; 14 clean rows imported; analytics
opened scoped to the import; undo removed it) and a Shopify-style file
(headers like “Order Number”, “Revenue”, “Customer Email” auto-mapped —
including email→customerId; $1,234.56 money and M/D dates coerced; 60/60
imported).

- Four-step wizard: upload (drag/drop, delimiter sniffing) → map columns
  (auto-suggestions from header aliases, per-field descriptions, sample
  values, required-field gating, reusable mapping presets, day-first date
  detection with manual override) → validate (chunked with progress; per-row
  errors; downloadable reject file carrying original values + reasons) →
  import (batched upload with progress; server re-validates with the same
  shared schema).
- Completion screen: counts, detected date range, jump to analytics scoped
  to `importId`, one-click undo.
- Data-quality page: duplicate transaction IDs, negative-net rows,
  missing-field table with plain-language consequences, import history with
  per-import analyze/undo.
- Fixed en route: PapaParse worker mode is incompatible with callback
  options (functions aren't structured-cloneable) — parse on main thread;
  zod default "String must contain at least 1 character(s)" replaced with
  named field messages.
## Stage 4 — Remaining analytics ✅
All sections driven in Playwright with zero console errors; every page shares
the one URL-persisted filter system, insight strip, accessible summaries,
table alternatives and CSV export.

- **Sales**: gross-vs-net lines (one axis, dashed neutral vs signal), a
  “where gross became net” bridge (discounts/refunds as % of gross),
  day-of-week and hour-of-day columns with peak emphasis + selective labels.
- **Products**: top products with deltas, growing/declining movers (volume
  floor to avoid noise), category performance, sortable 100-row table
  (aria-sort), margin column only when cost data exists.
- **Customers**: new-vs-returning split bars (counts and revenue, direct
  labels), value-distribution bands, repeat-purchase rate, top customers,
  honest empty state when customer IDs are missing. Cohort view deferred —
  documented, not faked.
- **Channels & stores**: contribution bars, cross-channel share table in
  percentage points, per-channel trend lines (new `/analytics/timeseries-by`
  endpoint, all-pairs-validated trio palette), store comparison.
- **Refunds**: rate + value KPIs, refund-rate line, products driving refunds
  (with volume floor), category/channel rate lists with an 8% attention
  threshold.
- **Explore**: breakdown playground over any dimension; **Settings**: guest →
  private-workspace account creation, demo reset, sign-out.
## Stage 5 — Public product experience (pending)
## Stage 6 — Hardening (pending)
