# Signalroom — product brief

**Signalroom · Retail Intelligence Studio**

## Job to be done

Give a retailer one clear place to import sales data, understand what changed,
discover what requires attention, and produce a report — without needing an
analyst.

## Promise

Upload transactional sales data and receive a reliable, understandable business
overview in under two minutes.

## Users

Small retail business owners · D2C operators · marketplace sellers · store
managers · junior business analysts. None of them are assumed to know SQL,
statistics jargon, or BI tooling.

## Product principles

1. **Demo before signup.** The complete product is experienceable from the
   landing page with zero authentication, on a clearly labeled sample
   workspace with a reset control.
2. **Numbers explain themselves.** Every KPI states its comparison, its change,
   and a plain-language definition. Insights are deterministic computations
   over real data — never invented, never causal beyond what the data shows.
   Observations and hypotheses are visually and verbally distinguished.
3. **Import is a first-class workflow**, not a settings page: preview,
   column mapping with reusable presets, row-level validation with a
   downloadable reject file, progress, and undo.
4. **Reports leave the building.** Any view can be saved; saved charts and
   insights compose into a report that exports to print-quality PDF and CSV.
5. **Honest copy.** Specific, calm, non-technical. "Refund value is 34% higher
   than the previous 30 days; most of the increase came from two products" —
   never "unlock powerful insights."

## Core workflows

- **Demo entry**: `/demo` → seeded workspace, all features, sample-data banner,
  reset.
- **Import**: CSV upload → preview/detect → map to canonical fields → validate
  (rejects downloadable) → confirm → progress → done; undo deletes the import
  and its transactions.
- **Executive overview**: net sales, gross sales, orders, units, AOV, refund
  rate, discount rate, repeat-customer rate, gross margin (when cost exists) —
  each with current, comparison, absolute + % change, trend spark, and a
  definition tooltip.
- **Exploration**: one filter system (date range, comparison, product,
  category, channel, store, country, import source) — URL-persisted,
  resettable, saved views, bottom sheet on mobile.
- **Sections**: Sales, Products, Customers, Channels & stores, Refunds,
  Data quality.
- **Insights**: deterministic engine (change decomposition, concentration,
  streaks, segment share) feeding linked, filtered views.
- **Reports**: compose saved charts/insights/notes, reorder, export.

## Out of scope (deliberately)

- LLM-generated narrative (the insight engine is deterministic first).
- Multi-currency conversion (currency is recorded and surfaced, not converted).
- Inventory, marketing attribution, forecasting.
