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

## Project Status

- Frontend-only Next.js application
- No backend, database, auth provider, or API routes yet
- Imported transactions are persisted locally in the browser via Zustand persistence
- Assets, liabilities, buckets, and investment areas are still partially scaffolded

## Core Commands

```bash
bun install
bun run dev
bun run build
bun run lint
bun run typecheck
```

## Code Areas

| Path | Purpose |
|---|---|
| `src/app/` | App Router pages |
| `src/components/charts/` | Chart and analytics UI |
| `src/components/forms/` | User input flows such as manual transaction entry |
| `src/components/layout/` | App shell, sidebar, top bar, theming |
| `src/components/ui/` | Reusable UI primitives |
| `src/lib/excel-parser.ts` | Spreadsheet parsing and column mapping |
| `src/lib/finance-analytics.ts` | Derived analytics from imported transactions |
| `src/store/finance-store.ts` | Zustand store and local persistence |

## Expectations For Agents

### 1. Before changing code

- Read the relevant page/component/store files first
- Confirm whether the change affects import flow, persisted state, or year-based filtering
- Check whether the requested behavior should be transaction-driven or needs a new data model

### 2. When editing behavior

- Preserve local persistence behavior unless explicitly changing it
- Avoid browser full reloads when client-side navigation is enough
- Ensure dashboard and reports degrade gracefully with empty states
- Keep import confirmation idempotent where practical

### 3. When adding features

- Document major decisions in `findings.md`
- Reflect roadmap changes in `task_plan.md`
- Record implementation milestones in `progress.md`
- Update `README.md` if the external-facing behavior materially changes

### 4. When verifying work

- Run `bun run typecheck`
- Run `bun run build`
- Run `bun run lint` when the touched area may affect lint-sensitive code paths

## Recommended Documentation Workflow

- `task_plan.md` = what we intend to do
- `findings.md` = what we learned and why we chose a direction
- `progress.md` = what we have already completed

## Things To Avoid

- Do not reintroduce `mock-data`-style runtime datasets
- Do not assume assets / investments are fully wired unless the code clearly shows it
- Do not add repo-specific secrets or machine-local credentials to tracked files
- Do not replace SPA navigation with hard redirects unless absolutely necessary

