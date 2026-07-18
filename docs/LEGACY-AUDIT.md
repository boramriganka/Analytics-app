# Legacy audit

Audit of the repository as inherited, before the Signalroom rebuild.
Two prior states exist in history:

| State | Ref | Description |
|---|---|---|
| College prototype (2021) | `main` @ `89f68fa`, local tag `legacy-prototype` | The original MERN skeleton this audit covers |
| Interim "Xorai" revamp (2026-07) | `89f6f6d`, local tag `interim-xorai` | A single-evening working rebuild (Express + SQLite + React/Vite), superseded by Signalroom |

The session's git remote only syncs the working branch, so the tags are local;
both states remain permanently reachable through branch history.

## What the prototype was

A would-be MERN survey/analytics app ("Xorai"): Express + Mongoose backend doing
Google OAuth only, and a Create React App frontend with a sales dashboard whose
data layer pointed at an analytics service that does not exist in the repo.

## Broken runtime paths (verified, not guessed)

1. **Backend cannot start.** `index.js` and `services/passport.js` require
   `./config/keys` — git-ignored and absent. `node index.js` fails immediately
   with `Cannot find module './config/keys'`.
2. **Phantom analytics service.** `client/src/components/Main/dashboard/Chart.js`
   and `Main.js` issue ~10 `axios.get('http://localhost:5050/...')` calls
   (`xorai_analytics/factura/*`, `clover_analytics/*`). No such service exists
   anywhere; every chart fails. The CRA proxy (`setupProxy.js`) points at :5000
   (the auth server), which has no data endpoints at all.
3. **Broken barrel export.** `client/src/components/index.js` exports `./Burger`
   and `./Menu`, which do not exist. Any import of the barrel breaks the build.
4. **Broken reducer graph.** `reducers/dashboardReducer.js` imports
   `../.././src/components/App.js` (no such path); `surveysReducer.js` is an
   empty file; neither is registered in `combineReducers` — the entire dashboard
   Redux layer is dead code.
5. **Missing peer dependency.** `Analytics.js` imports from `flexmonster`, which
   is not in `package.json` (only `react-flexmonster` is) — build failure. The
   pivot it renders is Flexmonster's public CDN demo report, unrelated to the app.
6. **CSS framework collision.** Materialize (npm) + Bootstrap 4.5, Semantic UI,
   Font Awesome 4 *and* 5 via CDN `<link>` tags, plus four custom stylesheets.
   Two `<link rel="stylesheet">` tags point at JavaScript files (GSAP, FA JS).
7. **Stale toolchain.** Node pinned to 14.16.1, `react-scripts` 4, webpack-4-era
   devDependencies (jquery, popper, tether, bootstrap 4 alpha) unused by CRA.

## Secrets exposed in git history — ACTION REQUIRED

`oath_keys/clentIdNsecret.txt` (commit `a08cb8b`, June 2021) contains a real
**Google OAuth Client ID and Client Secret**. The file was deleted in `e04499a`
but remains retrievable from history. A full-history scan of every blob found
no other credential material.

- The credential must be **rotated/deleted in Google Cloud Console** — history
  scrubbing alone is insufficient (GitHub retains orphaned commits; clones and
  forks keep the data). This has been reported to the owner.
- This environment's permission policy blocks history rewriting; scrub commands
  are documented in the report to the owner.

## Reusable material

- **Domain intent** — the prototype's KPI tiles (total sales, products sold,
  refunds, store visits) and factura/clover split express the product need
  Signalroom formalizes: multi-source retail sales analytics.
- **Interim Xorai state** — its deterministic seeded dataset design, analytics
  SQL shapes, JWT/demo auth flow, and validated chart palette method carry
  forward conceptually; the code is superseded by the typed monorepo.
- Nothing else is worth carrying: no tests, no docs, no working data path.

## Removal list (all deleted during the rebuild)

Legacy prototype: everything under `client/` (CRA), root `index.js`, `models/`,
`routes/`, `services/`, `important_notes.txt`, Materialize/Bootstrap/Semantic
CDN links, dead Redux modules, Flexmonster usage.
Interim Xorai: `client/`, `server/`, `scripts/build-static-demo.mjs` (replaced
by typed apps under `apps/`).
