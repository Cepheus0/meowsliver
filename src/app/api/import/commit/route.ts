import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts, importRunRows, importRuns, transactions } from "@/db/schema";
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
import {
  ensureDefaultAccount,
  recalcAccountBalance,
} from "@/lib/server/accounts";

function canonicalize(value?: string | null): string {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

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

    // Build payFrom → accountId map once for all rows. If no active account
    // matches the payFrom value, fall back to the Default Account so every
    // committed row is linked to *something* — keeps the accounts dashboard
    // coherent without forcing the user to tag each row.
    const activeAccounts = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        aliases: accounts.aliases,
      })
      .from(accounts)
      .where(eq(accounts.isArchived, false));

    const payFromToAccount = new Map<string, number>();
    for (const account of activeAccounts) {
      payFromToAccount.set(canonicalize(account.name), account.id);
      for (const alias of account.aliases) {
        payFromToAccount.set(canonicalize(alias), account.id);
      }
    }

    const newStagedRows = stagedRows.filter(
      (row) => row.previewStatus === "new" && row.normalizedRow !== null
    );

    let defaultAccountId: number | null = null;
    if (newStagedRows.length > 0) {
      defaultAccountId = (await ensureDefaultAccount()).id;
    }

    const rowsToInsert = newStagedRows.map((row) => {
      const normalized = row.normalizedRow as unknown as NormalizedImportRow;
      const matched = payFromToAccount.get(canonicalize(normalized.payFrom));
      const accountId = matched ?? defaultAccountId;

      return normalizedRowToInsert(
        normalized,
        body.importRunId,
        // Use the occurrence-aware fingerprint produced by the preview pipeline
        // so rows that are field-identical within the same file stay distinct
        // under the unique(fingerprint) constraint.
        row.fingerprint,
        accountId
      );
    });

    const insertedRows =
      rowsToInsert.length > 0
        ? await db
            .insert(transactions)
            .values(rowsToInsert)
            .onConflictDoNothing({ target: transactions.fingerprint })
            .returning({ id: transactions.id, fingerprint: transactions.fingerprint })
        : [];

    const insertedFingerprints = new Set(
      insertedRows.map((row) => row.fingerprint)
    );
    const droppedFingerprints = rowsToInsert
      .map((row) => row.fingerprint)
      .filter((fingerprint) => !insertedFingerprints.has(fingerprint));

    const uniqueDroppedFingerprints = Array.from(new Set(droppedFingerprints));

    if (uniqueDroppedFingerprints.length > 0) {
      const duplicateMatches = await db
        .select({ id: transactions.id, fingerprint: transactions.fingerprint })
        .from(transactions)
        .where(inArray(transactions.fingerprint, uniqueDroppedFingerprints));

      const duplicateByFingerprint = new Map(
        duplicateMatches.map((transaction) => [transaction.fingerprint, transaction.id])
      );

      for (const fingerprint of uniqueDroppedFingerprints) {
        await db
          .update(importRunRows)
          .set({
            previewStatus: "duplicate",
            duplicateTransactionId: duplicateByFingerprint.get(fingerprint),
          })
          .where(
            and(
              eq(importRunRows.importRunId, body.importRunId),
              eq(importRunRows.fingerprint, fingerprint),
              eq(importRunRows.previewStatus, "new")
            )
          );
      }
    }

    // Recalculate balances for every account that received a committed row.
    // Done sequentially to avoid race conditions on the same id; the number of
    // touched accounts is small (typically ≤ dozen per import).
    if (insertedRows.length > 0) {
      const insertedFingerprintsSet = new Set(
        insertedRows.map((row) => row.fingerprint)
      );
      const touchedAccountIds = new Set<number>();
      for (const row of rowsToInsert) {
        if (
          insertedFingerprintsSet.has(row.fingerprint) &&
          row.accountId != null
        ) {
          touchedAccountIds.add(row.accountId);
        }
      }
      for (const id of touchedAccountIds) {
        await recalcAccountBalance(id);
      }
    }

    const adjustedNewRows = Math.max(importRun.newRows - uniqueDroppedFingerprints.length, 0);
    const adjustedDuplicateRows =
      importRun.duplicateRows + uniqueDroppedFingerprints.length;

    await db
      .update(importRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        newRows: adjustedNewRows,
        duplicateRows: adjustedDuplicateRows,
      })
      .where(eq(importRuns.id, body.importRunId));

    const allTransactions = await db
      .select()
      .from(transactions)
      .orderBy(
        desc(transactions.transactionDate),
        desc(transactions.transactionTime),
        desc(transactions.id)
      );

    const metadata = (importRun.metadata ?? {}) as Record<string, number>;
    const summary: ImportPreviewSummary = {
      totalRows: importRun.totalRows,
      readyRows: metadata.readyRows ?? 0,
      incomeRows: metadata.incomeRows ?? 0,
      expenseRows: metadata.expenseRows ?? 0,
      transferRows: metadata.transferRows ?? 0,
      newRows: adjustedNewRows,
      duplicateRows: adjustedDuplicateRows,
      conflictRows: importRun.conflictRows,
      skippedRows: importRun.skippedRows,
      totalIncome: metadata.totalIncome ?? 0,
      totalExpense: metadata.totalExpense ?? 0,
      totalTransfer: metadata.totalTransfer ?? 0,
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
