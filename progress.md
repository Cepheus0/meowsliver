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

1. Move manual entry into the Postgres-backed transaction model.
2. Add a real review workflow for `conflict` rows.
3. Add edit / archive flows for savings goals and savings movements.
4. Improve category normalization and reporting accuracy.
5. Add visual regression checks for the main routes and dark mode.
