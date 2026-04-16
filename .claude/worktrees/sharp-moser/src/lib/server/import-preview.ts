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
  // -----------------------------------------------------------------------------------
  // Occurrence-aware fingerprint
  //
  // CSV อาจมี 2 แถวที่ทุก field เหมือนกันเป๊ะ (เช่น สั่ง Grab 75฿ 2 ออเดอร์ติดกัน)
  // ถ้า fingerprint อิงจาก field เท่านั้น แถวที่ 2 จะถูก mark ว่า duplicate แล้วหายไป
  // แก้โดยต่อท้าย fingerprint ด้วยลำดับการเจอ (#1, #2, ...) ทั้งฝั่ง DB และ CSV
  // → ทำให้ "แถวซ้ำเชิงความหมาย" เก็บได้ครบ และ cross-file dedup ยังทำงานถูก
  // -----------------------------------------------------------------------------------
  const withOccurrence = (baseFp: string, counters: Map<string, number>): string => {
    const next = (counters.get(baseFp) ?? 0) + 1;
    counters.set(baseFp, next);
    return `${baseFp}#${next}`;
  };

  // เรียง DB rows ให้ลำดับ #1, #2 คงที่ไม่ว่า DB จะคืน rows มาลำดับไหน
  // tie-break ด้วย id (auto-increment) = ลำดับการ insert จริง
  const sortedExisting = [...existingTransactions].sort((a, b) => {
    if (a.transactionDate !== b.transactionDate) {
      return a.transactionDate.localeCompare(b.transactionDate);
    }
    const timeA = a.transactionTime ?? "";
    const timeB = b.transactionTime ?? "";
    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }
    return a.id - b.id;
  });

  const dbCounters = new Map<string, number>();
  const exactMatches = new Map<string, DbTransaction>(
    sortedExisting.map((transaction) => {
      const base = buildTransactionFingerprint(dbTransactionToNormalized(transaction));
      const fp = withOccurrence(base, dbCounters);
      return [fp, transaction] as const;
    })
  );

  const conflictMatches = new Map(
    existingTransactions.map((transaction) => [
      buildTransactionConflictKey(dbTransactionToNormalized(transaction)),
      transaction,
    ])
  );

  const csvCounters = new Map<string, number>();
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

    const baseFingerprint = buildTransactionFingerprint(row.normalized);
    const fingerprint = withOccurrence(baseFingerprint, csvCounters);
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
