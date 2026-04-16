# Accounts / Asset Buckets — Design Spec

**Date:** 2026-04-16  
**Status:** Approved (Q1-Q5 + recommended defaults for remaining decisions)  
**Branch:** `claude/sharp-moser`

---

## Goal

Add a CoinKeeper-inspired "Accounts" middle layer between Income and Expense.
Each Account = a wallet/bank/credit card with its own balance. Transactions
optionally reference an Account so the UI can show *which* wallet money moved
through.

Users get:
- Net worth at a glance (sum of all account balances).
- Per-account drill-down (transactions filtered by account).
- A picture of credit card debt (negative balance accounts).

---

## Approved decisions (Q1-Q5)

| # | Decision | Notes |
|---|----------|-------|
| Q1 | **Hybrid** | Account stores its own snapshot balance; `transactions.account_id` is a nullable FK. Recalc-from-tx is optional, not authoritative. |
| Q2 | **Auto-detect from `payFrom` + Default Account** | Import maps `payFrom` string → existing account by name match. Unknown / missing → "Default Account" (auto-created on first run). |
| Q3 | **Cash / Bank / Credit + Investment/Crypto (balance-only)** | Investment & Crypto accounts can be created and contribute to net worth, but no ROI/dividend fields in v1. |
| Q4 | **Sidebar position 2** (after Dashboard) | New nav: Dashboard → **Accounts** → Transactions → Import → Buckets → Investments → Reports. |
| Q5 | **Net Worth card + Account strip on Dashboard** | No trend chart in v1. Click a chip → /accounts/[id]. |

---

## Data model (Drizzle)

New file additions to `src/db/schema.ts`:

```ts
export const accountTypeEnum = pgEnum("account_type", [
  "cash", "bank_savings", "bank_fixed",
  "credit_card", "investment", "crypto", "other",
]);

export const accounts = pgTable("accounts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  icon: text("icon").notNull(),                       // lucide icon name
  color: text("color").notNull(),                     // hex
  currentBalanceSatang: bigint("current_balance_satang", { mode: "number" })
    .notNull().default(0),
  creditLimitSatang: bigint("credit_limit_satang", { mode: "number" }), // credit_card only
  isArchived: boolean("is_archived").notNull().default(false),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
  // for auto-detect: list of payFrom strings that should map here
  aliases: jsonb("aliases").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// On transactions:
accountId: bigint("account_id", { mode: "number" }).references(
  () => accounts.id, { onDelete: "set null" }
),
```

Indexes: `(is_archived, sort_order)` for the accounts list, `account_id` FK
index on transactions.

---

## Server lib

`src/lib/server/accounts.ts`:

```ts
listAccounts(): Promise<Account[]>
getAccount(id): Promise<AccountDetail | null>     // includes recent transactions
createAccount(input): Promise<Account>            // ensures only 1 isDefault=true
updateAccount(id, input): Promise<Account | null>
archiveAccount(id): Promise<void>                 // sets isArchived=true (no hard delete)
ensureDefaultAccount(): Promise<Account>          // idempotent — used by import
detectAccountForPayFrom(payFrom?: string): Promise<number | null>
recalcAccountBalance(id): Promise<number>         // sum tx amounts (signed by type)
```

Auto-detect rules (in order):
1. exact match on `account.name` (case-insensitive, trimmed)
2. exact match on any string in `account.aliases`
3. fall through → `null` (caller assigns Default Account or leaves null)

---

## API routes

```
GET    /api/accounts            → { accounts: Account[] }
POST   /api/accounts            → { account }
GET    /api/accounts/[id]       → { detail }
PATCH  /api/accounts/[id]       → { account }
DELETE /api/accounts/[id]       → { ok: true }   (soft archive)
```

---

## Store changes

`finance-store.ts` extends with:

```ts
accounts: Account[];
setAccounts: (accounts: Account[]) => void;
upsertAccount: (account: Account) => void;
removeAccount: (id: number) => void;

// Computed
getNetWorth: () => number;           // sums non-archived account balances
getAccountById: (id: number) => Account | undefined;
```

`AccountsHydrator` follows the existing `TransactionsHydrator` pattern: fetch
on mount, push into store. Mounted in `AppShell.tsx` next to
`TransactionsHydrator`.

---

## UI surfaces

### `/accounts` (list page)
- Header: "บัญชี" + total net worth
- Grid of `AccountCard` (icon, name, type chip, balance, last tx hint)
- "+ เพิ่มบัญชี" button → `AccountFormModal`
- Archived accounts collapsed into a "เก็บถาวร (n)" section at bottom

### `/accounts/[id]` (detail page)
- Account header (icon, name, balance, type)
- Edit / Archive actions
- Transactions filtered by `accountId === id` (reuse existing `TransactionList`)
- "Recalc balance from transactions" button (advisory)

### Dashboard widget
- Net Worth card (sum) and "เดือนนี้สุทธิ" card
- Horizontal scrollable strip of account chips (clickable → detail)
- Slotted *above* `SummaryCards` (since Q5: B was approved)

### Sidebar
- Insert `{ href: "/accounts", icon: Wallet, label: "บัญชี" }` after
  Dashboard. (`Wallet` is already imported for Buckets — switch Buckets to
  `PiggyBank` to free it up. Cleaner: import `Landmark` for Accounts.)

### Import wizard (auto-detect)
- After mapping step, show a banner: "ตรวจพบ X บัญชี: SCB, K-Bank, ..."
- For unmatched `payFrom` values, allow user to:
  - assign to existing account
  - create new account
  - skip (assigns Default Account)
- Commit step writes `accountId` per row.

---

## Migration / backfill

- New migration adds `accounts` table + `account_id` column on transactions
  (nullable, no default).
- On first /accounts page load with no accounts, server creates a "Default
  Account" (cash type) automatically.
- Existing transactions get no automatic backfill — they remain
  `account_id = NULL`. Users can either:
  - re-run a "match payFrom to accounts" tool from the Accounts page (future)
  - leave them unassigned (still counted in cashflow, just not per-account)

This keeps the change non-breaking for existing data.

---

## Out of scope (v2+)

- ROI / dividend / market value fields for investment accounts
- Net worth trend chart (rejected as Q5 option C)
- Account-to-account transfer wizard (transfers exist as type, but no
  source/dest account UI)
- Multi-currency
- Backfill tool to re-assign `account_id` on legacy transactions

---

## Build sequence

1. Schema + migration
2. Types
3. Server lib + API routes
4. Store extension + AccountsHydrator
5. `/accounts` page + form modal
6. `/accounts/[id]` page
7. Sidebar update
8. Dashboard Net Worth widget
9. Import flow auto-detect (light version: just write `account_id` from
   payFrom match; full UI banner deferred if scope explodes)
10. Lint + typecheck + commit
