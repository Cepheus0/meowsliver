import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import type { MetricPacket } from "@/lib/metrics/types";

interface DailyExpenseRow {
  date: string;
  expense: number;
  transactionCount: number;
}

interface CategoryExpenseRow {
  category: string;
  expense: number;
  transactionCount: number;
}

interface TransactionIntelligenceMetrics {
  asOfDate: string;
  weekStartsOn: "monday";
  currentWeek: {
    startDate: string;
    endDate: string;
    elapsedDays: number;
    totalDays: number;
    expense: number;
    transactionCount: number;
    averageExpensePerElapsedDay: number;
    averageExpensePerCalendarDay: number;
  };
}

interface TransactionIntelligenceEvidence {
  currentWeekDailyExpenses: DailyExpenseRow[];
  currentWeekTopExpenseCategories: CategoryExpenseRow[];
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseIsoDate(value?: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  return new Date();
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function startOfMondayWeek(value: Date) {
  const date = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

function fromSatang(value: number) {
  return Math.round((value / 100) * 100) / 100;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function buildDailySeries(
  startDate: string,
  rows: Array<{ date: string; expenseSatang: number; transactionCount: number }>
): DailyExpenseRow[] {
  const rowsByDate = new Map(rows.map((row) => [row.date, row]));

  return Array.from({ length: 7 }, (_, index) => {
    const date = toIsoDate(addDays(new Date(`${startDate}T00:00:00.000Z`), index));
    const row = rowsByDate.get(date);

    return {
      date,
      expense: fromSatang(row?.expenseSatang ?? 0),
      transactionCount: row?.transactionCount ?? 0,
    };
  });
}

export async function getTransactionIntelligenceMetricPacket(
  asOfDate?: string
): Promise<
  MetricPacket<TransactionIntelligenceMetrics, TransactionIntelligenceEvidence>
> {
  const asOf = parseIsoDate(asOfDate);
  const weekStart = startOfMondayWeek(asOf);
  const weekEnd = addDays(weekStart, 6);
  const weekStartDate = toIsoDate(weekStart);
  const weekEndDate = toIsoDate(weekEnd);
  const normalizedAsOfDate = toIsoDate(asOf);
  const elapsedDays = Math.min(
    7,
    Math.max(1, Math.floor((asOf.getTime() - weekStart.getTime()) / 86400000) + 1)
  );

  const [dailyRows, categoryRows] = await Promise.all([
    db
      .select({
        date: transactions.transactionDate,
        expenseSatang:
          sql<number>`coalesce(sum(${transactions.amountSatang}), 0)::bigint`,
        transactionCount: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "expense"),
          gte(transactions.transactionDate, weekStartDate),
          lte(transactions.transactionDate, weekEndDate)
        )
      )
      .groupBy(transactions.transactionDate)
      .orderBy(asc(transactions.transactionDate)),
    db
      .select({
        category: transactions.category,
        expenseSatang:
          sql<number>`coalesce(sum(${transactions.amountSatang}), 0)::bigint`,
        transactionCount: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "expense"),
          gte(transactions.transactionDate, weekStartDate),
          lte(transactions.transactionDate, weekEndDate)
        )
      )
      .groupBy(transactions.category)
      .orderBy(sql`sum(${transactions.amountSatang}) desc`)
      .limit(5),
  ]);

  const totalExpenseSatang = dailyRows.reduce(
    (total, row) => total + row.expenseSatang,
    0
  );
  const transactionCount = dailyRows.reduce(
    (total, row) => total + row.transactionCount,
    0
  );

  return {
    scope: "transactions.intelligence",
    period: `${weekStartDate}/${weekEndDate}`,
    metrics: {
      asOfDate: normalizedAsOfDate,
      weekStartsOn: "monday",
      currentWeek: {
        startDate: weekStartDate,
        endDate: weekEndDate,
        elapsedDays,
        totalDays: 7,
        expense: fromSatang(totalExpenseSatang),
        transactionCount,
        averageExpensePerElapsedDay: roundMoney(
          fromSatang(totalExpenseSatang) / elapsedDays
        ),
        averageExpensePerCalendarDay: roundMoney(
          fromSatang(totalExpenseSatang) / 7
        ),
      },
    },
    evidence: {
      currentWeekDailyExpenses: buildDailySeries(weekStartDate, dailyRows),
      currentWeekTopExpenseCategories: categoryRows.map((row) => ({
        category: row.category,
        expense: fromSatang(row.expenseSatang),
        transactionCount: row.transactionCount,
      })),
    },
    generatedAt: new Date().toISOString(),
    coverage: {
      transactionCount,
      generatedFrom: ["postgresql.transactions"],
      caveats:
        transactionCount > 0
          ? []
          : ["no_expense_transactions_for_current_week"],
    },
  };
}
