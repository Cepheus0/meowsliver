import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { importRunRows, importRuns, transactions } from "@/db/schema";
import {
  buildTransactionFromNormalized,
  toPreviewTransactionId,
  type ImportPreviewRequest,
  type ImportPreviewResponse,
  type ImportPreviewRow,
  type ImportPreviewSummary,
} from "@/lib/import-pipeline";
import {
  buildImportSourceHash,
  buildSkippedFingerprint,
  buildTransactionConflictKey,
  buildTransactionFingerprint,
  dbTransactionToNormalized,
} from "@/lib/server/import-db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportPreviewRequest;

    if (!body.fileName || !Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json(
        { error: "คำขอไม่ถูกต้องสำหรับการ preview import" },
        { status: 400 }
      );
    }

    const candidateDates = Array.from(
      new Set(
        body.rows
          .filter((row) => row.normalized)
          .map((row) => row.normalized!.date)
      )
    );

    const existingTransactions =
      candidateDates.length > 0
        ? await db
            .select()
            .from(transactions)
            .where(inArray(transactions.transactionDate, candidateDates))
        : [];

    const exactMatches = new Map(
      existingTransactions.map((transaction) => [transaction.fingerprint, transaction])
    );
    const conflictMatches = new Map(
      existingTransactions.map((transaction) => [
        buildTransactionConflictKey(dbTransactionToNormalized(transaction)),
        transaction,
      ])
    );

    const previewRows: ImportPreviewRow[] = [];
    let readyRows = 0;
    let incomeRows = 0;
    let expenseRows = 0;
    let newRows = 0;
    let duplicateRows = 0;
    let conflictRows = 0;
    let skippedRows = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    const stagedRows = body.rows.map((row) => {
      if (!row.normalized) {
        skippedRows += 1;
        previewRows.push({
          rowNumber: row.rowNumber,
          previewStatus: "skipped",
          reason: row.skipReason ?? "ข้ามรายการนี้",
        });

        return {
          rowNumber: row.rowNumber,
          previewStatus: "skipped" as const,
          duplicateTransactionId: undefined,
          fingerprint: buildSkippedFingerprint(row),
          rawRow: row.rawRow,
          normalizedRow: undefined as Record<string, unknown> | undefined,
        };
      }

      readyRows += 1;
      if (row.normalized.type === "income") {
        incomeRows += 1;
        totalIncome += row.normalized.amount;
      } else if (row.normalized.type === "expense") {
        expenseRows += 1;
        totalExpense += row.normalized.amount;
      }

      const fingerprint = buildTransactionFingerprint(row.normalized);
      const exactMatch = exactMatches.get(fingerprint);
      const conflictMatch = exactMatch
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
      } else if (conflictMatch) {
        previewStatus = "conflict";
        conflictRows += 1;
        duplicateTransactionId = conflictMatch.id;
        reason = "พบรายการที่ใกล้เคียงกับข้อมูลเดิม ควรตรวจสอบก่อน";
      } else {
        newRows += 1;
      }

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

      return {
        rowNumber: row.rowNumber,
        previewStatus,
        duplicateTransactionId,
        fingerprint,
        rawRow: row.rawRow,
        normalizedRow: row.normalized as unknown as Record<string, unknown>,
      };
    });

    const summary: ImportPreviewSummary = {
      totalRows: body.rows.length,
      readyRows,
      incomeRows,
      expenseRows,
      newRows,
      duplicateRows,
      conflictRows,
      skippedRows,
      totalIncome,
      totalExpense,
    };

    const [importRun] = await db
      .insert(importRuns)
      .values({
        sourceFilename: body.fileName,
        sourceHash: buildImportSourceHash(body.fileName, body.rows),
        mode: body.mode ?? "append",
        status: "previewed",
        totalRows: summary.totalRows,
        newRows: summary.newRows,
        duplicateRows: summary.duplicateRows,
        conflictRows: summary.conflictRows,
        skippedRows: summary.skippedRows,
        metadata: {
          readyRows: summary.readyRows,
          incomeRows: summary.incomeRows,
          expenseRows: summary.expenseRows,
          totalIncome: summary.totalIncome,
          totalExpense: summary.totalExpense,
        },
      })
      .returning({ id: importRuns.id });

    await db.insert(importRunRows).values(
      stagedRows.map((row) => ({
        importRunId: importRun.id,
        rowNumber: row.rowNumber,
        previewStatus: row.previewStatus,
        duplicateTransactionId: row.duplicateTransactionId,
        fingerprint: row.fingerprint,
        rawRow: row.rawRow,
        normalizedRow: row.normalizedRow,
      }))
    );

    const response: ImportPreviewResponse = {
      importRunId: importRun.id,
      summary,
      previewRows,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Import preview failed", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง preview import ได้" },
      { status: 500 }
    );
  }
}
