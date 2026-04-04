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
- [ ] Add duplicate import safeguards or import replacement confirmation UX
- [ ] Add better error messaging for invalid date / amount columns
- [ ] Add fixture-based parsing tests for common spreadsheet variants
- **Status:** pending

### Phase 3: Transaction Intelligence
- [ ] Improve category normalization and cleaning
- [ ] Add summary metrics for monthly trends and spending concentration
- [ ] Add export or snapshot options for transaction-derived reports
- [ ] Add richer filters to transactions and reports
- **Status:** pending

### Phase 4: Real Financial Model Expansion
- [ ] Define real data model for assets and liabilities
- [ ] Define real data model for investment holdings
- [ ] Connect buckets and goals to imported or maintained financial data
- [ ] Decide whether these domains remain client-side or move to a backend
- [x] Add PostgreSQL + Drizzle schema foundation for transactions and import history
- **Status:** in_progress

### Phase 5: Persistence and Multi-User Readiness
- [x] Evaluate database direction and choose Postgres + Drizzle
- [x] Add migration tooling and local Postgres bootstrap path
- [ ] Introduce authentication if needed
- [ ] Design per-user storage model
- [ ] Add migration path from browser-local state to database-backed state
- [ ] Move import flow from local persistence to database-backed append/replace workflows
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
| Import semantics | Append imports vs replace current dataset | Replace current dataset |
| Product scope | Transaction analytics only vs full portfolio system | Transaction analytics first |
| Deployment | Local/private use vs hosted product | Keep local/private friendly first |

## Near-Term Priorities

1. Move import persistence into Postgres without breaking the current UX.
2. Implement duplicate preview plus append-with-de-dup on top of import run tables.
3. Expand real models for assets, liabilities, and investments.
4. Prepare for optional auth and multi-device sync.
