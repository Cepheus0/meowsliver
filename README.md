# Meowsliver

Meowsliver is a Thai-language personal finance dashboard for importing, reviewing, and analyzing transaction data from Meowjot-style exports and similar spreadsheet files.

It is designed for users who already track their money in a ledger or banking app and want a clearer visual layer for cashflow, yearly comparisons, savings behavior, and transaction review.

## Highlights

- Thai-first personal finance experience
- Excel / CSV import flow with column mapping and preview
- Dashboard with yearly summaries, cashflow, and transaction-driven analytics
- Transaction list with search and filters
- Savings buckets, goals, reports, and investment-oriented screens
- Dark mode support
- Client-side persistence for imported data during local use

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
| Package Manager | Bun |

## Current Scope

This project currently focuses on transaction-driven analytics.

- Imported and manually added transactions drive the dashboard, transaction list, and reports
- Imported data is persisted locally in the browser via Zustand persistence
- Assets, liabilities, buckets, and investment holdings are still scaffolded as product surfaces and are not yet fully backed by real imported data models
- There is no backend, database, authentication, or API layer in the current version

## Key Features

### 1. Import Workflow

- Upload `.csv`, `.xls`, or `.xlsx`
- Auto-detect likely Meowjot exports
- Map source columns to the app schema
- Preview parsed transactions before confirming import
- Replace the current working dataset with the confirmed import

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

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed

### Install

```bash
bun install
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

## Recommended Usage

1. Open the import page
2. Upload a transaction export file
3. Confirm column mapping
4. Review the preview
5. Confirm the import
6. Move to dashboard, transactions, and reports for analysis

## Project Structure

```text
src/
  app/           Next.js routes
  components/    Charts, layout, forms, and reusable UI
  lib/           Parsing, analytics, types, and utilities
  store/         Zustand finance store
```

## Limitations

- Browser-local persistence only
- No multi-user support
- No cloud sync or backend storage
- Import pipeline currently emphasizes transaction rows rather than full portfolio reconciliation

## Roadmap Ideas

- Database-backed persistence
- Authentication and user profiles
- Better asset / liability ingestion
- Portfolio import support
- Export and sharing flows
- Production deployment configuration

## Repository Description

Suggested GitHub repository description:

> Thai personal finance dashboard for importing and analyzing Meowjot-style transaction data with Next.js, Zustand, and Recharts.

