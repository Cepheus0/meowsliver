# Meowsliver

Meowsliver is a Thai-language personal finance dashboard for importing, reviewing, and analyzing transaction data from Meowjot-style exports and similar spreadsheet files.

It is designed for users who already track their money in a ledger or banking app and want a clearer visual layer for cashflow, yearly comparisons, savings behavior, and transaction review.

## Highlights

- Thai-first personal finance experience
- Excel / CSV import flow with column mapping and preview
- Dashboard with yearly summaries, cashflow, and transaction-driven analytics
- Transaction list with search and filters
- DB-backed savings goals with per-goal progress, growth, and movement history
- Dark mode support
- PostgreSQL + Drizzle-backed import history, duplicate preview, and append-with-de-dup
- Client-side persistence retained for local UX state while long-lived savings goals now persist in Postgres

## Tech Stack

| Layer | Stack |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| Charts | Recharts |
| Import Parsing | xlsx |
| Database Foundation | PostgreSQL + Drizzle ORM |
| Package Manager | Bun |

## Current Scope

This project currently focuses on transaction-driven analytics.

- Imported and manually added transactions currently drive the dashboard, transaction list, and reports
- Import preview and commit now run through PostgreSQL + Drizzle using `import_runs`, `import_run_rows`, and `transactions`
- Savings goals now run through PostgreSQL + Drizzle using `savings_goals` and `savings_goal_entries`
- Dashboard and transaction pages can hydrate from the database on cold start when local state is empty
- Local browser persistence is still retained for selected year, sidebar state, and manual-only entries
- Assets, liabilities, and investment holdings are still scaffolded as product surfaces and are not yet fully backed by real imported data models
- Authentication and production API workflows are not wired yet

## Key Features

### 1. Import Workflow

- Upload `.csv`, `.xls`, or `.xlsx`
- Auto-detect likely Meowjot exports
- Map source columns to the app schema
- Preview parsed transactions against existing database records before confirming import
- Classify rows as `new`, `duplicate`, `conflict`, or `skipped`
- Commit only `new` rows into Postgres with append + de-dup protection

### 2. Dashboard

- Total income, expenses, net cashflow, and savings rate
- Monthly cashflow charts
- Year-over-year comparison table
- Empty-state guidance when no transaction data has been imported yet

### 3. Transactions

- Year-aware transaction view
- Search by category or note
- Filter by income / expense
- Manual quick-add entry flow

### 4. Reports

- Yearly trend analysis
- Expense breakdown by category
- Monthly income vs expense visualizations

### 5. Savings Goals

- Create multiple savings goals in parallel, such as wedding, retirement, home down payment, or custom goals
- Track goal-specific balance, target progress, total growth, and return percentage
- Record typed goal movements such as contributions, growth, withdrawals, and adjustments
- Open each goal to inspect detailed progress, balance trajectory, and movement history

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed

### Install

```bash
bun install
```

### Environment

Copy the example file and set your Postgres connection:

```bash
cp .env.example .env.local
```

Default local development URL:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meowsliver
```

### Local Postgres

Start PostgreSQL with Docker Compose:

```bash
docker compose up -d
```

Generate and run migrations:

```bash
bun run db:generate
bun run db:migrate
```

### Run locally

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for production

```bash
bun run build
bun run start
```

### Quality checks

```bash
bun run typecheck
bun run lint
```

### Database tooling

```bash
bun run db:generate
bun run db:migrate
bun run db:studio
```

## Recommended Usage

1. Open the import page
2. Upload a transaction export file
3. Confirm column mapping
4. Review the preview
5. Confirm the import
6. Create or update savings goals in `/buckets`
7. Move to dashboard, transactions, and reports for analysis

## Project Structure

```text
drizzle/         Generated SQL migrations
src/
  app/           Next.js routes
  components/    Charts, layout, forms, and reusable UI
  db/            Postgres client, schema, and migration runner
  lib/           Parsing, analytics, types, and utilities
  store/         Zustand finance store
```

## Limitations

- No multi-user support yet
- Runtime is currently hybrid: import persistence and savings goals are DB-backed, but manual entry still remains browser-local
- Import pipeline currently emphasizes transaction rows rather than full portfolio reconciliation
- Savings goals do not yet support edit, archive, or delete flows

## Roadmap Ideas

- Manual-entry persistence into Postgres
- Authentication and user profiles
- Better asset / liability ingestion
- Portfolio import support
- Real review workflow for `conflict` rows before import
- Export and sharing flows
- Production deployment configuration

## Repository Description

Suggested GitHub repository description:

> Thai personal finance dashboard for importing and analyzing Meowjot-style transaction data with Next.js, Zustand, and Recharts.
