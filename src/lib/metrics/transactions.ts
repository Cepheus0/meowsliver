import type { MetricPacket } from "@/lib/metrics/types";
import type { Transaction, TransactionType } from "@/lib/types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface BuildDailyTransactionMetricPacketInput {
  date: string;
  transactions: Transaction[];
  generatedAt?: string;
}

interface BuildTransactionAnomalyMetricPacketInput
  extends BuildDailyTransactionMetricPacketInput {}

interface BuildPeriodComparisonMetricPacketInput {
  from: string;
  to: string;
  transactions: Transaction[];
  generatedAt?: string;
}

interface TransactionGroupTotal {
  name: string;
  amount: number;
  sharePercent: number;
}

interface DailyTransactionEvidenceRow {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  recipient?: string;
  note?: string;
}

export interface DailyTransactionMetrics {
  date: string;
  transactionCount: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
  transferTransactionCount: number;
  incomeTotal: number;
  expenseTotal: number;
  transferTotal: number;
  netCashflow: number;
  rolling7dExpense: number;
  rolling30dExpense: number;
  rolling7dAverageExpense: number;
  rolling30dAverageExpense: number;
  dailyExpenseRankInHistory: number | null;
  dailyExpenseZScore: number | null;
  expenseVsRolling30dPercent: number | null;
}

export interface DailyTransactionEvidence {
  topExpenseCategories: TransactionGroupTotal[];
  topRecipients: TransactionGroupTotal[];
  largestTransactions: DailyTransactionEvidenceRow[];
}

export interface TransactionAnomalyMetrics {
  date: string;
  expenseTotal: number;
  rolling30dAverageExpense: number;
  expenseVsRolling30dPercent: number | null;
  dailyExpenseRankInHistory: number | null;
  dailyExpenseZScore: number | null;
  transactionCount: number;
  rolling30dAverageTransactionCount: number;
  transactionFrequencyVs30dPercent: number | null;
  anomalyLevel: "normal" | "watch" | "warning" | "critical";
  anomalyReasons: string[];
}

export interface TransactionAnomalyEvidence {
  topExpenseCategories: TransactionGroupTotal[];
  topRecipients: TransactionGroupTotal[];
  largestTransactions: DailyTransactionEvidenceRow[];
}

export interface PeriodCashflowMetrics {
  period: string;
  transactionCount: number;
  incomeTotal: number;
  expenseTotal: number;
  transferTotal: number;
  netCashflow: number;
  savingsRatePercent: number | null;
  dailyAverageExpense: number;
  monthlyBurnRate: number;
}

export interface PeriodComparisonMetrics {
  from: PeriodCashflowMetrics;
  to: PeriodCashflowMetrics;
  delta: {
    incomeChangePct: number | null;
    expenseChangePct: number | null;
    netCashflowChangePct: number | null;
    transactionCountChangePct: number | null;
  };
}

export interface CategoryShareDelta {
  name: string;
  fromAmount: number;
  toAmount: number;
  deltaAmount: number;
  fromSharePercent: number;
  toSharePercent: number;
  shareDeltaPct: number;
}

export interface PeriodComparisonEvidence {
  categoryShareDelta: CategoryShareDelta[];
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundMetric(value: number) {
  return Math.round(value * 10) / 10;
}

function parseIsoDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function parseMonth(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  return { year, monthIndex };
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDaysInMonth(period: string) {
  const parsed = parseMonth(period);
  if (!parsed) {
    return 0;
  }

  return new Date(Date.UTC(parsed.year, parsed.monthIndex + 1, 0)).getUTCDate();
}

function isInMonth(date: string, period: string) {
  return date.startsWith(`${period}-`);
}

function getDateRange(start: Date, end: Date) {
  const dates: string[] = [];
  for (
    let cursor = new Date(start);
    cursor.getTime() <= end.getTime();
    cursor = addDays(cursor, 1)
  ) {
    dates.push(toIsoDate(cursor));
  }
  return dates;
}

function sumByType(transactions: Transaction[], type: TransactionType) {
  return roundCurrency(
    transactions
      .filter((transaction) => transaction.type === type)
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  );
}

function getExpenseByDate(transactions: Transaction[]) {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    totals.set(
      transaction.date,
      (totals.get(transaction.date) ?? 0) + transaction.amount
    );
  }

  return totals;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return roundMetric(((current - previous) / Math.abs(previous)) * 100);
}

function amountShare(amount: number, total: number) {
  return total > 0 ? roundMetric((amount / total) * 100) : 0;
}

function buildGroupTotals(
  transactions: Transaction[],
  getKey: (transaction: Transaction) => string | undefined,
  total: number,
  limit = 5
): TransactionGroupTotal[] {
  const grouped = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const key = getKey(transaction)?.trim() || "ไม่ระบุ";
    grouped.set(key, (grouped.get(key) ?? 0) + transaction.amount);
  }

