# Progress Log

## 2026-03-30 to 2026-03-31

### Local Run and Runtime Stabilization
- Verified Bun-based local workflow
- Confirmed the app runs on Next.js 16 with the current dependency set
- Fixed Recharts prerender sizing warnings by deferring chart rendering until client mount

### Import and Analytics Cleanup
- Removed runtime mock datasets
- Introduced transaction-derived analytics via `src/lib/finance-analytics.ts`
- Reworked the UI to use explicit empty states where real data is not yet connected
- Connected manual entry to the persisted transaction flow

### Import Persistence Fix
- Identified the post-import full reload issue
- Replaced hard redirect behavior with client-side routing
- Persisted imported transactions, selected year, and sidebar state via Zustand middleware

## 2026-04-04

### Repository Migration and Private Repo Readiness
- Created a clean Git repository without old Git history
- Pushed the project to `github.com/Cepheus0/meowsliver`
- Added a public-style `README.md` even though the repo is private, so onboarding remains easy
- Added `AGENTS.md`, `task_plan.md`, `findings.md`, and `progress.md` as first-class repo docs for ongoing private development

### PostgreSQL + Drizzle Foundation
- Added PostgreSQL dependencies via `pg` and `drizzle-orm`
- Added Drizzle tooling via `drizzle-kit` and `tsx`
- Added `drizzle.config.ts`, `.env.example`, and `docker-compose.yml`
- Added database schema for `transactions`, `import_runs`, and `import_run_rows`
- Generated the initial SQL migration in `drizzle/`
- Added Bun scripts for schema generation, migrations, and Drizzle Studio
- Verified `bun run typecheck`, `bun run lint`, and `bun run build`
- Started local PostgreSQL with `docker compose up -d`
- Ran `bun run db:migrate` successfully against the local Postgres instance
- Verified the created tables directly in Postgres: `transactions`, `import_runs`, and `import_run_rows`

### DB-Backed Import Preview and Commit
- Added shared import normalization helpers in `src/lib/import-pipeline.ts`
- Added server-side fingerprinting and DB adapters in `src/lib/server/import-db.ts`
- Added API routes for import preview, import commit, and transaction hydration
- Changed import flow to preview against existing Postgres transactions before confirmation
- Added append-with-de-dup semantics backed by a unique transaction fingerprint index
- Added hybrid hydration so dashboard and transaction pages can pull from Postgres on cold start when local state is empty
- Verified smoke-test scenarios for `new`, `duplicate`, and `conflict` classification against the running local database

## 2026-04-06

### Savings Goals Redesign
- Replaced the non-functional Savings Buckets scaffolding with a DB-backed savings-goal system
- Added PostgreSQL tables and Drizzle schema for `savings_goals` and `savings_goal_entries`
- Added API routes to list goals, create goals, load goal detail, and add per-goal entries
- Redesigned `/buckets` into a savings-goal portfolio overview with presets, KPIs, and multi-goal cards
- Added `/buckets/[goalId]` with goal-specific progress, growth metrics, movement history, and balance trajectory chart
- Redirected `/goals` to `/buckets` to remove duplicate product concepts
- Updated dashboard to surface savings goals even when transaction data is still empty
- Verified the new savings-goal flow with typecheck, lint, build, API smoke tests, and DB cleanup after verification

## 2026-04-08

### Dark Mode Systemization
- Reworked theming from scattered page-level dark overrides into semantic theme tokens in `src/app/globals.css`
- Changed theme runtime to default to system theme via `next-themes`
- Updated shell, cards, buttons, year picker, empty states, and manual-entry modal to use shared theme tokens
- Added shared chart-theme helpers and rolled them into dashboard, reports, investments, and savings-goal charts

### Test Automation
- Added Vitest with coverage reporting
- Added unit tests for spreadsheet parsing, import normalization, import fingerprinting, dashboard analytics, and savings-goal analytics
- Added smoke-test automation for route availability, savings-goal APIs, and import preview / commit flows
- Added a Markdown test-report generator at `reports/test-report.md`
- Verified unit tests and smoke tests pass against the running local app

### Local Browser Automation Fallback
- Added a system-wide `playwright-fallback` command backed by `playwright-core`
- Added a repository wrapper at `bun run pw -- ...` for project-local browser checks and screenshot capture
- Standardized local browser artifacts into `output/playwright/`
- Documented the fallback workflow so browser QA can continue even while Codex Playwright MCP remains unstable on this machine

