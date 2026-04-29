import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { buildAccountReconciliation } from "@/lib/account-reconciliation";
import {
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPE_ICONS,
  type Account,
  type AccountReconciliation,
  type AccountType,
} from "@/lib/types";

type AccountRow = typeof accounts.$inferSelect;

function toSatang(amount: number) {
  return Math.round(amount * 100);
}

function fromSatang(amountSatang: number) {
  return amountSatang / 100;
}

function toIso(value: Date) {
  return value.toISOString();
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    currentBalance: fromSatang(row.currentBalanceSatang),
    creditLimit:
      row.creditLimitSatang != null ? fromSatang(row.creditLimitSatang) : undefined,
    isArchived: row.isArchived,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    notes: row.notes ?? undefined,
    aliases: row.aliases,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function canonicalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

interface AccountTransactionSummary {
  transactionCount: number;
  incomeSatang: number;
  expenseSatang: number;
  transferCount: number;
  lastTransactionDate: string | null;
}

function getTransactionDerivedBalanceSatang(summary: AccountTransactionSummary) {
  return summary.incomeSatang - summary.expenseSatang;
}

function buildReconciliationFromSummary(
  accountBalance: number,
  summary: AccountTransactionSummary
): AccountReconciliation {
  return buildAccountReconciliation({
    storedBalance: accountBalance,
    transactionDerivedBalance: fromSatang(
      getTransactionDerivedBalanceSatang(summary)
    ),
    linkedTransactionCount: summary.transactionCount,
    linkedIncome: fromSatang(summary.incomeSatang),
    linkedExpense: fromSatang(summary.expenseSatang),
    linkedTransferCount: summary.transferCount,
    lastLinkedTransactionDate: summary.lastTransactionDate,
  });
}

async function getAccountTransactionSummary(
  id: number
): Promise<AccountTransactionSummary> {
  const [row] = await db
    .select({
      transactionCount: sql<number>`count(*)::int`,
      incomeSatang:
        sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountSatang} else 0 end), 0)::bigint`,
      expenseSatang:
        sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountSatang} else 0 end), 0)::bigint`,
      transferCount:
        sql<number>`coalesce(sum(case when ${transactions.type} = 'transfer' then 1 else 0 end), 0)::int`,
      lastTransactionDate: sql<string | null>`max(${transactions.transactionDate})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, id),
        ne(transactions.source, "import")
      )
    );

  return {
    transactionCount: row?.transactionCount ?? 0,
    incomeSatang: row?.incomeSatang ?? 0,
    expenseSatang: row?.expenseSatang ?? 0,
    transferCount: row?.transferCount ?? 0,
    lastTransactionDate: row?.lastTransactionDate ?? null,
  };
}

export async function listAccounts(): Promise<Account[]> {
  const rows = await db
    .select()
    .from(accounts)
    .orderBy(asc(accounts.isArchived), asc(accounts.sortOrder), asc(accounts.id));

  return rows.map(mapAccount);
}

export async function getAccount(id: number): Promise<Account | null> {
  const [row] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, id))
    .limit(1);

  return row ? mapAccount(row) : null;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  icon?: string;
  color?: string;
  initialBalance?: number;
  creditLimit?: number;
  notes?: string;
  aliases?: string[];
  isDefault?: boolean;
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("ต้องระบุชื่อบัญชี");
  }

  const icon = input.icon?.trim() || ACCOUNT_TYPE_ICONS[input.type];
  const color = input.color?.trim() || ACCOUNT_TYPE_COLORS[input.type];
  const balance = input.initialBalance ?? 0;
  const aliases = (input.aliases ?? []).map((a) => a.trim()).filter(Boolean);

  const id = await db.transaction(async (tx) => {
    // enforce single default
    if (input.isDefault) {
      await tx
        .update(accounts)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(accounts.isDefault, true));
    }

    const [maxSort] = await tx
      .select({ value: sql<number>`coalesce(max(${accounts.sortOrder}), 0)` })
      .from(accounts);

    const [row] = await tx
      .insert(accounts)
      .values({
        name,
        type: input.type,
        icon,
        color,
        currentBalanceSatang: toSatang(balance),
        creditLimitSatang:
          input.creditLimit != null ? toSatang(input.creditLimit) : null,
        notes: input.notes?.trim() || null,
        aliases,
        isDefault: input.isDefault ?? false,
        sortOrder: (maxSort?.value ?? 0) + 1,
      })
      .returning({ id: accounts.id });

    return row.id;
  });

  const created = await getAccount(id);
  if (!created) {
    throw new Error("Failed to load newly created account");
  }
  return created;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  icon?: string;
  color?: string;
  currentBalance?: number;
  creditLimit?: number | null;
  notes?: string | null;
  aliases?: string[];
  isArchived?: boolean;
  isDefault?: boolean;
}

export async function updateAccount(
  id: number,
  input: UpdateAccountInput
): Promise<Account | null> {
  const existing = await getAccount(id);
  if (!existing) return null;

  await db.transaction(async (tx) => {
    if (input.isDefault) {
      // clear other defaults
      await tx
        .update(accounts)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(accounts.isDefault, true), sql`${accounts.id} <> ${id}`));
    }

    const patch: Partial<typeof accounts.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.type !== undefined) patch.type = input.type;
    if (input.icon !== undefined) patch.icon = input.icon.trim();
    if (input.color !== undefined) patch.color = input.color.trim();
    if (input.currentBalance !== undefined) {
      patch.currentBalanceSatang = toSatang(input.currentBalance);
    }
    if (input.creditLimit !== undefined) {
      patch.creditLimitSatang =
        input.creditLimit === null ? null : toSatang(input.creditLimit);
    }
    if (input.notes !== undefined) {
      patch.notes = input.notes === null ? null : input.notes.trim() || null;
    }
    if (input.aliases !== undefined) {
      patch.aliases = input.aliases.map((a) => a.trim()).filter(Boolean);
    }
    if (input.isArchived !== undefined) patch.isArchived = input.isArchived;
    if (input.isDefault !== undefined) patch.isDefault = input.isDefault;

    await tx.update(accounts).set(patch).where(eq(accounts.id, id));
  });

  return getAccount(id);
}

export async function archiveAccount(id: number): Promise<Account | null> {
  return updateAccount(id, { isArchived: true, isDefault: false });
}

/**
 * Find or create the Default Account. Used by manual transaction entry when the
 * user does not pick an account. Imports should not fall back here because
 * Meowjot-style source-account fields are attribution hints, not ledger truth.
 */
export async function ensureDefaultAccount(): Promise<Account> {
  const [existing] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.isDefault, true))
    .limit(1);

  if (existing) return mapAccount(existing);

  return createAccount({
    name: "บัญชีหลัก",
    type: "cash",
    isDefault: true,
  });
}

/**
 * Returns the accountId matching a payFrom string by name or alias.
 * Nothing fancy — exact case-insensitive match only. Returning null is a valid
 * import outcome so ambiguous rows remain unlinked instead of creating false
 * reconciliation confidence.
 */
export async function detectAccountForPayFrom(
  payFrom: string | null | undefined
): Promise<number | null> {
  if (!payFrom) return null;
  const key = canonicalize(payFrom);
  if (!key) return null;

  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.isArchived, false));

  for (const row of rows) {
    if (canonicalize(row.name) === key) return row.id;
    for (const alias of row.aliases) {
      if (canonicalize(alias) === key) return row.id;
    }
  }

  return null;
}

/**
 * Recomputes an account's currentBalance by summing its transactions.
 * Income adds, expense subtracts, transfer is ignored for simplicity.
 */
export async function recalcAccountBalance(id: number): Promise<number> {
  const summary = await getAccountTransactionSummary(id);
  const total = getTransactionDerivedBalanceSatang(summary);

  await db
    .update(accounts)
    .set({ currentBalanceSatang: total, updatedAt: new Date() })
    .where(eq(accounts.id, id));

  return fromSatang(total);
}

export async function applyAccountBalanceDelta(
  id: number,
  deltaAmount: number
): Promise<Account | null> {
  await db
    .update(accounts)
    .set({
      currentBalanceSatang: sql`${accounts.currentBalanceSatang} + ${toSatang(deltaAmount)}`,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id));

  return getAccount(id);
}

export interface AccountDetail {
  account: Account;
  reconciliation: AccountReconciliation;
  recentTransactions: Array<{
    id: number;
    date: string;
    time: string | null;
    amount: number;
    type: "income" | "expense" | "transfer";
    category: string;
    note: string | null;
  }>;
  transactionCount: number;
}

export async function getAccountDetail(id: number): Promise<AccountDetail | null> {
  const account = await getAccount(id);
  if (!account) return null;

  const [rows, summary] = await Promise.all([
    db
      .select({
        id: transactions.id,
        date: transactions.transactionDate,
        time: transactions.transactionTime,
        amountSatang: transactions.amountSatang,
        type: transactions.type,
        category: transactions.category,
        note: transactions.note,
      })
      .from(transactions)
      .where(eq(transactions.accountId, id))
      .orderBy(desc(transactions.transactionDate), desc(transactions.id))
      .limit(50),
    getAccountTransactionSummary(id),
  ]);

  return {
    account,
    reconciliation: buildReconciliationFromSummary(
      account.currentBalance,
      summary
    ),
    transactionCount: summary.transactionCount,
    recentTransactions: rows.map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time,
      amount: fromSatang(r.amountSatang),
      type: r.type,
      category: r.category,
      note: r.note,
    })),
  };
}

export async function reconcileAccountFromTransactions(
  id: number
): Promise<AccountDetail | null> {
  const account = await getAccount(id);
  if (!account) return null;

  const summary = await getAccountTransactionSummary(id);
  if (summary.transactionCount === 0) {
    throw new Error("บัญชีนี้ยังไม่มีรายการที่เชื่อมไว้ให้ reconcile");
  }

  await db
    .update(accounts)
    .set({
      currentBalanceSatang: getTransactionDerivedBalanceSatang(summary),
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id));

  return getAccountDetail(id);
}