  return Array.from(grouped.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([name, amount]) => ({
      name,
      amount: roundCurrency(amount),
      sharePercent: amountShare(amount, total),
    }));
}

function buildLargestRows(transactions: Transaction[]): DailyTransactionEvidenceRow[] {
  return transactions
    .filter((transaction) => transaction.type === "expense")
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5)
    .map((transaction) => ({
      id: transaction.id,
      date: transaction.date,
      amount: roundCurrency(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      recipient: transaction.recipient,
      note: transaction.note,
    }));
}

function getRollingExpense(
  dailyExpenses: Map<string, number>,
  endDate: Date,
  days: number
) {
  const startDate = addDays(endDate, -days);
  const dates = getDateRange(startDate, addDays(endDate, -1));
  return roundCurrency(
    dates.reduce((sum, date) => sum + (dailyExpenses.get(date) ?? 0), 0)
  );
}

function getDailyExpenseRank(dailyExpenses: Map<string, number>, date: string) {
  const selectedExpense = dailyExpenses.get(date) ?? 0;
  if (selectedExpense <= 0) {
    return null;
  }

  const rankedExpenses = Array.from(dailyExpenses.values()).filter(
    (amount) => amount > 0
  );
  if (rankedExpenses.length === 0) {
    return null;
  }

  return rankedExpenses.filter((amount) => amount > selectedExpense).length + 1;
}

function getDailyExpenseZScore(
  dailyExpenses: Map<string, number>,
  date: string
) {
  const selectedExpense = dailyExpenses.get(date) ?? 0;
  const baseline = Array.from(dailyExpenses.entries())
    .filter(([entryDate]) => entryDate !== date)
    .map(([, amount]) => amount);

  if (selectedExpense <= 0 || baseline.length < 2) {
    return null;
  }

  const deviation = standardDeviation(baseline);
  if (deviation === 0) {
    return null;
  }

  return roundMetric((selectedExpense - average(baseline)) / deviation);
}

function buildDailyMetrics(
  date: string,
  transactions: Transaction[]
): {
  metrics: DailyTransactionMetrics;
  evidence: DailyTransactionEvidence;
} {
  const selectedDate = parseIsoDate(date);
  if (!selectedDate) {
    throw new Error("invalid_date");
  }

  const dayTransactions = transactions.filter(
    (transaction) => transaction.date === date
  );
  const expenseTransactions = dayTransactions.filter(
    (transaction) => transaction.type === "expense"
  );
  const incomeTotal = sumByType(dayTransactions, "income");
  const expenseTotal = sumByType(dayTransactions, "expense");
  const transferTotal = sumByType(dayTransactions, "transfer");
  const dailyExpenses = getExpenseByDate(transactions);
  const rolling7dExpense = getRollingExpense(dailyExpenses, selectedDate, 7);
  const rolling30dExpense = getRollingExpense(dailyExpenses, selectedDate, 30);
  const rolling30dAverageExpense = roundCurrency(rolling30dExpense / 30);

  return {
    metrics: {
      date,
      transactionCount: dayTransactions.length,
      incomeTransactionCount: dayTransactions.filter(
        (transaction) => transaction.type === "income"
      ).length,
      expenseTransactionCount: expenseTransactions.length,
      transferTransactionCount: dayTransactions.filter(
        (transaction) => transaction.type === "transfer"
      ).length,
      incomeTotal,
      expenseTotal,
      transferTotal,
      netCashflow: roundCurrency(incomeTotal - expenseTotal),
      rolling7dExpense,
      rolling30dExpense,
      rolling7dAverageExpense: roundCurrency(rolling7dExpense / 7),
      rolling30dAverageExpense,
      dailyExpenseRankInHistory: getDailyExpenseRank(dailyExpenses, date),
      dailyExpenseZScore: getDailyExpenseZScore(dailyExpenses, date),
      expenseVsRolling30dPercent:
        rolling30dAverageExpense > 0
          ? roundMetric((expenseTotal / rolling30dAverageExpense) * 100)
          : expenseTotal > 0
            ? null
            : 0,
    },
    evidence: {
      topExpenseCategories: buildGroupTotals(
        dayTransactions,
        (transaction) => transaction.category,
        expenseTotal
      ),
      topRecipients: buildGroupTotals(
        dayTransactions,
        (transaction) => transaction.recipient,
        expenseTotal
      ),
      largestTransactions: buildLargestRows(dayTransactions),
    },
  };
}

