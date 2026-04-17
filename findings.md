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
- The application now also has database-backed API routes for savings goals and per-goal savings entries
- PostgreSQL + Drizzle now back the transaction import pipeline and import history
- PostgreSQL + Drizzle now also back the savings-goal subsystem via `savings_goals` and `savings_goal_entries`
- The runtime is still hybrid: database-backed for financial writes and durable records, browser-local for some UI/runtime convenience state
- The runtime is now much closer to DB-first for financial writes: imported transactions, manual transaction CRUD, savings goals, and conflict review decisions are all persisted in Postgres
- There is still no auth stack or per-user isolation
- Imported transaction data is still mirrored into Zustand middleware for a smoother client experience
- Charts are client-rendered with a hydration-safe wrapper to avoid SSR sizing issues
- Dark mode is now driven by semantic CSS theme variables and shared chart tokens rather than isolated page-level overrides
- The repo now includes an automated test layer with Vitest unit coverage, smoke tests, and generated Markdown reporting
- Codex Playwright MCP remains unreliable on this machine, so local browser validation is now standardized around a CLI-first Playwright fallback
- The initial Drizzle migration has been generated successfully
- Local PostgreSQL was started with Docker Compose and migrations ran successfully, including the unique fingerprint constraint used for de-dup

## Product Findings

- Dashboard, transactions, and reports are the most mature user-facing surfaces
- Savings buckets were previously scaffolding, but are now redesigned as a real savings-goal portfolio system with overview and per-goal detail flows
- The old `/goals` concept was duplicative and misleading; it now works better as an alias into the savings-goal experience
- Savings goals are intentionally independent from imported transaction rows for now, which keeps the goal-tracking model explicit and auditable
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
| Redesign buckets as explicit savings goals with entry history | The old bucket scaffolding could not support progress, gain %, or growth detail reliably |
| Store savings movements as typed entries (`contribution`, `growth`, `withdrawal`, `adjustment`) | Makes portfolio progress and return calculations explainable and extensible |
| Redirect `/goals` to `/buckets` | Removes duplicate product concepts and keeps one source of truth for savings planning |
| Introduce semantic theme tokens before further UI polish | Keeps light/dark mode maintainable as more product surfaces are added |
| Add report-generating test automation instead of relying on ad hoc verification | Makes larger changes easier to audit, share, and repeat |
| Standardize on a CLI-first Playwright fallback for local browser checks on this machine | Keeps browser QA moving even while MCP browser transport remains unreliable |

## Known Gaps

- No formal data model for assets, liabilities, or portfolio holdings beyond current scaffolding
- No production deployment workflow captured in the repo yet
- There is still no visual regression layer for validating dark mode across main routes
- Account reconciliation currently excludes `transfer` rows from the transaction-derived balance to avoid double counting across accounts
- Opening balances are still implicit stored values rather than explicit ledger-opening transactions, so reconciliation is intentionally opt-in and explanatory rather than automatic
- Savings goals are still independent from transaction rows, so contribution shortcuts and cross-ledger auditability remain follow-on work

## Recommended Direction

### Short Term

- Harden import reliability
- Keep expanding fixture-backed tests for parsing, fingerprinting, and duplicate classification
- Add savings-goal lifecycle operations
- Add visual QA checkpoints for dark mode

### Medium Term

- Expand the financial model to cover assets, liabilities, and investments properly
- Move the remaining browser-local runtime state and per-user persistence fully into the backend layer
- Add richer savings-goal operations such as editing targets, reconciling balances, and goal lifecycle states

### Long Term

- Add user accounts, cloud sync, and production deployment only after the import and analytics model is trustworthy

## 2026-04-17 Dashboard Audit

### Verification Scope

- Verified the homepage at `http://localhost:3000/`
- Compared live UI output against the homepage data sources:
  - Postgres tables in the local `meowsliver` database
  - `GET /api/transactions`
  - `GET /api/accounts`
  - `GET /api/savings-goals`
- Used local browser automation plus a rendered screenshot to confirm what the user actually sees after hydration

### Audit Results

- Homepage transaction count matches the database exactly at `806` rows
- Homepage accounts count matches the database exactly at `18` active/non-archived account records
- Homepage savings-goal empty state is correct because the database currently has `0` savings goals and `0` savings-goal entries
- Dashboard summary cards for the selected year `2026` match the transaction dataset after whole-baht formatting:
  - Income: DB `811,217.69` -> UI `฿ 811,218`
  - Expense: DB `877,194.09` -> UI `฿ 877,194`
  - Net cashflow: DB `-65,976.40` -> UI `-฿ 65,976`
  - Savings rate: DB `-8.1%` -> UI `-8.1%`
- Accounts overview and the asset/liability pie use the account balances correctly after whole-baht formatting:
  - Net worth: DB `3,078,822.32` -> UI `฿ 3,078,822`
  - Assets: DB `3,152,143.00` -> UI `฿ 3,152,143`
  - Liabilities: DB `73,320.68` -> UI `฿ 73,321`
