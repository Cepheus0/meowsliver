import type {
  Account,
  AssetItem,
  InvestmentHolding,
  LiabilityItem,
  MonthlyCashflow,
  Transaction,
  YearlySummary,
} from "@/lib/types";
import { getAccountCatalogEntryByName, type InvestmentBucketKey } from "@/lib/account-catalog";
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

function compareTransactionsByDateTimeDesc(left: Transaction, right: Transaction) {
  const leftDateTime = `${left.date}T${left.time ?? "00:00"}`;
  const rightDateTime = `${right.date}T${right.time ?? "00:00"}`;
  return rightDateTime.localeCompare(leftDateTime);
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
    .sort(compareTransactionsByDateTimeDesc);
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

export function getMonthlyNetWorthTrendFromTransactions(
  transactions: Transaction[],
  year: number
) {
  const openingBalance = transactions
    .filter((tx) => getTransactionYear(tx) < year)
    .reduce((runningTotal, tx) => {
      if (tx.type === "income") {
        return runningTotal + tx.amount;
      }
      if (tx.type === "expense") {
        return runningTotal - tx.amount;
      }
      return runningTotal;
    }, 0);

  const monthlyCashflow = getMonthlyCashflowFromTransactions(transactions, year);
  let cumulativeNetWorth = openingBalance;

  return monthlyCashflow.map((month) => {
    cumulativeNetWorth += month.net;

    return {
      month: month.month,
      monthIndex: month.monthIndex,
      netWorth: cumulativeNetWorth,
      monthlyNet: month.net,
    };
  });
}

function inferInvestmentBucket(account: Account): InvestmentBucketKey | null {
  const catalog = getAccountCatalogEntryByName(account.name);
  if (catalog?.investmentBucket) {
    return catalog.investmentBucket;
  }

  if (account.type === "crypto") {
    return "crypto";
  }

  if (account.type !== "investment") {
    return null;
  }

  const normalized = account.name.trim().toLowerCase();
  if (normalized.includes("ssf")) return "ssf";
  if (normalized.includes("rmf")) return "rmf";
  if (normalized.includes("set") || normalized.includes("esg")) return "stocks";
  return "others";
}

function inferAssetCategory(account: Account) {
  const catalog = getAccountCatalogEntryByName(account.name);
  if (catalog?.assetCategory) {
    return catalog.assetCategory;
  }

  switch (account.type) {
    case "cash":
      return "cash";
    case "bank_savings":
      return "bank_savings";
    case "bank_fixed":
      return "bank_fixed";
    case "crypto":
      return "crypto";
    case "investment":
      return inferInvestmentBucket(account) === "stocks"
        ? "stocks"
        : "other_investment";
    default:
      return "other_investment";
  }
}

function inferLiabilityCategory(account: Account) {
  if (account.type === "credit_card") {
    return "credit_card" as const;
  }

  const normalized = account.name.trim().toLowerCase();
  if (normalized.includes("loan")) return "personal_loan" as const;
  if (normalized.includes("mortgage")) return "mortgage" as const;
  return "other_debt" as const;
}

export function getAssetsFromAccounts(accounts: Account[]): AssetItem[] {
  return accounts
    .filter((account) => !account.isArchived && account.currentBalance > 0)
    .sort((left, right) => right.currentBalance - left.currentBalance)
    .map((account) => ({
      category: inferAssetCategory(account),
      label: account.name,
      amount: account.currentBalance,
      color: account.color,
    }));
}

export function getLiabilitiesFromAccounts(accounts: Account[]): LiabilityItem[] {
  return accounts
    .filter((account) => !account.isArchived && account.currentBalance < 0)
    .sort((left, right) => left.currentBalance - right.currentBalance)
    .map((account) => ({
      category: inferLiabilityCategory(account),
      label: account.name,
      amount: Math.abs(account.currentBalance),
      color: account.color,
    }));
}

export function getInvestmentsFromAccounts(accounts: Account[]) {
  const buckets: Record<string, InvestmentHolding[]> = {
    crypto: [],
    ssf: [],
    rmf: [],
    stocks: [],
    others: [],
  };

  for (const account of accounts) {
    if (account.isArchived || account.currentBalance <= 0) continue;

    const bucket = inferInvestmentBucket(account);
    if (!bucket) continue;

    const catalog = getAccountCatalogEntryByName(account.name);
    const costBasis = catalog?.costBasis ?? account.currentBalance;
    const gainLoss = account.currentBalance - costBasis;
    const gainLossPercent =
      costBasis > 0 ? roundToSingleDecimal((gainLoss / costBasis) * 100) : 0;

    buckets[bucket].push({
      id: `account-${account.id}`,
      name: account.name,
      ticker: catalog?.ticker,
      type: inferAssetCategory(account),
      units: 1,
      avgCost: costBasis,
      currentPrice: account.currentBalance,
      totalValue: account.currentBalance,
      gainLoss,
      gainLossPercent,
    });
  }

  for (const key of Object.keys(buckets)) {
    buckets[key] = buckets[key].sort((left, right) => right.totalValue - left.totalValue);
  }

  return buckets as Record<string, InvestmentHolding[]>;
}
