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

## Current Status

| Area | Status |
|---|---|
| Local development | stable |
| Import flow | working |
| Dashboard analytics | transaction-driven and working |
| Reports | working |
| Browser-local persistence | working |
| PostgreSQL + Drizzle foundation | scaffolded |
| Asset / liability model | partial |
| Investment model | partial |
| Auth | not started |
| Database-backed runtime flows | not started |

## Next Likely Milestones

1. Wire the import flow into Postgres.
2. Add duplicate preview and append-with-de-dup on top of `import_runs`.
3. Improve category normalization and reporting accuracy.
4. Expand real models for assets, liabilities, and investments.
