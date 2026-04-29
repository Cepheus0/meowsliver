# task.md — Future plans

This file captures design decisions that were intentionally deferred so the
context isn't lost when we come back to them later.

## Source-of-truth split: accounts vs transactions

**Decision (2026-04-27):** The two data layers are kept fully decoupled.

| Layer | What it represents | Used for |
|---|---|---|
| `accounts.currentBalanceSatang` | A manual snapshot the user keeps in sync with reality. | Net worth, total assets, total liabilities, asset pie chart, account list, investment portfolio value. |
| `transactions` | An incomplete activity log (≈85% of imported rows have no `account_id` because เหมียวจด doesn't expose it). | Cashflow chart, calendar heatmap, spending-by-category, monthly summaries, yearly summaries. |

**Hard rule:** never compute an account balance by summing transactions.
That mixing is what made dashboard numbers flicker on every import.

The only place this used to be violated was `getInvestmentsFromAccounts()`,
which derived `gainLoss = currentBalance − Σtx`. That has been removed —
investments now show the manual balance as `totalValue` only, and gain/loss
is hard-zero with a disclaimer banner on the page.

## Future work — Option C + Reconcile UI

We picked Option A (full decouple) for now. Option C (decouple by default
plus a manual reconciliation step) is the right long-term direction once
the basics feel stable. When we return to it:

### 1. Reconcile page (new route)

`/accounts/reconcile` — lists every active account with three columns:

- `manual_balance` — what the user has in `accounts.currentBalanceSatang`
- `tx_net` — `Σ income − Σ expense` over transactions where `account_id = a.id`
- `gap` — `manual_balance − tx_net`

Per row, surface two actions:

- **"ใช้ tx_net เป็น balance ใหม่"** — overwrites `currentBalanceSatang`
  with the derived number. For users who trust their imported log.
- **"Ignore"** — silences the gap warning until the next import (persist
  a per-account `lastReconciledAt` so we can show "drifted by X since
  last check").

Bulk action at the top: "อัปเดตทุกบัญชีตาม transactions" (with a confirm
dialog showing total delta).

### 2. Cost-basis tracking for investments

Add `costBasisSatang` (bigint, nullable) to the `accounts` table. When set,
the investments page can compute real gain/loss as
`currentBalance − costBasisSatang` without relying on transactions at all.

Migration plan:

1. Add column with default `NULL`.
2. UI: in the account edit modal for `type IN ('investment', 'crypto')`,
   add a "ต้นทุนรวม / Total cost basis" field.
3. In `getInvestmentsFromAccounts`, only compute gain/loss when
   `costBasisSatang` is set; otherwise leave it at zero (current behaviour).
4. Remove the disclaimer banner on `/investments` once at least one holding
   has a cost basis recorded.

### 3. Account-mapping helper for imports

Most flicker in transaction-derived analytics comes from imports that
silently leave `account_id = NULL`. A small "map this row → account" UI
in the import preview step would gradually fill in the gaps without
requiring batch reprocessing.

This is independent of the reconcile work — they help each other (better
mapping → smaller gaps → fewer reconcile prompts) but neither blocks.
