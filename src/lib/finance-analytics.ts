import type {
  AssetItem,
  InvestmentHolding,
  LiabilityItem,
  MonthlyCashflow,
  Transaction,
  YearlySummary,
} from "@/lib/types";
import { THAI_MONTHS } from "@/lib/utils";

export const EMPTY_ASSETS: AssetItem[] = [];
export const EMPTY_LIABILITIES: LiabilityItem[] = [];
export const EMPTY_INVESTMENTS: Record<string, InvestmentHolding[]> = {
  crypto: [],
  ssf: [],
  rmf: [],
  stocks: [],
  others: [],
};

const CATEGORY_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#3b82f6",
  "#22c55e",
  "#64748b",
];

function getTransactionYear(tx: Transaction) {
  return new Date(`${tx.date}T00:00:00`).getFullYear();
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function getTransactionsForYear(
  transactions: Transaction[],
  year: number
): Transaction[] {
  return transactions
    .filter((tx) => getTransactionYear(tx) === year)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getMonthlyCashflowFromTransactions(
  transactions: Transaction[],
  year: number
): MonthlyCashflow[] {
  const monthly = THAI_MONTHS.map((month, monthIndex) => ({
    month,
    monthIndex,
    income: 0,
    expense: 0,
    net: 0,
  }));

  for (const tx of transactions) {
    if (getTransactionYear(tx) !== year) continue;
    if (tx.type !== "income" && tx.type !== "expense") continue;

    const monthIndex = new Date(`${tx.date}T00:00:00`).getMonth();
    if (monthIndex < 0 || monthIndex > 11) continue;

    if (tx.type === "income") {
      monthly[monthIndex].income += tx.amount;
    } else {
      monthly[monthIndex].expense += tx.amount;
    }
  }

  return monthly.map((item) => ({
    ...item,
    net: item.income - item.expense,
  }));
}

export function getYearlySummariesFromTransactions(
  transactions: Transaction[]
): YearlySummary[] {
  const years = [...new Set(transactions.map(getTransactionYear))]
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b);

  if (years.length === 0) {
    return [];
  }

  let runningBalance = 0;
  let previousBalance = 0;

  return years.map((year, index) => {
    const cashflow = getMonthlyCashflowFromTransactions(transactions, year);
    const totalIncome = cashflow.reduce((sum, month) => sum + month.income, 0);
    const totalExpense = cashflow.reduce((sum, month) => sum + month.expense, 0);
    const netCashflow = totalIncome - totalExpense;
    const savingsRate =
      totalIncome > 0 ? roundToSingleDecimal((netCashflow / totalIncome) * 100) : 0;

    runningBalance += netCashflow;

    const balanceGrowth =
      index > 0 && previousBalance !== 0
        ? roundToSingleDecimal(
            ((runningBalance - previousBalance) / Math.abs(previousBalance)) * 100
          )
        : 0;

    previousBalance = runningBalance;

    return {
      year,
      totalIncome,
      totalExpense,
      netCashflow,
      savingsRate,
      netWorth: runningBalance,
      netWorthGrowth: balanceGrowth,
    };
  });
}

export function getExpenseBreakdownFromTransactions(
  transactions: Transaction[],
  year: number,
  limit = 7
) {
  const totals = new Map<string, number>();

  for (const tx of transactions) {
    if (getTransactionYear(tx) !== year || tx.type !== "expense") continue;

    const key = tx.category || "ไม่ระบุหมวดหมู่";
    totals.set(key, (totals.get(key) ?? 0) + tx.amount);
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value], index) => ({
      name,
      value,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
}