## 2026-04-17

### Dashboard Data Audit
- Verified `http://localhost:3000/` against the live Postgres dataset, API responses, and rendered UI
- Confirmed homepage counts and KPI values align with the database after whole-baht UI rounding:
  - `806` transactions
  - `18` accounts
  - `0` savings goals
  - `2026` income `811,217.69`, expense `877,194.09`, net `-65,976.40`, savings rate `-8.1%`
  - net worth `3,078,822.32`, assets `3,152,143.00`, liabilities `73,320.68`
- Confirmed the yearly comparison table aligns with cumulative transaction history for `2026`, `2025`, and `2024`
- Confirmed the savings-goal empty state is correct for the current dataset
- Identified the next implementation sequence as:
  1. Postgres-backed transaction CRUD
  2. Import conflict review workflow
  3. Account reconciliation and explainability
  4. Savings-goal lifecycle operations

### Sprint 1: Postgres-Backed Transaction CRUD
- Replaced browser-local manual entry with Postgres-backed transaction creation through `POST /api/transactions`
- Added manual transaction update/delete routes and server-side balance delta handling
- Added a reusable transaction form modal used by the global FAB and the transactions page edit flow
- Extended the transactions detail drawer with manual-row edit/delete actions
- Added client-side finance refresh helpers so transactions and accounts rehydrate together after manual writes and import commits
- Tightened repo test/lint config to ignore `.claude/`, `.next/`, and other non-project artifacts
- Added helper unit tests plus API/browser smoke coverage for manual transaction persistence and transaction-page CRUD behavior
- Generated a passing test report at `reports/test-report.md`

### Sprint 2: Import Conflict Review Workflow
- Added DB-backed conflict review state on `import_run_rows` through the new `review_action` field
- Added `PATCH /api/import/review` so preview rows can move from `conflict` into `new`, `duplicate`, or `skipped` explicitly
- Extended import preview payloads to include the matched existing transaction for review context
- Redesigned the preview step to show a dedicated conflict review queue and block commit until unresolved conflicts are cleared
- Added helper unit coverage for import-review state mapping
- Extended API smoke coverage to verify:
  1. conflict -> import as new -> commit inserts
  2. conflict -> keep existing -> commit skips cleanly
- Regenerated a passing `reports/test-report.md` after the sprint 2 flow landed

### Sprint 3: Account Reconciliation and Explainability
- Added reusable reconciliation modeling in `src/lib/account-reconciliation.ts` plus unit coverage for aligned, drifted, and no-linked-transaction states
- Extended account detail payloads so `/api/accounts/[accountId]` now includes a reconciliation summary alongside recent transactions
- Added `POST /api/accounts/[accountId]/reconcile` so users can explicitly reset an account balance to the linked transaction-derived balance
- Redesigned the account detail page to show stored balance, transaction-derived balance, balance difference, linked income/expense totals, transfer-row count, and last linked transaction date
- Added API smoke coverage for the full reconcile lifecycle:
  1. create temp account with opening balance
  2. reject reconcile when no linked transactions exist
  3. create linked manual transaction to produce drift
  4. verify explainability payload shows the drift
  5. reconcile and confirm the stored balance matches the ledger
- Regenerated a passing `reports/test-report.md` after the sprint 3 flow landed

## Current Status

| Area | Status |
|---|---|
| Local development | stable |
| Import flow | working |
| Dashboard analytics | transaction-driven and working |
| Reports | working |
| Browser-local persistence | working |
| PostgreSQL + Drizzle foundation | working |
| DB-backed import preview + commit | working |
| DB-backed savings goals | working |
| Dark mode system | working |
| Automated unit tests | working |
| Automated smoke tests | working |
| Generated test reporting | working |
| Asset / liability model | partial |
| Investment model | partial |
| Auth | not started |
| Database-backed runtime flows | partial / hybrid |

## Next Likely Milestones

1. Add edit / archive / delete flows for savings goals and savings movements.
2. Add transaction-to-goal contribution shortcuts where they improve auditability.
3. Improve category normalization and reporting accuracy.
4. Add visual regression checks for the main routes and dark mode.
5. Decide whether opening balances should stay as stored values or become explicit ledger transactions in a later migration.
