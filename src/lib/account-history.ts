import type { Account, Transaction } from "@/lib/types";

/**
 * A monthly snapshot of an account's running balance.
 * `monthKey` is "YYYY-MM" so callers can sort or join by month string.
 */
export interface AccountBalancePoint {
  monthKey: string;
  monthIndex: number; // 0-11
  year: number;
  balance: number; // end-of-month balance in baht
}

/**
 * Returns true if a transaction touches the given account, by either:
 *   - explicit accountId link (preferred — set by reconciliation)
 *   - matching `payFrom` string against account name or aliases (fallback for
 *     legacy/imported rows that never got reconciled)
 *
 * Case-insensitive on the alias match because users sometimes save aliases
 * with inconsistent casing.
 */
function transactionTouchesAccount(tx: Transaction, account: Account): boolean {
  if (tx.accountId === account.id) return true;
  const payFrom = tx.payFrom?.trim().toLowerCase();
  if (!payFrom) return false;
  if (payFrom === account.name.trim().toLowerCase()) return true;
  return account.aliases.some(
    (alias) => alias.trim().toLowerCase() === payFrom
  );
}

/**
 * Convert a transaction into the per-account cashflow contribution.
 * Income → positive, expense → negative, transfer → 0 (transfers shift money
 * between accounts but do not change the user's net worth; we'd need
 * payFrom + payTo to model both legs accurately, which the current schema
 * doesn't fully support yet).
 */
function txContribution(tx: Transaction): number {
  if (tx.type === "income") return tx.amount;
  if (tx.type === "expense") return -tx.amount;
  return 0;
}

/**
 * Build a 24-month (or N-month) trailing balance series for one account.
 *
 * Strategy: start from the *current* balance and walk transactions
 * BACKWARDS, undoing each month's cashflow to derive the end-of-prior-month
 * balance. This avoids needing an "opening balance" snapshot — we anchor on
 * what the user sees today and reconstruct history from transactions.
 *
 * If there are no linked transactions, the series will be a flat line at
 * the current balance (which is honest: we have nothing to draw a slope
 * from).
 */
export function getAccountBalanceHistory(
  account: Account,
  transactions: Transaction[],
  monthsBack = 24,
  endDate: Date = new Date()
): AccountBalancePoint[] {
  // Group account-relevant tx contributions by "YYYY-MM"
  const monthlyDelta = new Map<string, number>();
  for (const tx of transactions) {
    if (!transactionTouchesAccount(tx, account)) continue;
    const key = tx.date.slice(0, 7); // "YYYY-MM"
    monthlyDelta.set(key, (monthlyDelta.get(key) ?? 0) + txContribution(tx));
  }

  // Build month buckets: oldest → newest
  const points: AccountBalancePoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    points.push({ monthKey, monthIndex, year, balance: 0 });
  }

  // Walk backwards from current balance, undoing each month's net cashflow
  // to derive the end-of-prior-month balance.
  let runningBalance = account.currentBalance;
  for (let i = points.length - 1; i >= 0; i--) {
    points[i].balance = runningBalance;
    const delta = monthlyDelta.get(points[i].monthKey) ?? 0;
    runningBalance -= delta;
  }

  return points;
}
