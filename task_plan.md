# Task Plan

## Goal

Evolve Meowsliver from a strong local transaction-analysis prototype into a more complete personal finance product with clearer data modeling, better import reliability, and optional production deployment readiness.

## Current Phase

Phase 5

## Phases

### Phase 1: Foundation Stabilization
- [x] Confirm Bun / Next.js local workflow
- [x] Remove runtime mock data
- [x] Fix import-to-dashboard data persistence
- [x] Add external-facing README and repo metadata
- **Status:** complete

### Phase 2: Import Quality
- [ ] Add clearer post-import success summaries by year and category
- [x] Add duplicate import safeguards with DB-backed preview and append-with-de-dup
- [ ] Add better error messaging for invalid date / amount columns
- [x] Add automated unit tests for parsing, fingerprinting, normalization, and duplicate semantics
- **Status:** in_progress

### Phase 3: Transaction Intelligence
- [ ] Improve category normalization and cleaning
- [ ] Add summary metrics for monthly trends and spending concentration
- [ ] Add export or snapshot options for transaction-derived reports
- [ ] Add richer filters to transactions and reports
- **Status:** pending

### Phase 4: Real Financial Model Expansion
- [ ] Define real data model for assets and liabilities
- [ ] Define real data model for investment holdings
- [x] Redesign Savings Buckets as DB-backed savings goals with per-goal detail pages
- [x] Move savings goals off placeholder client-only scaffolding and into Postgres
- [x] Decide that new savings-goal persistence lives in the backend layer
- [x] Add PostgreSQL + Drizzle schema foundation for transactions and import history
- **Status:** in_progress

### Phase 5: Persistence and Multi-User Readiness
- [x] Evaluate database direction and choose Postgres + Drizzle
- [x] Add migration tooling and local Postgres bootstrap path
- [x] Move import flow into database-backed append workflows with duplicate preview
- [x] Move manual transaction CRUD into Postgres-backed API flows
- [ ] Introduce authentication if needed
- [ ] Design per-user storage model
- [ ] Move the remaining browser-local runtime persistence into Postgres
- **Status:** in_progress

### Phase 5.5: Experience Quality
- [x] Formalize dark mode with semantic theme tokens and shared chart styling
- [x] Add smoke-test automation for critical routes and API flows
- [x] Add generated Markdown QA report output for engineering review
- [x] Add a CLI-based Playwright fallback path for local browser QA on machines where MCP browser transport is unstable
- [ ] Add visual regression or screenshot-based checks for key routes
- **Status:** in_progress

### Phase 5.6: Data Trust and Daily-Use UX
- [x] Move manual transaction entry, edit, and delete into Postgres-backed CRUD
- [x] Add a pre-commit review workflow for `conflict` rows with clear resolution choices
- [x] Add account reconciliation so account balances can be refreshed or explained from linked transactions
- [ ] Add lifecycle operations for savings goals and savings-goal entries (edit, archive, delete)
- [ ] Add transaction-to-goal linking or contribution shortcuts where it improves auditability
- **Status:** in_progress

### Phase 6: Production Readiness
- [ ] Deployment configuration
- [ ] Environment variable strategy
- [ ] Error monitoring
- [ ] Basic analytics and usage instrumentation
- [ ] CI checks and branch protection expectations
- **Status:** pending

## Key Decisions In Flight

| Topic | Options | Current Lean |
|---|---|---|
| Persistence | Browser-local only vs backend storage | Postgres + Drizzle foundation, staged migration from browser-local runtime |
| Import semantics | Append imports vs replace current dataset | Append with DB-backed de-dup and preview |
| Product scope | Transaction analytics only vs full portfolio system | Transaction analytics first |
| Deployment | Local/private use vs hosted product | Keep local/private friendly first |

## Near-Term Priorities

1. Add edit / archive / delete flows for savings goals and savings-goal entries.
2. Review homepage copy so "ข้อมูลจริงทั้งหมด" matches the remaining hybrid/reconciliation state.
3. Add transaction-to-goal linking once CRUD and lifecycle foundations are stable.
4. Add visual regression coverage for light/dark mode on core pages.
5. Review whether opening balances should become explicit ledger-opening transactions in a later migration.