function buildPeriodMetrics(
  period: string,
  transactions: Transaction[]
): PeriodCashflowMetrics {
  if (!parseMonth(period)) {
    throw new Error("invalid_month");
  }

  const periodTransactions = transactions.filter((transaction) =>
    isInMonth(transaction.date, period)
  );
  const incomeTotal = sumByType(periodTransactions, "income");
  const expenseTotal = sumByType(periodTransactions, "expense");
  const transferTotal = sumByType(periodTransactions, "transfer");
  const netCashflow = roundCurrency(incomeTotal - expenseTotal);
  const daysInMonth = getDaysInMonth(period);

  return {
    period,
    transactionCount: periodTransactions.length,
    incomeTotal,
    expenseTotal,
    transferTotal,
    netCashflow,
    savingsRatePercent:
      incomeTotal > 0 ? roundMetric((netCashflow / incomeTotal) * 100) : null,
    dailyAverageExpense:
      daysInMonth > 0 ? roundCurrency(expenseTotal / daysInMonth) : 0,
    monthlyBurnRate: expenseTotal,
  };
}

function getCategoryAmounts(period: string, transactions: Transaction[]) {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (!isInMonth(transaction.date, period) || transaction.type !== "expense") {
      continue;
    }

    const key = transaction.category || "ไม่ระบุหมวดหมู่";
    totals.set(key, (totals.get(key) ?? 0) + transaction.amount);
  }

  return totals;
}

function buildCategoryShareDeltas(
  from: string,
  to: string,
  transactions: Transaction[]
): CategoryShareDelta[] {
  const fromAmounts = getCategoryAmounts(from, transactions);
  const toAmounts = getCategoryAmounts(to, transactions);
  const fromTotal = Array.from(fromAmounts.values()).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const toTotal = Array.from(toAmounts.values()).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const categories = new Set([...fromAmounts.keys(), ...toAmounts.keys()]);

  return Array.from(categories)
    .map((name) => {
      const fromAmount = fromAmounts.get(name) ?? 0;
      const toAmount = toAmounts.get(name) ?? 0;
      const fromSharePercent = amountShare(fromAmount, fromTotal);
      const toSharePercent = amountShare(toAmount, toTotal);

      return {
        name,
        fromAmount: roundCurrency(fromAmount),
        toAmount: roundCurrency(toAmount),
        deltaAmount: roundCurrency(fromAmount - toAmount),
        fromSharePercent,
        toSharePercent,
        shareDeltaPct: roundMetric(fromSharePercent - toSharePercent),
      };
    })
    .sort(
      (left, right) =>
        Math.abs(right.deltaAmount) - Math.abs(left.deltaAmount)
    )
    .slice(0, 7);
}

function buildCoverageCaveats(input: {
  transactionCount: number;
  scopedTransactionCount: number;
}) {
  const caveats: string[] = [];

  if (input.transactionCount === 0) {
    caveats.push("no_transactions_imported");
  } else if (input.scopedTransactionCount === 0) {
    caveats.push("no_transactions_for_selected_period");
  }

  caveats.push("transfer_rows_are_reported_separately_from_cashflow");

  return caveats;
}

export function buildDailyTransactionMetricPacket({
  date,
  transactions,
  generatedAt = new Date().toISOString(),
}: BuildDailyTransactionMetricPacketInput): MetricPacket<
  DailyTransactionMetrics,
  DailyTransactionEvidence
> {
  const { metrics, evidence } = buildDailyMetrics(date, transactions);

  return {
    scope: "transactions.day",
    period: date,
    metrics,
    evidence,
    generatedAt,
    coverage: {
      transactionCount: transactions.length,
      generatedFrom: ["transactions"],
      caveats: buildCoverageCaveats({
        transactionCount: transactions.length,
        scopedTransactionCount: metrics.transactionCount,
      }),
    },
  };
}

export function buildTransactionAnomalyMetricPacket({
  date,
  transactions,
  generatedAt = new Date().toISOString(),
}: BuildTransactionAnomalyMetricPacketInput): MetricPacket<
  TransactionAnomalyMetrics,
  TransactionAnomalyEvidence
