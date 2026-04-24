import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { importRunRows, importRuns, transactions } from "@/db/schema";
import { buildDashboardInsightPacket } from "@/lib/insights/dashboard";
import {
  buildAccountHealthDetailMetricPacket,
  buildAccountHealthMetricPacket,
} from "@/lib/metrics/accounts";
import {
  buildGoalHealthDetailMetricPacket,
  buildGoalHealthMetricPacket,
} from "@/lib/metrics/goals";
import {
  buildImportQualityMetricPacket,
  type ImportRunQualitySource,
} from "@/lib/metrics/imports";
import {
  buildDailyTransactionMetricPacket,
  buildTransactionAnomalyMetricPacket,
  buildTransactionPeriodComparisonMetricPacket,
} from "@/lib/metrics/transactions";
import { getAccountDetail, listAccounts } from "@/lib/server/accounts";
import { dbTransactionToUiTransaction } from "@/lib/server/import-db";
import {
  getSavingsGoalDetail,
  getSavingsGoalsPortfolio,
} from "@/lib/server/savings-goals";

function toIso(value: Date) {
  return value.toISOString();
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function previousMonth(period: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

async function listTransactionsForMetrics() {
  const rows = await db
    .select()
    .from(transactions)
    .orderBy(
      desc(transactions.transactionDate),
      desc(transactions.transactionTime),
      desc(transactions.id)
    );

  return rows.map(dbTransactionToUiTransaction);
}

async function listAccountDetailsForMetrics() {
  const accounts = await listAccounts();
  const details = await Promise.all(
    accounts.map((account) => getAccountDetail(account.id))
  );

  return details.filter((detail) => detail !== null);
}

async function listGoalDetailsForMetrics() {
  const portfolio = await getSavingsGoalsPortfolio();
  const goalIds = [
    ...portfolio.goals.map((goal) => goal.id),
    ...portfolio.archivedGoals.map((goal) => goal.id),
  ];
  const details = await Promise.all(
    goalIds.map((goalId) => getSavingsGoalDetail(goalId))
  );

  return details.filter((detail) => detail !== null);
}

async function listRecentImportRunsForMetrics(limit: number) {
  const runRows = await db
    .select()
    .from(importRuns)
    .orderBy(desc(importRuns.createdAt), desc(importRuns.id))
    .limit(limit);

  if (runRows.length === 0) {
    return [];
  }

  const ids = runRows.map((run) => run.id);
  const stagedRows = await db
    .select()
    .from(importRunRows)
    .where(inArray(importRunRows.importRunId, ids));
  const rowsByRunId = new Map<number, typeof stagedRows>();

  for (const row of stagedRows) {
    const rows = rowsByRunId.get(row.importRunId) ?? [];
    rows.push(row);
    rowsByRunId.set(row.importRunId, rows);
  }

  return runRows.map<ImportRunQualitySource>((run) => ({
    id: run.id,
    sourceFilename: run.sourceFilename,
    mode: run.mode,
    status: run.status,
    totalRows: run.totalRows,
    newRows: run.newRows,
    duplicateRows: run.duplicateRows,
    conflictRows: run.conflictRows,
    skippedRows: run.skippedRows,
    createdAt: toIso(run.createdAt),
    completedAt: run.completedAt ? toIso(run.completedAt) : null,
    rows: (rowsByRunId.get(run.id) ?? []).map((row) => ({
      previewStatus: row.previewStatus,
      reviewAction: row.reviewAction,
    })),
  }));
}

export async function getDailyTransactionMetricPacket(date: string) {
  const transactionRows = await listTransactionsForMetrics();
  return buildDailyTransactionMetricPacket({
    date,
    transactions: transactionRows,
  });
}

export async function getTodayAnomalyMetricPacket(date = toIsoDate(new Date())) {
  const transactionRows = await listTransactionsForMetrics();
  return buildTransactionAnomalyMetricPacket({
    date,
    transactions: transactionRows,
  });
}

export async function getTransactionPeriodComparisonMetricPacket(
  from = currentMonth(),
  to = previousMonth(from)
) {
  const transactionRows = await listTransactionsForMetrics();
  return buildTransactionPeriodComparisonMetricPacket({
    from,
    to,
    transactions: transactionRows,
  });
}

export async function getAccountHealthMetricPacket() {
  const [accountDetails, transactionRows] = await Promise.all([
    listAccountDetailsForMetrics(),
    listTransactionsForMetrics(),
  ]);

  return buildAccountHealthMetricPacket({
    accountDetails,
    transactions: transactionRows,
  });
}

export async function getAccountHealthDetailMetricPacket(accountId: number) {
  const [accountDetails, transactionRows] = await Promise.all([
    listAccountDetailsForMetrics(),
    listTransactionsForMetrics(),
  ]);

  try {
    return buildAccountHealthDetailMetricPacket({
      accountId,
      accountDetails,
      transactions: transactionRows,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "account_not_found") {
      return null;
    }

    throw error;
  }
}

export async function getGoalHealthMetricPacket() {
  const goalDetails = await listGoalDetailsForMetrics();
  return buildGoalHealthMetricPacket({ goalDetails });
}

export async function getGoalHealthDetailMetricPacket(goalId: number) {
  const goalDetails = await listGoalDetailsForMetrics();

  try {
    return buildGoalHealthDetailMetricPacket({ goalId, goalDetails });
  } catch (error) {
    if (error instanceof Error && error.message === "goal_not_found") {
      return null;
    }

    throw error;
  }
}

export async function getImportQualityMetricPacket(limit = 10) {
  const runs = await listRecentImportRunsForMetrics(limit);
  return buildImportQualityMetricPacket({ runs });
}

export async function getDashboardInsightPacket(input: {
  date?: string;
  importLimit?: number;
  language?: "th" | "en";
}) {
  const [anomalyPacket, accountHealthPacket, goalHealthPacket, importQualityPacket] =
    await Promise.all([
      getTodayAnomalyMetricPacket(input.date),
      getAccountHealthMetricPacket(),
      getGoalHealthMetricPacket(),
      getImportQualityMetricPacket(input.importLimit),
    ]);

  return buildDashboardInsightPacket({
    anomalyPacket,
    accountHealthPacket,
    goalHealthPacket,
    importQualityPacket,
    language: input.language,
  });
}
