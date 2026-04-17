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
  "#7c2d12", // orange-950 (largest slice)
  "#9a3a16", // deep copper
  "#b84d22", // rust
  "#d9622f", // warm orange
  "#f07843", // medium orange
  "#f5a070", // light salmon
  "#f8c4a0", // pale peach
];

const ASSET_TYPE_COLORS: Record<string, string> = {
  cash: "#10b981",
  bank_savings: "#3b82f6",
  bank_fixed: "#6366f1",
  stocks: "#8b5cf6",
  etf: "#a855f7",
  crypto: "#f59e0b",
  ssf: "#06b6d4",
  rmf: "#14b8a6",
  gold: "#eab308",
  other_investment: "#64748b",
};

const LIABILITY_TYPE_COLORS: Record<string, string> = {
  credit_card: "#ef4444",
  personal_loan: "#f87171",
  car_loan: "#fb923c",
  mortgage: "#fb7185",
  other_debt: "#94a3b8",
};

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

export function getAssetsFromAccounts(accounts: any[]): AssetItem[] {
  const active = accounts.filter((a) => !a.isArchived && a.currentBalance > 0);
  const totals = new Map<string, number>();

  for (const account of active) {
    let category = account.type as string;
    const nameLower = account.name.toLowerCase();

    // Refine category based on name
    if (nameLower.includes("ssf")) category = "ssf";
    else if (nameLower.includes("rmf")) category = "rmf";
    else if (nameLower.includes("thaiesg") || nameLower.includes("esg"))
      category = "other_investment";
    else if (
      nameLower.includes("set") ||
      nameLower.includes("stock") ||
      nameLower.includes("หุ้น")
    )
      category = "stocks";

    totals.set(category, (totals.get(category) ?? 0) + account.currentBalance);
  }

  const labels: Record<string, string> = {
    cash: "เงินสด",
    bank_savings: "เงินฝากออมทรัพย์",
    bank_fixed: "เงินฝากประจำ",
    stocks: "หุ้นไทย/ต่างประเทศ",
    etf: "กองทุนรวม/ETF",
    crypto: "คริปโตเคอร์เรนซี",
    ssf: "กองทุน SSF",
    rmf: "กองทุน RMF",
    gold: "ทองคำ",
    other_investment: "การลงทุนอื่นๆ",
    investment: "การลงทุน",
    other: "สินทรัพย์อื่นๆ",
  };

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category: category as any,
      label: labels[category] || category,
      amount,
      color: ASSET_TYPE_COLORS[category] || "#64748b",
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getLiabilitiesFromAccounts(accounts: any[]): LiabilityItem[] {
  const active = accounts.filter((a) => !a.isArchived && a.currentBalance < 0);
  const totals = new Map<string, number>();

  for (const account of active) {
    const category = account.type as string;
    totals.set(
      category,
      (totals.get(category) ?? 0) + Math.abs(account.currentBalance)
    );
  }

  const labels: Record<string, string> = {
    credit_card: "บัตรเครดิต",
    personal_loan: "สินเชื่อส่วนบุคคล",
    car_loan: "สินเชื่อรถยนต์",
    mortgage: "สินเชื่อบ้าน",
    other_debt: "หนี้สินอื่นๆ",
    other: "หนี้สินอื่นๆ",
  };

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category: category as any,
      label: labels[category] || category,
      amount,
      color: LIABILITY_TYPE_COLORS[category] || "#ef4444",
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getInvestmentsFromAccounts(
  accounts: any[],
  transactions: Transaction[]
): Record<string, InvestmentHolding[]> {
  const result: Record<string, InvestmentHolding[]> = {
    crypto: [],
    ssf: [],
    rmf: [],
    stocks: [],
    others: [],
  };

  // Filter for investment-related accounts
  const investmentAccounts = accounts.filter(
    (a) => a.type === "investment" || a.type === "crypto"
  );

  for (const account of investmentAccounts) {
    const accountTransactions = transactions.filter(
      (tx) => tx.accountId === account.id
    );

    // Calculate total cost from transactions
    // In this system, we'll assume transactions in investment accounts are contributions/buys
    const totalCost = accountTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const currentValue = account.currentBalance;
    const gainLoss = currentValue - totalCost;
    const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

    const holding: InvestmentHolding = {
      id: String(account.id),
      name: account.name,
      type: "other_investment", // Default
      units: 0, // We don't have units in the current schema
      avgCost: totalCost,
      currentPrice: currentValue,
      totalValue: currentValue,
      gainLoss: gainLoss,
      gainLossPercent: gainLossPercent,
    };

    // Categorize based on name or type
    const nameLower = account.name.toLowerCase();
    if (account.type === "crypto" || nameLower.includes("crypto") || nameLower.includes("binance") || nameLower.includes("bitkub")) {
      holding.type = "crypto";
      result.crypto.push(holding);
    } else if (nameLower.includes("ssf")) {
      holding.type = "ssf";
      result.ssf.push(holding);
    } else if (nameLower.includes("rmf")) {
      holding.type = "rmf";
      result.rmf.push(holding);
    } else if (nameLower.includes("set") || nameLower.includes("stock") || nameLower.includes("หุ้น")) {
      holding.type = "stocks";
      result.stocks.push(holding);
    } else {
      // ThaiESG or others
      result.others.push(holding);
    }
  }

  return result;
}
