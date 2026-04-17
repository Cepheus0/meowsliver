import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import {
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPE_ICONS,
  type Account,
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
 * Find or create the Default Account. Used by the import pipeline when a
 * transaction can't be auto-matched to a specific account.
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
 * Nothing fancy — exact case-insensitive match only. Caller decides
 * whether to fall back to the Default Account on null.
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
  const rows = await db
    .select({
      type: transactions.type,
      amountSatang: transactions.amountSatang,
    })
    .from(transactions)
    .where(eq(transactions.accountId, id));

  let total = 0;
  for (const row of rows) {
    if (row.type === "income") total += row.amountSatang;
    else if (row.type === "expense") total -= row.amountSatang;
  }

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

  const rows = await db
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
    .limit(50);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(eq(transactions.accountId, id));

  return {
    account,
    transactionCount: countRow?.count ?? 0,
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