- Yearly comparison table is consistent with the transaction history and cumulative-running-balance logic for `2026`, `2025`, and `2024`
- The cashflow chart is visually consistent with the underlying monthly distribution for `2026`: activity appears in January through April, with April carrying the only negative net month

### Important Interpretation Notes

- The dashboard is currently a hybrid runtime:
  - Transactions are hydrated from Postgres into Zustand
  - Accounts are fetched from Postgres into Zustand
  - Savings goals are fetched directly from API routes
- Whole-baht rounding is expected across the UI because `formatBaht()` intentionally suppresses satang
- Account balances are still their own persisted source of truth; they are not yet a fully reconciled ledger derived from linked transactions

### Product Trust Risks Exposed By The Audit

- The dashboard data is currently correct for the live dataset, but trust still depends on hybrid runtime behavior and multiple sources of truth
- The status copy on the homepage is directionally true for this dataset, but it still overstates backend completeness because account balances are not yet fully ledger-reconciled
- Account reconciliation now explains drift clearly on account detail pages, but transfer rows and opening balances still require explicit user judgment

### Sprint 1 Outcome

- Manual transaction entry now persists through Postgres-backed create/edit/delete flows instead of browser-local Zustand only
- The transactions page now supports editing and deleting manual rows through the detail drawer
- Import commit now refreshes account data immediately so dashboard/account balances stay aligned after writes
- Manual transaction balance effects are applied as deltas against account balances instead of forcing a full ledger reconciliation
- Explicit account reconciliation remains a separate follow-on feature because the current account model still treats account balances as the primary source of truth

## Recommended Next Feature Sequence

### 1. Postgres-Backed Transaction CRUD

- Why it matters: removes the biggest remaining hybrid-runtime gap and lets users correct or add transactions without relying on browser-local state
- User impact: high
- Dependencies: transaction API routes for create/update/delete, optimistic UI updates, migration of manual-entry flow
- Trade-off: requires careful handling so edits do not break import fingerprints or audit trails

### 2. Import Conflict Review Workflow

- Why it matters: the import pipeline already detects `conflict` rows, but users still cannot resolve them with confidence before commit
- User impact: high
- Dependencies: preview-row detail UI, resolution actions, import-run persistence refinements, regression tests around duplicate semantics
- Trade-off: more workflow complexity in exchange for much better import trust and lower data-cleanup cost later

### Sprint 2 Outcome

- Conflict rows now have a DB-backed review state before commit instead of being passive warnings only
- The import preview UI now shows a dedicated review queue with side-by-side context for the incoming row and the matched existing row
- Users can now choose `import_as_new`, `keep_existing`, or `skip` on each conflict row
- Import commit is now blocked while unresolved conflict rows remain, which reduces accidental dirty imports
- Smoke coverage now validates both high-value resolution paths:
  - review conflict -> import as new -> commit inserts the row
  - review conflict -> keep existing -> commit skips insertion cleanly

### Sprint 3 Outcome

- Account detail pages now expose a reconciliation summary that compares stored balance against the balance derived from linked transactions
- Users can now see the linked income, linked expense, transfer-row count, and last linked transaction date before deciding whether to reconcile
- Reconciliation is now an explicit API-backed action instead of an implicit overwrite, which is safer while opening balances are still modeled as stored values
- The reconcile endpoint intentionally rejects accounts with no linked transactions so users do not accidentally zero out manual opening balances
- Automated coverage now validates both the reconciliation helper logic and the end-to-end account reconcile API flow

### Sprint 4 Outcome

- Savings goals now support the missing lifecycle actions needed for daily use: archive, restore, delete, edit entry, and delete entry
- The portfolio API now separates active goals from archived goals so the overview page can keep the working set focused without hiding historical goals
- Archived goals now act as read-only history by design until the user restores them, which preserves auditability for movement history
- Entry update/delete flows now validate that the resulting goal balance does not become negative, keeping correction flows safe
- Automated coverage now validates the full goal lifecycle sequence: create -> update -> add entry -> edit entry -> archive -> restore -> delete entry -> delete goal

### 3. Account Reconciliation and Explainability

- Why it matters: homepage balances are correct relative to the `accounts` table, but users cannot yet see whether each balance comes from manual adjustments, imported transactions, or drift
- User impact: high for repeat users
- Dependencies: balance-recalc service, account-detail reconciliation UI, transaction/account linkage checks
- Trade-off: deeper modeling work, but it materially improves credibility for a finance product

### 4. Savings Goal Lifecycle Operations

- Why it matters: the dashboard correctly shows the empty state today, but the feature still lacks edit/archive/delete and entry correction flows needed for everyday use
- User impact: medium to high
- Dependencies: goal mutation routes, entry mutation routes, optimistic refresh patterns, confirmation UX
- Trade-off: lower urgency than transaction trust work, but important for retention once users begin goal tracking
