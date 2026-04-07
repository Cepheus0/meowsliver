# Testing Guide

## Purpose

This repository now uses a layered testing strategy:

- fast unit tests for deterministic business logic
- smoke tests against the running local app for key feature flows
- a generated Markdown report for engineering review and sharing

## Commands

```bash
bun run test:unit
bun run test:smoke
bun run test
bun run test:report
```

## Current Automated Coverage

| Feature Area | Test Type | Notes |
| --- | --- | --- |
| Spreadsheet parsing | Unit | Covers format detection, date normalization, and transaction type resolution |
| Import normalization | Unit | Covers row preparation, skip logic, and UI transaction shaping |
| Import fingerprinting | Unit | Covers stable fingerprint, conflict key, and deterministic import hash behavior |
| Dashboard analytics | Unit | Covers yearly filtering, monthly cashflow, yearly summaries, and expense breakdown |
| Savings goal analytics | Unit | Covers progress, growth %, monthly pace, trajectory chart data, and portfolio overview |
| Local route availability | Smoke | Verifies primary pages return `200` |
| Savings goals API | Smoke | Verifies create, update, and entry flows against the running app |
| Import preview / commit API | Smoke | Verifies `new`, `duplicate`, and `conflict` classification plus commit behavior |

## Coverage Gaps That Still Need Manual QA

1. Dark mode visual polish across breakpoints
2. Long-table readability on real imported datasets
3. Import mapping UX with diverse real-world column names
4. Rich savings-goal editing, especially longer notes and edge-case target dates
5. Empty-state copy and CTA review from a product perspective

## Generated Report

`bun run test:report` writes a sharable Markdown report to:

[`reports/test-report.md`](/Users/woraweechanlongrat/Documents/projects/meowsliver-clean/reports/test-report.md)

The report captures:

- execution timestamp
- pass/fail status per verification step
- command run for each step
- stdout/stderr excerpts for debugging and auditability

## Recommended Pre-Push Verification

```bash
bun run typecheck
bun run lint
bun run build
bun run test
```
