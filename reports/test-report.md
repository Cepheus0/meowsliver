# Test Report

- Generated at: 17 Apr 2026, 20:08:40
- Target app URL: http://localhost:3000
- Overall status: PASS

## Coverage Design

| Feature Area | Automated Coverage | Remaining Manual Checks |
| --- | --- | --- |
| Theme and layout shell | Build + route smoke checks | Visual QA across desktop/mobile breakpoints |
| Import mapping and dedupe | Unit tests + API smoke preview/commit | Large-file UX, mapping edge cases from real exports |
| Dashboard analytics | Unit tests for finance analytics | Data storytelling review with real data |
| Transactions page | Route smoke checks + analytics unit coverage | Search/filter UX and pagination behavior |
| Savings goals portfolio | Unit tests + API smoke for create/update/entry | Edit/delete/archive UX, long-form content polish |
| Reports and investments | Build + route smoke checks | Chart readability and empty/loaded visual QA |

## Execution Summary

| Step | Status | Command |
| --- | --- | --- |
| Typecheck | PASS | `bun run typecheck` |
| Lint | PASS | `bun run lint` |
| Build | PASS | `bun run build` |
| Unit Tests | PASS | `bun run test:unit` |
| Smoke Tests | PASS | `bun run test:smoke` |

## Typecheck

- Status: PASS
- Command: `bun run typecheck`

### Stdout
_No output_

### Stderr
```text
$ tsc --noEmit
```

## Lint

- Status: PASS
- Command: `bun run lint`

### Stdout
_No output_

### Stderr
```text
$ eslint
```

## Build

- Status: PASS
- Command: `bun run build`

### Stdout
```text
▲ Next.js 16.1.3 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 4.4s
  Running TypeScript ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/11) ...
  Generating static pages using 7 workers (2/11) 
  Generating static pages using 7 workers (5/11) 
  Generating static pages using 7 workers (8/11) 
✓ Generating static pages using 7 workers (11/11) in 342.4ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /accounts
├ ƒ /accounts/[accountId]
├ ƒ /api/accounts
├ ƒ /api/accounts/[accountId]
├ ƒ /api/accounts/[accountId]/reconcile
├ ƒ /api/import/commit
├ ƒ /api/import/preview
├ ƒ /api/import/review
├ ƒ /api/savings-goals
├ ƒ /api/savings-goals/[goalId]
├ ƒ /api/savings-goals/[goalId]/entries
├ ƒ /api/transactions
├ ƒ /api/transactions/[transactionId]
├ ○ /buckets
├ ƒ /buckets/[goalId]
├ ○ /goals
├ ○ /import
├ ○ /investments
├ ○ /reports
├ ƒ /reports/[year]/[month]
└ ○ /transactions


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Stderr
```text
$ next build
```

## Unit Tests

- Status: PASS
- Command: `bun run test:unit`

### Stdout
```text
RUN  v4.1.3 /Users/woraweechanlongrat/Documents/projects/meowsliver
      Coverage enabled with v8


 Test Files  12 passed (12)
      Tests  58 passed (58)
   Start at  20:09:00
   Duration  5.64s (transform 977ms, setup 0ms, import 5.78s, tests 253ms, environment 1ms)

 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   78.53 |    68.57 |   78.37 |   79.07 |                   
 lib               |   80.81 |    69.36 |   80.55 |   81.64 |                   
  ...nciliation.ts |     100 |      100 |     100 |     100 |                   
  excel-parser.ts  |      80 |       80 |   83.33 |   79.56 | ...96,227,239,253 
  ...-analytics.ts |   52.41 |    37.64 |   63.63 |   52.25 | 115,189,208-347   
  ...t-pipeline.ts |   91.66 |    63.04 |     100 |   91.66 | 90,95,156         
  import-review.ts |     100 |      100 |     100 |     100 |                   
  ...-analytics.ts |   94.65 |    84.04 |     100 |     100 | ...99,401,403-405 
  ...-analytics.ts |   96.55 |    74.07 |     100 |   96.29 | 26,65             
  savings-goals.ts |     100 |      100 |     100 |     100 |                   
  ...esentation.ts |   66.66 |      100 |   33.33 |   66.66 | 22,30             
  types.ts         |     100 |      100 |     100 |     100 |                   
  use-mounted.ts   |       0 |      100 |       0 |       0 | 1-11              
  utils.ts         |   91.66 |      100 |      80 |    90.9 | 5                 
 lib/client        |       0 |        0 |       0 |       0 |                   
  finance-sync.ts  |       0 |        0 |       0 |       0 | 1-37              
-------------------|---------|----------|---------|---------|-------------------
```

### Stderr
```text
$ bash scripts/run-node-tool.sh ./node_modules/vitest/vitest.mjs run --coverage
```

## Smoke Tests

- Status: PASS
- Command: `bun run test:smoke`

### Stdout
```text
Smoke test target: http://localhost:3000
PASS page /
PASS page /import
PASS page /transactions
PASS page /buckets
PASS page /reports
PASS page /investments
PASS api /api/transactions
PASS api /api/accounts
PASS api /api/savings-goals
PASS manual transaction create
PASS manual transaction account balance create
PASS manual transaction update
PASS manual transaction account balance update
PASS manual transaction list hydration
PASS manual transaction delete
PASS manual transaction account balance delete
PASS account create for reconciliation
PASS account reconcile guard without linked transactions
PASS account reconcile drift seed transaction
PASS account reconciliation detail explainability
PASS account reconciliation action
PASS savings goal create (11)
PASS savings goal update
PASS savings goal entry
PASS import preview new
PASS import commit
PASS import duplicate detection
PASS import transfer preview
PASS import transfer commit
PASS import intra-file duplicate preview
PASS import intra-file duplicate commit alignment
PASS import conflict detection
PASS import conflict review import_as_new
PASS import conflict review commit import_as_new
PASS import conflict review keep_existing
PASS import conflict review commit keep_existing
Smoke tests completed successfully.
PASS browser smoke /transactions (/Users/woraweechanlongrat/Documents/projects/meowsliver/output/playwright/transactions-browser-smoke.png)
```

### Stderr
```text
$ bun run test:smoke:api && bun run test:smoke:browser
$ bash scripts/run-node-tool.sh ./node_modules/tsx/dist/cli.mjs scripts/run-smoke-tests.ts
$ bash scripts/run-node-tool.sh ./node_modules/tsx/dist/cli.mjs scripts/run-browser-smoke-tests.ts
```

