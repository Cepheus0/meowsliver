# Test Report

- Generated at: 8 Apr 2026, 01:22:34
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
  Generating static pages using 7 workers (0/10) ...
  Generating static pages using 7 workers (2/10) 
  Generating static pages using 7 workers (4/10) 
  Generating static pages using 7 workers (7/10) 
✓ Generating static pages using 7 workers (10/10) in 316.4ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/import/commit
├ ƒ /api/import/preview
├ ƒ /api/savings-goals
├ ƒ /api/savings-goals/[goalId]
├ ƒ /api/savings-goals/[goalId]/entries
├ ƒ /api/transactions
├ ○ /buckets
├ ƒ /buckets/[goalId]
├ ○ /goals
├ ○ /import
├ ○ /investments
├ ○ /reports
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
RUN  v4.1.3 /Users/woraweechanlongrat/Documents/projects/meowsliver-clean
      Coverage enabled with v8


 Test Files  7 passed (7)
      Tests  24 passed (24)
   Start at  01:22:55
   Duration  1.77s (transform 161ms, setup 0ms, import 948ms, tests 79ms, environment 0ms)

 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |    88.7 |    72.85 |   94.44 |   89.03 |                   
 excel-parser.ts   |   77.77 |    78.12 |   77.77 |   77.27 | 70-99,187         
 ...e-analytics.ts |   94.23 |    82.75 |     100 |   97.72 | 88                
 ...rt-pipeline.ts |   90.62 |     52.5 |     100 |   90.62 | 79,84,137         
 ...l-analytics.ts |   96.55 |    74.07 |     100 |   96.29 | 26,65             
 savings-goals.ts  |     100 |      100 |     100 |     100 |                   
 types.ts          |       0 |      100 |     100 |       0 | 188-221           
 utils.ts          |   91.66 |      100 |      80 |    90.9 | 5                 
-------------------|---------|----------|---------|---------|-------------------
```

### Stderr
```text
$ vitest run --coverage
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
PASS api /api/savings-goals
PASS savings goal create (5)
PASS savings goal update
PASS savings goal entry
PASS import preview new
PASS import commit
PASS import duplicate detection
PASS import conflict detection
Smoke tests completed successfully.
```

### Stderr
```text
$ tsx scripts/run-smoke-tests.ts
```

