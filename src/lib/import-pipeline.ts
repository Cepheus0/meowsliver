import type { ColumnMapping, RawRow } from "@/lib/excel-parser";
import { normalizeDate, normalizeTime, resolveTransactionType } from "@/lib/excel-parser";
import { getTransactionDefaultCategory } from "@/lib/transaction-presentation";
import type { Transaction, TransactionType } from "@/lib/types";

export type ImportPreviewStatus = "new" | "duplicate" | "conflict" | "skipped";

export interface NormalizedImportRow {
  date: string;
  time?: string;
  amount: number;
  type: TransactionType;
  category: string;
  subcategory?: string;
  note?: string;
  paymentChannel?: string;
  payFrom?: string;
  recipient?: string;
  tag?: string;
}

export interface PreparedImportRow {
  rowNumber: number;
  rawRow: RawRow;
  normalized?: NormalizedImportRow;
  skipReason?: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  previewStatus: ImportPreviewStatus;
  duplicateTransactionId?: number;
  reason?: string;
  transaction?: Transaction;
}

export interface ImportPreviewSummary {
  totalRows: number;
  readyRows: number;
  incomeRows: number;
  expenseRows: number;
  transferRows: number;
  newRows: number;
  duplicateRows: number;
  conflictRows: number;
  skippedRows: number;
  totalIncome: number;
  totalExpense: number;
  totalTransfer: number;
}

export interface ImportPreviewRequest {
  fileName: string;
  mode?: "append" | "replace";
  rows: PreparedImportRow[];
}

export interface ImportPreviewResponse {
  importRunId: number;
  summary: ImportPreviewSummary;
  previewRows: ImportPreviewRow[];
}

export interface ImportCommitRequest {
  importRunId: number;
}

export interface ImportCommitResponse {
  importRunId: number;
  committedRows: number;
  summary: ImportPreviewSummary;
  transactions: Transaction[];
}

function sanitizeValue(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "-" || trimmed === "—" || trimmed === "–") {
    return undefined;
  }

  return trimmed;
}

function parseAmount(rawAmount: string): number | null {
  const normalizedAmount = rawAmount.replace(/[,\s]/g, "");
  if (!normalizedAmount) {
    return null;
  }

  const amount = Number.parseFloat(normalizedAmount);
  if (!Number.isFinite(amount) || amount === 0) {
    return null;
  }

  return amount;
}

export function toPreviewTransactionId(rowNumber: number): string {
  return `preview-${rowNumber}`;
}

export function buildTransactionFromNormalized(
  normalized: NormalizedImportRow,
  id: string
): Transaction {
  const note = [normalized.note, normalized.recipient]
    .filter(Boolean)
    .join(" | ");
  const subcategory = [normalized.paymentChannel, normalized.payFrom]
    .filter(Boolean)
    .join(" — ");

  return {
    id,
    date: normalized.date,
    time: normalized.time,
    amount: normalized.amount,
    category: normalized.category,
    subcategory: subcategory || undefined,
    type: normalized.type,
    note: note || undefined,
  };
}

export function prepareImportRows(
  rows: RawRow[],
  mapping: ColumnMapping
): PreparedImportRow[] {
  return rows.map((row, index) => {
    const rowNumber = index + 1;
    const rawDate = mapping.date ? row[mapping.date] : "";
    const date = normalizeDate(rawDate);
    const rawTime = mapping.time ? row[mapping.time] : "";
    const time = normalizeTime(rawTime);

    if (!date) {
      return {
        rowNumber,
        rawRow: row,
        skipReason: "ไม่พบวันที่ที่ใช้งานได้",
      };
    }

    const rawAmount = mapping.amount ? row[mapping.amount] : "";
    const amount = parseAmount(rawAmount);

    if (amount === null) {
      return {
        rowNumber,
        rawRow: row,
        skipReason: "จำนวนเงินไม่ถูกต้องหรือเป็นศูนย์",
      };
    }

    const rawType = mapping.type ? row[mapping.type] : "";
    const type = resolveTransactionType(rawType, amount);
    const category = sanitizeValue(mapping.category ? row[mapping.category] : "");
    const note = sanitizeValue(mapping.note ? row[mapping.note] : "");
    const paymentChannel = sanitizeValue(
      mapping.paymentChannel ? row[mapping.paymentChannel] : ""
    );
    const payFrom = sanitizeValue(mapping.payFrom ? row[mapping.payFrom] : "");
    const recipient = sanitizeValue(mapping.recipient ? row[mapping.recipient] : "");
    const tag = sanitizeValue(mapping.tag ? row[mapping.tag] : "");

    return {
      rowNumber,
      rawRow: row,
      normalized: {
        date,
        time: time || undefined,
        amount: Math.abs(amount),
        type,
        category: category || getTransactionDefaultCategory(type),
        subcategory: [paymentChannel, payFrom].filter(Boolean).join(" — ") || undefined,
        note,
        paymentChannel,
        payFrom,
        recipient,
        tag,
      },
    };
  });
}
