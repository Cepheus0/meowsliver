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
- The runtime is now hybrid: database-backed for imported transactions and savings goals, browser-local for some UI and manual entry flows
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

- Manual entry is still browser-local and not yet committed into Postgres
- Savings goals still do not support archive, delete, or bulk import flows
- Entry-level edit/delete for savings movements is not implemented yet
- No formal data model for assets, liabilities, or portfolio holdings beyond current scaffolding
- No production deployment workflow captured in the repo yet
- `conflict` rows are identified, but there is not yet a user review workflow to resolve them before import
- There is still no visual regression layer for validating dark mode across main routes

## Recommended Direction

### Short Term

- Harden import reliability
- Keep expanding fixture-backed tests for parsing, fingerprinting, and duplicate classification
- Add a resolution workflow for `conflict` rows
- Add visual QA checkpoints for dark mode

### Medium Term

- Expand the financial model to cover assets, liabilities, and investments properly
- Move manual entry and per-user persistence fully into the backend layer
- Add richer savings-goal operations such as editing targets, reconciling balances, and goal lifecycle states

### Long Term

- Add user accounts, cloud sync, and production deployment only after the import and analytics model is trustworthy