> {
  const { metrics: dailyMetrics, evidence } = buildDailyMetrics(
    date,
    transactions
  );
  const selectedDate = parseIsoDate(date);
  if (!selectedDate) {
    throw new Error("invalid_date");
  }

  const recentDates = getDateRange(addDays(selectedDate, -30), addDays(selectedDate, -1));
  const dailyCounts = new Map<string, number>();
  for (const transaction of transactions) {
    dailyCounts.set(
      transaction.date,
      (dailyCounts.get(transaction.date) ?? 0) + 1
    );
  }

  const rolling30dAverageTransactionCount = roundMetric(
    recentDates.reduce((sum, recentDate) => sum + (dailyCounts.get(recentDate) ?? 0), 0) /
      30
  );
  const transactionFrequencyVs30dPercent =
    rolling30dAverageTransactionCount > 0
      ? roundMetric(
          (dailyMetrics.transactionCount / rolling30dAverageTransactionCount) *
            100
        )
      : dailyMetrics.transactionCount > 0
        ? null
        : 0;
  const anomalyReasons: string[] = [];

  if (
    dailyMetrics.expenseVsRolling30dPercent !== null &&
    dailyMetrics.expenseVsRolling30dPercent >= 250 &&
    dailyMetrics.expenseTotal > 0
  ) {
    anomalyReasons.push("expense_above_rolling_30d_average");
  }

  if (
    dailyMetrics.dailyExpenseZScore !== null &&
    dailyMetrics.dailyExpenseZScore >= 2.5
  ) {
    anomalyReasons.push("expense_zscore_high");
  }

  if (dailyMetrics.dailyExpenseRankInHistory === 1) {
    anomalyReasons.push("highest_expense_day_in_history");
  }

  if (
    transactionFrequencyVs30dPercent !== null &&
    transactionFrequencyVs30dPercent >= 250 &&
    dailyMetrics.transactionCount >= 3
  ) {
    anomalyReasons.push("transaction_frequency_spike");
  }

  let anomalyLevel: TransactionAnomalyMetrics["anomalyLevel"] = "normal";
  if (
    anomalyReasons.includes("highest_expense_day_in_history") ||
    (dailyMetrics.dailyExpenseZScore ?? 0) >= 3.5
  ) {
    anomalyLevel = "critical";
  } else if (anomalyReasons.length >= 2) {
    anomalyLevel = "warning";
  } else if (anomalyReasons.length === 1) {
    anomalyLevel = "watch";
  }

  return {
    scope: "transactions.anomalies.today",
    period: date,
    metrics: {
      date,
      expenseTotal: dailyMetrics.expenseTotal,
      rolling30dAverageExpense: dailyMetrics.rolling30dAverageExpense,
      expenseVsRolling30dPercent: dailyMetrics.expenseVsRolling30dPercent,
      dailyExpenseRankInHistory: dailyMetrics.dailyExpenseRankInHistory,
      dailyExpenseZScore: dailyMetrics.dailyExpenseZScore,
      transactionCount: dailyMetrics.transactionCount,
      rolling30dAverageTransactionCount,
      transactionFrequencyVs30dPercent,
      anomalyLevel,
      anomalyReasons,
    },
    evidence,
    generatedAt,
    coverage: {
      transactionCount: transactions.length,
      generatedFrom: ["transactions"],
      caveats: buildCoverageCaveats({
        transactionCount: transactions.length,
        scopedTransactionCount: dailyMetrics.transactionCount,
      }),
    },
  };
}

export function buildTransactionPeriodComparisonMetricPacket({
  from,
  to,
  transactions,
  generatedAt = new Date().toISOString(),
}: BuildPeriodComparisonMetricPacketInput): MetricPacket<
  PeriodComparisonMetrics,
  PeriodComparisonEvidence
> {
  const fromMetrics = buildPeriodMetrics(from, transactions);
  const toMetrics = buildPeriodMetrics(to, transactions);

  return {
    scope: "transactions.compare",
    period: `${from}_vs_${to}`,
    metrics: {
      from: fromMetrics,
      to: toMetrics,
      delta: {
        incomeChangePct: percentChange(
          fromMetrics.incomeTotal,
          toMetrics.incomeTotal
        ),
        expenseChangePct: percentChange(
          fromMetrics.expenseTotal,
          toMetrics.expenseTotal
        ),
        netCashflowChangePct: percentChange(
          fromMetrics.netCashflow,
          toMetrics.netCashflow
        ),
        transactionCountChangePct: percentChange(
          fromMetrics.transactionCount,
          toMetrics.transactionCount
        ),
      },
    },
    evidence: {
      categoryShareDelta: buildCategoryShareDeltas(from, to, transactions),
    },
    generatedAt,
    coverage: {
      transactionCount: transactions.length,
      generatedFrom: ["transactions"],
      caveats: buildCoverageCaveats({
        transactionCount: transactions.length,
        scopedTransactionCount:
          fromMetrics.transactionCount + toMetrics.transactionCount,
      }),
    },
  };
}
