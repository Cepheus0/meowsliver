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
- The runtime is frontend-only
- There is no API layer, server-side persistence, database, or auth stack in the current repo
- Imported transaction data is persisted locally via Zustand middleware and browser storage
- Charts are client-rendered with a hydration-safe wrapper to avoid SSR sizing issues

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

## Known Gaps

- No automated test suite around import parsing yet
- No backend persistence or cloud sync
- No formal data model for assets, liabilities, or portfolio holdings beyond current scaffolding
- No production deployment workflow captured in the repo yet

## Recommended Direction

### Short Term

- Harden import reliability
- Improve analytics confidence and visibility
- Add more deterministic handling of malformed rows and duplicates

### Medium Term

- Expand the financial model to cover assets, liabilities, and investments properly
- Decide whether to remain a local-first tool or introduce backend persistence

### Long Term

- Add user accounts, cloud sync, and production deployment only after the import and analytics model is trustworthy

