import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { getTransactionDefaultCategory } from "@/lib/transaction-presentation";
import type { TransactionType } from "@/lib/types";
import { dbTransactionToUiTransaction } from "@/lib/server/import-db";
import {
  applyAccountBalanceDelta,
  ensureDefaultAccount,
  getAccount,
} from "@/lib/server/accounts";

type DbTransaction = typeof transactions.$inferSelect;

export interface TransactionMutationInput {
  date: string;
  time?: string;
  amount: number;
  type: TransactionType;
  category?: string;
  note?: string;
  paymentChannel?: string;
  payFrom?: string;
  recipient?: string;
  tag?: string;
  accountId?: number | null;
}

export interface ValidatedTransactionMutation {
  date: string;
  time?: string;
  amount: number;
  type: TransactionType;
  category: string;
  note?: string;
  paymentChannel?: string;
  payFrom?: string;
  recipient?: string;
  tag?: string;
  accountId?: number | null;
}

function sanitizeText(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidLocalTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function toSatang(amount: number) {
  return Math.round(amount * 100);
}

function getSignedAmount(type: TransactionType, amount: number) {
  if (type === "income") return amount;
  if (type === "expense") return -amount;
  return 0;
}

function buildManualFingerprint() {
  return `manual:${randomUUID()}`;
}

export function parseUiTransactionId(value: string): number | null {
  const match = value.match(/(\d+)$/);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function validateTransactionMutationInput(
  input: TransactionMutationInput
): ValidatedTransactionMutation {
  const date = sanitizeText(input.date);
  if (!date || !isValidIsoDate(date)) {
    throw new Error("กรุณาระบุวันที่ให้ถูกต้อง");
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("กรุณาระบุจำนวนเงินที่มากกว่า 0");
  }

  if (!["income", "expense", "transfer"].includes(input.type)) {
    throw new Error("ประเภทรายการไม่ถูกต้อง");
  }

  const time = sanitizeText(input.time);
  if (time && !isValidLocalTime(time)) {
    throw new Error("กรุณาระบุเวลาเป็นรูปแบบ HH:MM");
  }

  const category =
    sanitizeText(input.category) ?? getTransactionDefaultCategory(input.type);

  return {
    date,
    time,
    amount,
    type: input.type,
    category,
    note: sanitizeText(input.note),
    paymentChannel: sanitizeText(input.paymentChannel),
    payFrom: sanitizeText(input.payFrom),
    recipient: sanitizeText(input.recipient),
    tag: sanitizeText(input.tag),
    accountId: input.accountId,
  };
}

async function resolveManualTransactionAccount(accountId?: number | null) {
  if (accountId == null) {
    return ensureDefaultAccount();
  }

  const account = await getAccount(accountId);
  if (!account || account.isArchived) {
    throw new Error("ไม่พบบัญชีที่ต้องการใช้งาน");
  }

  return account;
}

async function getManualTransactionByDbId(id: number): Promise<DbTransaction | null> {
  const [row] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  if (row.source !== "manual") {
    throw new Error("สามารถแก้ไขหรือลบได้เฉพาะรายการที่บันทึกด้วยตนเอง");
  }

  return row;
}

export async function createManualTransaction(input: TransactionMutationInput) {
  const validated = validateTransactionMutationInput(input);
  const account = await resolveManualTransactionAccount(validated.accountId ?? null);

  const [created] = await db
    .insert(transactions)
    .values({
      transactionDate: validated.date,
      transactionTime: validated.time ?? null,
      amountSatang: toSatang(validated.amount),
      type: validated.type,
      category: validated.category,
      subcategory: null,
      note: validated.note ?? null,
      paymentChannel: validated.paymentChannel ?? null,
      payFrom: validated.payFrom ?? account.name,
      recipient: validated.recipient ?? null,
      tag: validated.tag ?? null,
      fingerprint: buildManualFingerprint(),
      source: "manual",
      importRunId: null,
      accountId: account.id,
    })
    .returning();

  const signedAmount = getSignedAmount(validated.type, validated.amount);
  if (signedAmount !== 0) {
    await applyAccountBalanceDelta(account.id, signedAmount);
  }
  return dbTransactionToUiTransaction(created);
}

export async function updateManualTransaction(
  transactionId: string,
  input: TransactionMutationInput
) {
  const dbId = parseUiTransactionId(transactionId);
  if (!dbId) {
    return null;
  }

  const existing = await getManualTransactionByDbId(dbId);
  if (!existing) {
    return null;
  }

  const validated = validateTransactionMutationInput(input);
  const nextAccount = await resolveManualTransactionAccount(
    validated.accountId ?? existing.accountId ?? null
  );

  const [updated] = await db
    .update(transactions)
    .set({
      transactionDate: validated.date,
      transactionTime: validated.time ?? null,
      amountSatang: toSatang(validated.amount),
      type: validated.type,
      category: validated.category,
      subcategory: null,
      note: validated.note ?? null,
      paymentChannel: validated.paymentChannel ?? null,
      payFrom: validated.payFrom ?? nextAccount.name,
      recipient: validated.recipient ?? null,
      tag: validated.tag ?? null,
      accountId: nextAccount.id,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, dbId))
    .returning();

  const previousSignedAmount = getSignedAmount(
    existing.type,
    existing.amountSatang / 100
  );
  const nextSignedAmount = getSignedAmount(validated.type, validated.amount);

  if (existing.accountId != null && previousSignedAmount !== 0) {
    await applyAccountBalanceDelta(existing.accountId, -previousSignedAmount);
  }
  if (updated.accountId != null && nextSignedAmount !== 0) {
    await applyAccountBalanceDelta(updated.accountId, nextSignedAmount);
  }

  return dbTransactionToUiTransaction(updated);
}

export async function deleteManualTransaction(transactionId: string) {
  const dbId = parseUiTransactionId(transactionId);
  if (!dbId) {
    return null;
  }

  const existing = await getManualTransactionByDbId(dbId);
  if (!existing) {
    return null;
  }

  await db.delete(transactions).where(eq(transactions.id, dbId));

  const signedAmount = getSignedAmount(existing.type, existing.amountSatang / 100);
  if (existing.accountId != null && signedAmount !== 0) {
    await applyAccountBalanceDelta(existing.accountId, -signedAmount);
  }

  return dbTransactionToUiTransaction(existing);
}
