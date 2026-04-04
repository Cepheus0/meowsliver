import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { importRunRows, importRuns, transactions } from "@/db/schema";
import type {
  ImportCommitRequest,
  ImportCommitResponse,
  ImportPreviewSummary,
  NormalizedImportRow,
} from "@/lib/import-pipeline";
import {
  dbTransactionToUiTransaction,
  normalizedRowToInsert,
} from "@/lib/server/import-db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportCommitRequest;

    if (!body.importRunId) {
      return NextResponse.json(
        { error: "ต้องระบุ import run ที่ต้องการยืนยัน" },
        { status: 400 }
      );
    }

    const [importRun] = await db
      .select()
      .from(importRuns)
      .where(eq(importRuns.id, body.importRunId))
      .limit(1);

    if (!importRun) {
      return NextResponse.json(
        { error: "ไม่พบ import run ที่ระบุ" },
        { status: 404 }
      );
    }

    const stagedRows = await db
      .select()
      .from(importRunRows)
      .where(eq(importRunRows.importRunId, body.importRunId));

    const rowsToInsert = stagedRows
      .filter(
        (row) => row.previewStatus === "new" && row.normalizedRow !== null
      )
      .map((row) =>
        normalizedRowToInsert(
          row.normalizedRow as unknown as NormalizedImportRow,
          body.importRunId
        )
      );

    const insertedRows =
      rowsToInsert.length > 0
        ? await db
            .insert(transactions)
            .values(rowsToInsert)
            .onConflictDoNothing({ target: transactions.fingerprint })
            .returning({ id: transactions.id })
        : [];

    await db
      .update(importRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(importRuns.id, body.importRunId));

    const allTransactions = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.transactionDate), desc(transactions.id));

    const metadata = (importRun.metadata ?? {}) as Record<string, number>;
    const summary: ImportPreviewSummary = {
      totalRows: importRun.totalRows,
      readyRows: metadata.readyRows ?? 0,
      incomeRows: metadata.incomeRows ?? 0,
      expenseRows: metadata.expenseRows ?? 0,
      newRows: importRun.newRows,
      duplicateRows: importRun.duplicateRows,
      conflictRows: importRun.conflictRows,
      skippedRows: importRun.skippedRows,
      totalIncome: metadata.totalIncome ?? 0,
      totalExpense: metadata.totalExpense ?? 0,
    };

    const response: ImportCommitResponse = {
      importRunId: body.importRunId,
      committedRows: insertedRows.length,
      summary,
      transactions: allTransactions.map(dbTransactionToUiTransaction),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Import commit failed", error);
    return NextResponse.json(
      { error: "ไม่สามารถยืนยันการนำเข้าได้" },
      { status: 500 }
    );
  }
}
