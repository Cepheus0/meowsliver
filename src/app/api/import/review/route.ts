import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { importRunRows, importRuns } from "@/db/schema";
import type {
  ImportPreviewSummary,
  ImportReviewAction,
} from "@/lib/import-pipeline";
import { getPreviewStatusForReviewAction } from "@/lib/import-review";

export const dynamic = "force-dynamic";

function isImportReviewAction(value: unknown): value is ImportReviewAction {
  return (
    value === "import_as_new" || value === "keep_existing" || value === "skip"
  );
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const importRunId = Number(body.importRunId);
    const rowNumber = Number(body.rowNumber);
    const action = body.action;

    if (!Number.isInteger(importRunId) || importRunId <= 0) {
      return NextResponse.json(
        { error: "รหัส import run ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rowNumber) || rowNumber <= 0) {
      return NextResponse.json(
        { error: "เลขแถวที่ต้องการตรวจสอบไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (!isImportReviewAction(action)) {
      return NextResponse.json(
        { error: "การตัดสินใจสำหรับรายการ conflict ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const [importRun] = await db
      .select()
      .from(importRuns)
      .where(eq(importRuns.id, importRunId))
      .limit(1);

    if (!importRun) {
      return NextResponse.json(
        { error: "ไม่พบ import run ที่ระบุ" },
        { status: 404 }
      );
    }

    const [row] = await db
      .select()
      .from(importRunRows)
      .where(
        and(
          eq(importRunRows.importRunId, importRunId),
          eq(importRunRows.rowNumber, rowNumber)
        )
      )
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: "ไม่พบแถวที่ต้องการอัปเดต" },
        { status: 404 }
      );
    }

    if (row.previewStatus !== "conflict" && row.reviewAction == null) {
      return NextResponse.json(
        { error: "รายการนี้ไม่ได้อยู่ในสถานะที่ต้องตรวจสอบ" },
        { status: 400 }
      );
    }

    const previewStatus = getPreviewStatusForReviewAction(action);

    await db
      .update(importRunRows)
      .set({
        previewStatus,
        reviewAction: action,
      })
      .where(eq(importRunRows.id, row.id));

    const rows = await db
      .select({
        previewStatus: importRunRows.previewStatus,
      })
      .from(importRunRows)
      .where(eq(importRunRows.importRunId, importRunId));

    const summaryCounts = rows.reduce(
      (accumulator, currentRow) => {
        if (currentRow.previewStatus === "new") accumulator.newRows += 1;
        if (currentRow.previewStatus === "duplicate") accumulator.duplicateRows += 1;
        if (currentRow.previewStatus === "conflict") accumulator.conflictRows += 1;
        if (currentRow.previewStatus === "skipped") accumulator.skippedRows += 1;
        return accumulator;
      },
      {
        newRows: 0,
        duplicateRows: 0,
        conflictRows: 0,
        skippedRows: 0,
      }
    );

    await db
      .update(importRuns)
      .set(summaryCounts)
      .where(eq(importRuns.id, importRunId));

    const metadata = (importRun.metadata ?? {}) as Record<string, number>;
    const summary: ImportPreviewSummary = {
      totalRows: importRun.totalRows,
      readyRows: metadata.readyRows ?? 0,
      incomeRows: metadata.incomeRows ?? 0,
      expenseRows: metadata.expenseRows ?? 0,
      transferRows: metadata.transferRows ?? 0,
      totalIncome: metadata.totalIncome ?? 0,
      totalExpense: metadata.totalExpense ?? 0,
      totalTransfer: metadata.totalTransfer ?? 0,
      ...summaryCounts,
    };

    return NextResponse.json({
      rowNumber,
      previewStatus,
      reviewAction: action,
      summary,
    });
  } catch (error) {
    console.error("Failed to review import conflict row", error);
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกการตัดสินใจสำหรับรายการนี้ได้" },
      { status: 500 }
    );
  }
}
