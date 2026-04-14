import { transactions } from "@/db/schema";
import {
  buildTransactionFromNormalized,
  toPreviewTransactionId,
  type ImportPreviewRow,
  type ImportPreviewSummary,
  type PreparedImportRow,
} from "@/lib/import-pipeline";
import {
  buildSkippedFingerprint,
  buildTransactionConflictKey,
  buildTransactionFingerprint,
  dbTransactionToNormalized,
} from "@/lib/server/import-db";

type DbTransaction = typeof transactions.$inferSelect;

export interface StagedImportRunRow {
  rowNumber: number;
  previewStatus: ImportPreviewRow["previewStatus"];
  duplicateTransactionId?: number;
  fingerprint: string;
  rawRow: PreparedImportRow["rawRow"];
  normalizedRow?: Record<string, unknown>;
}

export interface ImportPreviewBuildResult {
  summary: ImportPreviewSummary;
  previewRows: ImportPreviewRow[];
  stagedRows: StagedImportRunRow[];
}

export function buildImportPreviewResult(
  rows: PreparedImportRow[],
  existingTransactions: DbTransaction[]
): ImportPreviewBuildResult {
  const exactMatches = new Map(
    existingTransactions.map((transaction) => [transaction.fingerprint, transaction])
  );
  const conflictMatches = new Map(
    existingTransactions.map((transaction) => [
      buildTransactionConflictKey(dbTransactionToNormalized(transaction)),
      transaction,
    ])
  );
  const seenFingerprints = new Map<string, number>();

  const previewRows: ImportPreviewRow[] = [];
  const stagedRows: StagedImportRunRow[] = [];

  let readyRows = 0;
  let incomeRows = 0;
  let expenseRows = 0;
  let transferRows = 0;
  let newRows = 0;
  let duplicateRows = 0;
  let conflictRows = 0;
  let skippedRows = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransfer = 0;

  for (const row of rows) {
    if (!row.normalized) {
      skippedRows += 1;
      previewRows.push({
        rowNumber: row.rowNumber,
        previewStatus: "skipped",
        reason: row.skipReason ?? "ข้ามรายการนี้",
      });
      stagedRows.push({
        rowNumber: row.rowNumber,
        previewStatus: "skipped",
        fingerprint: buildSkippedFingerprint(row),
        rawRow: row.rawRow,
      });
      continue;
    }

    readyRows += 1;
    if (row.normalized.type === "income") {
      incomeRows += 1;
      totalIncome += row.normalized.amount;
    } else if (row.normalized.type === "expense") {
      expenseRows += 1;
      totalExpense += row.normalized.amount;
    } else {
      transferRows += 1;
      totalTransfer += row.normalized.amount;
    }

    const fingerprint = buildTransactionFingerprint(row.normalized);
    const exactMatch = exactMatches.get(fingerprint);
    const duplicateSourceRowNumber = seenFingerprints.get(fingerprint);
    const conflictMatch =
      exactMatch || duplicateSourceRowNumber
        ? undefined
        : conflictMatches.get(buildTransactionConflictKey(row.normalized));

    let previewStatus: ImportPreviewRow["previewStatus"] = "new";
    let reason: string | undefined;
    let duplicateTransactionId: number | undefined;

    if (exactMatch) {
      previewStatus = "duplicate";
      duplicateRows += 1;
      duplicateTransactionId = exactMatch.id;
      reason = "รายการนี้มีอยู่ในฐานข้อมูลแล้ว";
    } else if (duplicateSourceRowNumber) {
      previewStatus = "duplicate";
      duplicateRows += 1;
      reason = `รายการนี้ซ้ำกับแถวที่ ${duplicateSourceRowNumber} ในไฟล์ที่อัปโหลด`;
    } else if (conflictMatch) {
      previewStatus = "conflict";
      conflictRows += 1;
      duplicateTransactionId = conflictMatch.id;
      reason = "พบรายการที่ใกล้เคียงกับข้อมูลเดิม ควรตรวจสอบก่อน";
    } else {
      newRows += 1;
    }

    seenFingerprints.set(fingerprint, row.rowNumber);

    previewRows.push({
      rowNumber: row.rowNumber,
      previewStatus,
      duplicateTransactionId,
      reason,
      transaction: buildTransactionFromNormalized(
        row.normalized,
        toPreviewTransactionId(row.rowNumber)
      ),
    });

    stagedRows.push({
      rowNumber: row.rowNumber,
      previewStatus,
      duplicateTransactionId,
      fingerprint,
      rawRow: row.rawRow,
      normalizedRow: row.normalized as unknown as Record<string, unknown>,
    });
  }

  return {
    summary: {
      totalRows: rows.length,
      readyRows,
      incomeRows,
      expenseRows,
      transferRows,
      newRows,
      duplicateRows,
      conflictRows,
      skippedRows,
      totalIncome,
      totalExpense,
      totalTransfer,
    },
    previewRows,
    stagedRows,
  };
}
