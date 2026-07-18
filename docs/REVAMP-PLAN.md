# Revamp plan

Staged migration from the legacy prototype to Signalroom. One commit (or a few
focused commits) per stage; no uncontrolled rewrite commit. Progress is
recorded in `docs/REVAMP-CHANGELOG.md`.

## Stage 0 — Audit ✅
Full repo + history inspection, secrets scan (one credential found in 2021
history — owner notified, rotation required), broken-path inventory, docs:
LEGACY-AUDIT, PRODUCT-BRIEF, ARCHITECTURE, this plan. Legacy state tagged
locally (`legacy-prototype`, `interim-xorai`) and preserved in branch history.

## Stage 1 — Safe foundation
- npm-workspaces monorepo (`apps/api`, `apps/web`, `packages/schemas`,
  `packages/analytics`, `e2e`)
- TypeScript strict everywhere; ESLint + Prettier; Vitest wiring
- Design tokens (color, type, spacing, motion) + self-hosted fonts
- Drizzle schema + migrations + idempotent seed (1k/25k/250k generators)
- Legacy + interim code removed (preserved in history)
- Gate: `npm install && npm run seed && npm run dev` works from fresh clone;
  `npm test` green.

## Stage 2 — First complete vertical slice
Open demo → view overview (9 KPIs with comparisons, sparks, definitions;
Revenue Pulse v1) → change date range → inspect a KPI → open contributing
products → save the view → add to a report → export the report.
Gate: the exact journey passes as a Playwright test.

## Stage 3 — Import journey
CSV upload → preview/detection → column mapping (+ presets) → validation with
downloadable rejects → confirmed import with progress → analytics refresh →
undo → data-quality report.
Gate: happy-path and invalid-file Playwright journeys pass.

## Stage 4 — Remaining analytics
Sales, Products, Customers, Channels & stores, Refunds sections; deterministic
insight engine surfaced across Overview and sections; unified filter system
with URL persistence and mobile bottom sheet.
Gate: filters provably drive every KPI/chart (integration-tested aggregations).

## Stage 5 — Public product experience
Editorial landing built from real product data and screens; every claim maps
to a working feature; memorable but non-hijacking demo transition.

## Stage 6 — Hardening
Responsive verification at 320/360/390/768/1024/1280/1440/1920 with browser
automation; keyboard + screen-reader semantics; reduced-motion; performance
profiling against the 25k and 250k datasets; bundle splitting audit; empty/
error/loading states; README + remaining docs; deployment configuration.

## Definition of done
Tracked against the brief's checklist in `docs/REVAMP-CHANGELOG.md`, updated
at every stage with what is complete, partial, or deferred — honestly.
