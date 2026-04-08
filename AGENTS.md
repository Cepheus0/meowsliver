# AGENTS.md

This repository is a private working repo and may include planning, diagnostic, and AI collaboration artifacts alongside product code.

## Purpose

Meowsliver is a Thai-language personal finance dashboard focused on importing and analyzing transaction data from spreadsheet exports such as Meowjot-style ledgers.

Use this file as the primary operating guide for AI coding agents working in this repository.

## Working Principles

- Prioritize minimal, safe changes over speculative refactors
- Preserve user-facing Thai copy unless there is a strong product reason to revise it
- Keep the app honest: do not reintroduce fake demo data into runtime flows
- Prefer transaction-driven analytics over fabricated placeholders
- Treat import, dashboard, transactions, and reports as the current core product surface
- Treat savings goals as a real persisted feature surface, not placeholder scaffolding

## Project Status

- Next.js application with PostgreSQL + Drizzle backing the import pipeline
- No auth provider or production API routes wired yet
- Import preview and commit now go through database-backed API routes with duplicate detection
- Savings goals now use database-backed API routes and Postgres persistence
- Dashboard hydration can pull transactions from Postgres when local runtime state is empty
- Imported transactions are still mirrored into Zustand persistence for a smooth local UX
- Manual entry is still browser-local and has not yet been moved into Postgres
- Dark mode now uses semantic theme tokens and shared chart-theme helpers instead of isolated page overrides
- The repo now includes automated unit tests, smoke tests, and a Markdown test-report generator
- This machine now has a system-wide `playwright-fallback` command plus `bun run pw -- ...` as the preferred browser-automation fallback when Codex Playwright MCP is unstable
- Assets, liabilities, and investment areas are still partially scaffolded
- Savings goals are now the source of truth for buckets-style goal tracking, and `/goals` is only an alias route

## Core Commands

```bash
bun install
bun run dev
bun run build
bun run lint
bun run test
bun run test:report
bun run pw -- check http://localhost:3000 --screenshot
bun run typecheck
bun run db:generate
bun run db:migrate
bun run db:studio
```

## Code Areas

| Path | Purpose |
|---|---|
| `src/app/` | App Router pages |
| `src/components/charts/` | Chart and analytics UI |
| `src/components/forms/` | User input flows such as manual transaction entry |
| `src/components/layout/` | App shell, sidebar, top bar, theming |
| `src/components/ui/` | Reusable UI primitives |
| `src/lib/chart-theme.ts` | Shared chart colors and tooltip styling for light/dark mode |
| `src/lib/excel-parser.ts` | Spreadsheet parsing and column mapping |
| `src/lib/import-pipeline.ts` | Shared import normalization and preview request shapes |
| `src/lib/savings-goal-analytics.ts` | Pure savings-goal calculations used by both runtime and tests |
| `src/lib/server/import-db.ts` | Server-side fingerprinting and DB-to-UI adapters |
| `src/lib/server/savings-goals.ts` | Savings-goal metrics, DB adapters, and goal-detail assembly |
| `src/lib/savings-goals.ts` | Goal presets, labels, and shared goal helpers |
| `src/lib/finance-analytics.ts` | Derived analytics from imported transactions |
| `scripts/` | Smoke-test and report automation |
| `src/store/finance-store.ts` | Zustand store and local persistence |
| `src/db/` | Postgres client, schema, and migration entrypoint |
| `src/app/api/` | Import preview, import commit, transaction hydration, and savings-goal endpoints |
| `drizzle/` | Generated SQL migrations and Drizzle metadata |

## Expectations For Agents

### 1. Before changing code

- Read the relevant page/component/store files first
- Confirm whether the change affects import flow, persisted state, or year-based filtering
- Confirm whether the change should remain browser-local or move into the Postgres/Drizzle layer
- Check whether the requested behavior should be transaction-driven or needs a new data model

### 2. When editing behavior

- Preserve local persistence behavior for UX-critical state unless explicitly changing it
- Prefer database-backed persistence for new long-term data flows instead of expanding browser-only storage indefinitely
- Avoid browser full reloads when client-side navigation is enough
- Ensure dashboard and reports degrade gracefully with empty states
- Keep import confirmation idempotent where practical
- Extend semantic theme tokens instead of sprinkling new hard-coded light/dark colors
- Treat transaction fingerprints as the source of truth for de-dup behavior
- Treat typed savings-goal entries as the source of truth for goal balances, gain %, and progress

### 3. When adding features

- Document major decisions in `findings.md`
- Reflect roadmap changes in `task_plan.md`
- Record implementation milestones in `progress.md`
- Update `README.md` if the external-facing behavior materially changes

### 4. When verifying work

- Run `bun run typecheck`
- Run `bun run build`
- Run `bun run lint` when the touched area may affect lint-sensitive code paths
- Run `bun run test` when touching import logic, analytics, savings goals, or cross-page behavior
- Run `bun run test:report` when you need an audit-friendly artifact for a larger change
- Prefer `bun run pw -- ...` or `playwright-fallback ...` for local browser inspection on this machine before attempting MCP browser tooling again

## Recommended Documentation Workflow

- `task_plan.md` = what we intend to do
- `findings.md` = what we learned and why we chose a direction
- `progress.md` = what we have already completed

## Things To Avoid

- Do not reintroduce `mock-data`-style runtime datasets
- Do not assume assets / investments are fully wired unless the code clearly shows it
- Do not add repo-specific secrets or machine-local credentials to tracked files
- Do not replace SPA navigation with hard redirects unless absolutely necessary
- Do not bypass migrations by hand-editing database state unless the change is explicitly migration-safe
