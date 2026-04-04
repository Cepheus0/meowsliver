# Findings & Decisions

## Current Product Position

Meowsliver is currently strongest as a transaction-centric personal finance analysis tool rather than a full balance-sheet or portfolio platform.

The most reliable working flow today is:

1. Import a spreadsheet
2. Confirm mapping
3. Preview duplicates and conflicts against Postgres
4. Commit only new rows into Postgres
5. Hydrate dashboard, transactions, and reports from the committed transaction set

## Architecture Findings

- The application is built with Next.js App Router, React, TypeScript, Tailwind CSS, Zustand, Recharts, and `xlsx`
- The application now has database-backed API routes for import preview, import commit, and transaction hydration
- PostgreSQL + Drizzle now back the transaction import pipeline and import history
- The runtime is now hybrid: database-backed for imported transactions, browser-local for some UI and manual entry flows
- There is still no auth stack or per-user isolation
- Imported transaction data is still mirrored into Zustand middleware for a smoother client experience
- Charts are client-rendered with a hydration-safe wrapper to avoid SSR sizing issues
- The initial Drizzle migration has been generated successfully
- Local PostgreSQL was started with Docker Compose and migrations ran successfully, including the unique fingerprint constraint used for de-dup

## Product Findings

- Dashboard, transactions, and reports are the most mature user-facing surfaces
- Savings buckets, goals, and investments exist as product scaffolding but are not yet fully connected to real imported financial models
- The import experience is a central differentiator and should stay high-trust and low-friction

## Technical Decisions

| Decision | Reason |
|---|---|
| Remove runtime mock data | Prevent misleading analytics and keep the app honest |
| Use local persistence for imported transactions | Make the app usable immediately without a backend |
| Replace imported dataset on confirmation | Prevent accidental duplicate accumulation during repeated tests |
| Use client-side navigation after import | Avoid wiping in-memory state during route changes |
| Keep unsupported domains in empty-state mode | Better than showing synthetic values |
| Add Postgres + Drizzle before implementing append + de-dup | Makes duplicate analysis durable and avoids tying import integrity to a single browser profile |
| Use a unique transaction fingerprint in Postgres | Makes append + de-dup enforceable at the database layer, not just in UI logic |
| Hydrate transactions from Postgres when local state is empty | Preserves the lightweight client UX while letting DB-backed imports survive cold starts |

## Known Gaps

- No automated test suite around import parsing yet
- Manual entry is still browser-local and not yet committed into Postgres
- No formal data model for assets, liabilities, or portfolio holdings beyond current scaffolding
- No production deployment workflow captured in the repo yet
- `conflict` rows are identified, but there is not yet a user review workflow to resolve them before import

## Recommended Direction

### Short Term

- Harden import reliability
- Add fixture-backed tests for parsing, fingerprinting, and duplicate classification
- Add a resolution workflow for `conflict` rows

### Medium Term

- Expand the financial model to cover assets, liabilities, and investments properly
- Move manual entry and per-user persistence fully into the backend layer

### Long Term

- Add user accounts, cloud sync, and production deployment only after the import and analytics model is trustworthy
