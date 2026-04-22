import {
  getExpenseBreakdownFromTransactions,
  getMonthlyCashflowFromTransactions,
  getTransactionsForYear,
} from "@/lib/finance-analytics";
import type {
  Account,
  MonthlyCashflow,
  SavingsGoalsPortfolio,
  Transaction,
} from "@/lib/types";
import type { MetricPacket } from "@/lib/metrics/types";

interface BuildDashboardMetricPacketInput {
  year: number;
  transactions: Transaction[];
  accounts: Account[];
  goalsPortfolio?: SavingsGoalsPortfolio | null;
  generatedAt?: string;
}

export interface DashboardMetricSummary {
  year: number;
  transactionCount: number;
  selectedYearTransactionCount: number;
  activeAccountCount: number;
  archivedAccountCount: number;
  activeGoalCount: number;
  archivedGoalCount: number;
}

export interface DashboardCashflowMetrics {
  incomeTotal: number;
  expenseTotal: number;
  netCashflow: number;
  savingsRatePercent: number;
  activeMonthCount: number;
  averageMonthlyExpense: number;
}

export interface DashboardNetWorthMetrics {
  storedNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export interface DashboardGoalMetrics {
  totalSaved: number;
  totalTarget: number;
  totalGrowth: number;
  remainingAmount: number;
  overallProgressPercent: number;
  completedGoals: number;
}

export interface DashboardMetrics {
  summary: DashboardMetricSummary;
  cashflow: DashboardCashflowMetrics;
  netWorth: DashboardNetWorthMetrics;
  goals: DashboardGoalMetrics;
}

export interface DashboardTopExpenseCategory {
  name: string;
  amount: number;
  sharePercent: number;
}

export interface DashboardMonthlyExtreme {
  month: string;
  monthIndex: number;
  amount: number;
}

export interface DashboardEvidence {
  monthlyCashflow: MonthlyCashflow[];
  topExpenseCategories: DashboardTopExpenseCategory[];
  bestNetCashflowMonth?: DashboardMonthlyExtreme;
  worstNetCashflowMonth?: DashboardMonthlyExtreme;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function sumAmounts(items: { currentBalance: number }[], predicate: (value: number) => boolean) {
  return roundCurrency(
    items
      .filter((item) => predicate(item.currentBalance))
      .reduce((sum, item) => sum + item.currentBalance, 0)
  );
}

function getMonthlyExtreme(
  monthly: MonthlyCashflow[],
  compare: (left: MonthlyCashflow, right: MonthlyCashflow) => MonthlyCashflow
): DashboardMonthlyExtreme | undefined {
  const activeMonths = monthly.filter(
    (month) => month.income > 0 || month.expense > 0 || month.net !== 0
  );

  if (activeMonths.length === 0) {
    return undefined;
  }

  const selected = activeMonths.reduce(compare);
  return {
    month: selected.month,
    monthIndex: selected.monthIndex,
    amount: roundCurrency(selected.net),
  };
}

function buildCoverageCaveats(input: {
  hasTransactions: boolean;
  hasSelectedYearTransactions: boolean;
  hasAccounts: boolean;
  hasGoals: boolean;
}) {
  const caveats: string[] = [];

  if (!input.hasTransactions) {
    caveats.push("no_transactions_imported");
  } else if (!input.hasSelectedYearTransactions) {
    caveats.push("no_transactions_for_selected_year");
  }

  if (!input.hasAccounts) {
    caveats.push("no_active_accounts");
  }

  if (!input.hasGoals) {
    caveats.push("no_active_savings_goals");
  }

  caveats.push("account_balances_are_stored_values");
  caveats.push("investment_holdings_model_is_partial");
  caveats.push("savings_goals_are_not_linked_to_transactions");

  return caveats;
}

export function buildDashboardMetricPacket({
  year,
  transactions,
  accounts,
  goalsPortfolio,
  generatedAt = new Date().toISOString(),
}: BuildDashboardMetricPacketInput): MetricPacket<DashboardMetrics, DashboardEvidence> {
  const selectedYearTransactions = getTransactionsForYear(transactions, year);
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const archivedAccounts = accounts.filter((account) => account.isArchived);
  const monthlyCashflow = getMonthlyCashflowFromTransactions(transactions, year);

  const incomeTotal = roundCurrency(
    monthlyCashflow.reduce((sum, month) => sum + month.income, 0)
  );
  const expenseTotal = roundCurrency(
    monthlyCashflow.reduce((sum, month) => sum + month.expense, 0)
  );
  const netCashflow = roundCurrency(incomeTotal - expenseTotal);
  const savingsRatePercent =
    incomeTotal > 0 ? roundPercent((netCashflow / incomeTotal) * 100) : 0;
  const activeMonthCount = monthlyCashflow.filter(
    (month) => month.income > 0 || month.expense > 0
  ).length;
  const averageMonthlyExpense =
    activeMonthCount > 0 ? roundCurrency(expenseTotal / activeMonthCount) : 0;

  const totalAssets = sumAmounts(activeAccounts, (balance) => balance > 0);
  const totalLiabilities = roundCurrency(
    Math.abs(sumAmounts(activeAccounts, (balance) => balance < 0))
  );
  const storedNetWorth = roundCurrency(
    activeAccounts.reduce((sum, account) => sum + account.currentBalance, 0)
  );

  const goalOverview = goalsPortfolio?.overview;
  const goalMetrics: DashboardGoalMetrics = {
    totalSaved: roundCurrency(goalOverview?.totalSaved ?? 0),
    totalTarget: roundCurrency(goalOverview?.totalTarget ?? 0),
    totalGrowth: roundCurrency(goalOverview?.totalGrowth ?? 0),
    remainingAmount: roundCurrency(goalOverview?.remainingAmount ?? 0),
    overallProgressPercent: roundPercent(goalOverview?.overallProgressPercent ?? 0),
    completedGoals: goalOverview?.completedGoals ?? 0,
  };

  const topExpenseCategories = getExpenseBreakdownFromTransactions(
    transactions,
    year,
    5
  ).map((category) => ({
    name: category.name,
    amount: roundCurrency(category.value),
    sharePercent: expenseTotal > 0 ? roundPercent((category.value / expenseTotal) * 100) : 0,
  }));

  const hasTransactions = transactions.length > 0;
  const hasSelectedYearTransactions = selectedYearTransactions.length > 0;
  const hasAccounts = activeAccounts.length > 0;
  const activeGoalCount = goalsPortfolio?.overview.goalCount ?? 0;
  const archivedGoalCount = goalsPortfolio?.overview.archivedGoalCount ?? 0;
  const hasGoals = activeGoalCount > 0;

  return {
    scope: "dashboard",
    period: String(year),
    metrics: {
      summary: {
        year,
        transactionCount: transactions.length,
        selectedYearTransactionCount: selectedYearTransactions.length,
        activeAccountCount: activeAccounts.length,
        archivedAccountCount: archivedAccounts.length,
        activeGoalCount,
        archivedGoalCount,
      },
      cashflow: {
        incomeTotal,
        expenseTotal,
        netCashflow,
        savingsRatePercent,
        activeMonthCount,
        averageMonthlyExpense,
      },
      netWorth: {
        storedNetWorth,
        totalAssets,
        totalLiabilities,
      },
      goals: goalMetrics,
    },
    evidence: {
      monthlyCashflow,
      topExpenseCategories,
      bestNetCashflowMonth: getMonthlyExtreme(monthlyCashflow, (left, right) =>
        left.net >= right.net ? left : right
      ),
      worstNetCashflowMonth: getMonthlyExtreme(monthlyCashflow, (left, right) =>
        left.net <= right.net ? left : right
      ),
    },
    generatedAt,
    coverage: {
      transactionCount: transactions.length,
      selectedYearTransactionCount: selectedYearTransactions.length,
      activeAccountCount: activeAccounts.length,
      activeGoalCount,
      generatedFrom: ["transactions", "accounts", "savings_goals"],
      caveats: buildCoverageCaveats({
        hasTransactions,
        hasSelectedYearTransactions,
        hasAccounts,
        hasGoals,
      }),
    },
  };
}

