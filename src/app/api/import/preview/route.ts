import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { importRunRows, importRuns, transactions } from "@/db/schema";
import {
  type ImportPreviewRequest,
  type ImportPreviewResponse,
} from "@/lib/import-pipeline";
import {
  buildImportSourceHash,
} from "@/lib/server/import-db";
import { buildImportPreviewResult } from "@/lib/server/import-preview";

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

    const { summary, previewRows, stagedRows } = buildImportPreviewResult(
      body.rows,
      existingTransactions
    );

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
