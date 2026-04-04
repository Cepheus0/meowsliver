# Findings & Decisions

## Current Product Position

Meowsliver is currently strongest as a transaction-centric personal finance analysis tool rather than a full balance-sheet or portfolio platform.

The most reliable working flow today is:

1. Import a spreadsheet
2. Confirm mapping
3. Persist the imported transaction set locally
4. Review dashboard, transactions, and reports

## Architecture Findings

- The application is built with Next.js App Router, React, TypeScript, Tailwind CSS, Zustand, Recharts, and `xlsx`
- The current user-facing runtime is still browser-driven
- PostgreSQL + Drizzle foundation has now been added for long-term persistence and import history
- There is still no auth stack, and no production import API flow is wired yet
- Imported transaction data is persisted locally via Zustand middleware and browser storage
- Charts are client-rendered with a hydration-safe wrapper to avoid SSR sizing issues
- The initial Drizzle migration has been generated successfully
- Local PostgreSQL was started with Docker Compose and the initial migration ran successfully

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

## Known Gaps

- No automated test suite around import parsing yet
- Runtime still depends on browser-local persistence for active app behavior
- No formal data model for assets, liabilities, or portfolio holdings beyond current scaffolding
- No production deployment workflow captured in the repo yet
- No database-backed import execution path is wired into the app yet, despite the new schema foundation

## Recommended Direction

### Short Term

- Harden import reliability
- Move import execution into the new database foundation
- Add deterministic duplicate preview and append-with-de-dup

### Medium Term

- Expand the financial model to cover assets, liabilities, and investments properly
- Decide whether to remain a local-first tool or introduce backend persistence

### Long Term

- Add user accounts, cloud sync, and production deployment only after the import and analytics model is trustworthy
