import { createHash } from "node:crypto";
import { transactions } from "@/db/schema";
import {
  buildTransactionFromNormalized,
  type NormalizedImportRow,
  type PreparedImportRow,
} from "@/lib/import-pipeline";

type DbTransaction = typeof transactions.$inferSelect;

function canonicalize(value?: string | null): string {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function hashSeed(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

function toSatang(amount: number): number {
  return Math.round(amount * 100);
}

function fromSatang(amountSatang: number): number {
  return amountSatang / 100;
}

function buildExactFingerprintSeed(row: NormalizedImportRow): string {
  return [
    row.date,
    canonicalize(row.time),
    toSatang(row.amount),
    row.type,
    canonicalize(row.category),
    canonicalize(row.subcategory),
    canonicalize(row.note),
    canonicalize(row.paymentChannel),
    canonicalize(row.payFrom),
    canonicalize(row.recipient),
    canonicalize(row.tag),
  ].join("|");
}

function buildConflictFingerprintSeed(row: NormalizedImportRow): string {
  const identity =
    canonicalize(row.recipient) ||
    canonicalize(row.note) ||
    canonicalize(row.category);

  return [row.date, toSatang(row.amount), row.type, identity].join("|");
}

export function buildTransactionFingerprint(row: NormalizedImportRow): string {
  return hashSeed(buildExactFingerprintSeed(row));
}

export function buildTransactionConflictKey(row: NormalizedImportRow): string {
  return hashSeed(buildConflictFingerprintSeed(row));
}

export function buildImportSourceHash(
  fileName: string,
  rows: PreparedImportRow[]
): string {
  return hashSeed(
    JSON.stringify({
      fileName,
      rows: rows.map((row) => ({
        rowNumber: row.rowNumber,
        rawRow: row.rawRow,
        normalized: row.normalized,
        skipReason: row.skipReason,
      })),
    })
  );
}

export function buildSkippedFingerprint(row: PreparedImportRow): string {
  return hashSeed(
    JSON.stringify({
      rowNumber: row.rowNumber,
      rawRow: row.rawRow,
      skipReason: row.skipReason ?? "skipped",
    })
  );
}

export function dbTransactionToNormalized(row: DbTransaction): NormalizedImportRow {
  return {
    date: row.transactionDate,
    time: row.transactionTime ?? undefined,
    amount: fromSatang(row.amountSatang),
    type: row.type,
    category: row.category,
    subcategory: row.subcategory ?? undefined,
    note: row.note ?? undefined,
    paymentChannel: row.paymentChannel ?? undefined,
    payFrom: row.payFrom ?? undefined,
    recipient: row.recipient ?? undefined,
    tag: row.tag ?? undefined,
  };
}

export function dbTransactionToUiTransaction(row: DbTransaction) {
  return buildTransactionFromNormalized(
    dbTransactionToNormalized(row),
    `txn-${row.id}`
  );
}

export function normalizedRowToInsert(
  row: NormalizedImportRow,
  importRunId: number
): typeof transactions.$inferInsert {
  return {
    transactionDate: row.date,
    transactionTime: row.time,
    amountSatang: toSatang(row.amount),
    type: row.type,
    category: row.category,
    subcategory: row.subcategory,
    note: row.note,
    paymentChannel: row.paymentChannel,
    payFrom: row.payFrom,
    recipient: row.recipient,
    tag: row.tag,
    fingerprint: buildTransactionFingerprint(row),
    source: "import",
    importRunId,
  };
}
