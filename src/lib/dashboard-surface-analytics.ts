import type { Transaction } from "@/lib/types";

export interface SpendBreakdownItem {
  label: string;
  amount: number;
  count: number;
  share: number;
}

export interface SpendCategoryDrilldown {
  category: string;
  amount: number;
  count: number;
  share: number;
  averageAmount: number;
  topMerchants: SpendBreakdownItem[];
  topTags: SpendBreakdownItem[];
}

export interface ExpenseHeatmapDay {
  date: string;
  amount: number;
  count: number;
  monthIndex: number;
  weekIndex: number;
  dayOfWeek: number;
  level: number;
}

function getTransactionYear(date: string) {
  return Number.parseInt(date.slice(0, 4), 10);
}

function parseIsoDate(date: string) {
  const [year, month, day] = date.split("-").map((part) => Number.parseInt(part, 10));
  return {
    year,
    monthIndex: Math.max((month ?? 1) - 1, 0),
    day: day ?? 1,
  };
}

function buildRankedBreakdown(
  transactions: Transaction[],
  pickLabel: (transaction: Transaction) => string | undefined,
  limit = 6
) {
  const totals = new Map<string, { amount: number; count: number }>();

  for (const transaction of transactions) {
    const label = pickLabel(transaction)?.trim() || "Unknown";
    const current = totals.get(label) ?? { amount: 0, count: 0 };
    totals.set(label, {
      amount: current.amount + transaction.amount,
      count: current.count + 1,
    });
  }

  const totalAmount = [...totals.values()].reduce((sum, item) => sum + item.amount, 0);

  return [...totals.entries()]
    .map(([label, value]) => ({
      label,
      amount: value.amount,
      count: value.count,
      share: totalAmount > 0 ? value.amount / totalAmount : 0,
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, limit);
}

function quantile(sortedValues: number[], percentile: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.floor((sortedValues.length - 1) * percentile))
  );
  return sortedValues[index] ?? 0;
}

function resolveHeatLevel(amount: number, thresholds: number[]) {
  if (amount <= 0) {
    return 0;
  }

  if (amount <= thresholds[0]) {
    return 1;
  }

  if (amount <= thresholds[1]) {
    return 2;
  }

  if (amount <= thresholds[2]) {
    return 3;
  }

  if (amount <= thresholds[3]) {
    return 4;
  }

  return 5;
}

export function getSpendCategoryDrilldownFromTransactions(
  transactions: Transaction[],
  year: number,
  limit = 8
): SpendCategoryDrilldown[] {
  const yearlyExpenses = transactions.filter(
    (transaction) =>
      transaction.type === "expense" && getTransactionYear(transaction.date) === year
  );

  const byCategory = new Map<string, Transaction[]>();
  for (const transaction of yearlyExpenses) {
    const category = transaction.category?.trim() || "Uncategorized";
    const bucket = byCategory.get(category) ?? [];
    bucket.push(transaction);
    byCategory.set(category, bucket);
  }

  const totalExpense = yearlyExpenses.reduce((sum, transaction) => sum + transaction.amount, 0);

  return [...byCategory.entries()]
    .map(([category, categoryTransactions]) => {
      const amount = categoryTransactions.reduce(
        (sum, transaction) => sum + transaction.amount,
        0
      );
      const count = categoryTransactions.length;

      return {
        category,
        amount,
        count,
        share: totalExpense > 0 ? amount / totalExpense : 0,
        averageAmount: count > 0 ? amount / count : 0,
        topMerchants: buildRankedBreakdown(
          categoryTransactions,
          (transaction) =>
            transaction.recipient ||
            transaction.tag ||
            transaction.note ||
            transaction.payFrom ||
            transaction.subcategory ||
            transaction.category,
          6
        ),
        topTags: buildRankedBreakdown(
          categoryTransactions,
          (transaction) => transaction.tag || transaction.paymentChannel || transaction.payFrom,
          5
        ),
      };
    })
    .sort((left, right) => right.amount - left.amount)
    .slice(0, limit);
}

export function getExpenseHeatmapFromTransactions(
  transactions: Transaction[],
  year: number
): ExpenseHeatmapDay[] {
  const expenseByDate = new Map<string, { amount: number; count: number }>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense" || getTransactionYear(transaction.date) !== year) {
      continue;
    }

    const current = expenseByDate.get(transaction.date) ?? { amount: 0, count: 0 };
    expenseByDate.set(transaction.date, {
      amount: current.amount + transaction.amount,
      count: current.count + 1,
    });
  }

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  const firstDayOffset = start.getUTCDay();
  const activeAmounts = [...expenseByDate.values()]
    .map((value) => value.amount)
    .filter((value) => value > 0)
    .sort((left, right) => left - right);
  const thresholds = [
    quantile(activeAmounts, 0.2),
    quantile(activeAmounts, 0.4),
    quantile(activeAmounts, 0.7),
    quantile(activeAmounts, 0.9),
  ];

  const days: ExpenseHeatmapDay[] = [];
  let dayIndex = 0;

  for (
    let current = new Date(start);
    current <= end;
    current.setUTCDate(current.getUTCDate() + 1)
  ) {
    const date = current.toISOString().slice(0, 10);
    const totals = expenseByDate.get(date) ?? { amount: 0, count: 0 };
    const parsed = parseIsoDate(date);

    days.push({
      date,
      amount: totals.amount,
      count: totals.count,
      monthIndex: parsed.monthIndex,
      dayOfWeek: current.getUTCDay(),
      weekIndex: Math.floor((firstDayOffset + dayIndex) / 7),
      level: resolveHeatLevel(totals.amount, thresholds),
    });

    dayIndex += 1;
  }

  return days;
}
