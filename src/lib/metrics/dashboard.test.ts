import { describe, expect, it } from "vitest";
import { buildDashboardMetricPacket } from "@/lib/metrics/dashboard";
import type { Account, SavingsGoalsPortfolio, Transaction } from "@/lib/types";

const transactions: Transaction[] = [
  {
    id: "txn-1",
    date: "2025-12-20",
    amount: 8000,
    category: "ค่าเช่า",
    type: "expense",
  },
  {
    id: "txn-2",
    date: "2026-01-03",
    amount: 50000,
    category: "เงินเดือน",
    type: "income",
  },
  {
    id: "txn-3",
    date: "2026-01-05",
    amount: 5000,
    category: "อาหาร",
    type: "expense",
  },
  {
    id: "txn-4",
    date: "2026-02-10",
    amount: 15000,
    category: "เดินทาง",
    type: "expense",
  },
  {
    id: "txn-5",
    date: "2026-02-11",
    amount: 2000,
    category: "อาหาร",
    type: "expense",
  },
  {
    id: "txn-6",
    date: "2026-02-12",
    amount: 10000,
    category: "ย้ายเงิน",
    type: "transfer",
  },
];

const accounts: Account[] = [
  {
    id: 1,
    name: "Main Bank",
    type: "bank_savings",
    icon: "Landmark",
    color: "#3b82f6",
    currentBalance: 120000,
    isArchived: false,
    isDefault: true,
    sortOrder: 1,
    aliases: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Credit Card",
    type: "credit_card",
    icon: "CreditCard",
    color: "#ef4444",
    currentBalance: -20000,
    isArchived: false,
    isDefault: false,
    sortOrder: 2,
    aliases: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 3,
    name: "Old Wallet",
    type: "cash",
    icon: "Wallet",
    color: "#10b981",
    currentBalance: 999,
    isArchived: true,
    isDefault: false,
    sortOrder: 3,
    aliases: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const goalsPortfolio: SavingsGoalsPortfolio = {
  goals: [],
  archivedGoals: [],
  overview: {
    goalCount: 2,
    archivedGoalCount: 1,
    completedGoals: 1,
    totalSaved: 25000,
    totalTarget: 100000,
    totalGrowth: 1500,
    overallProgressPercent: 25,
    remainingAmount: 75000,
  },
};

describe("dashboard metrics", () => {
  it("builds an evidence-backed dashboard metric packet", () => {
    const packet = buildDashboardMetricPacket({
      year: 2026,
      transactions,
      accounts,
      goalsPortfolio,
      generatedAt: "2026-04-22T00:00:00.000Z",
    });

    expect(packet).toMatchObject({
      scope: "dashboard",
      period: "2026",
      generatedAt: "2026-04-22T00:00:00.000Z",
      metrics: {
        summary: {
          year: 2026,
          transactionCount: 6,
          selectedYearTransactionCount: 5,
          activeAccountCount: 2,
          archivedAccountCount: 1,
          activeGoalCount: 2,
          archivedGoalCount: 1,
        },
        cashflow: {
          incomeTotal: 50000,
          expenseTotal: 22000,
          netCashflow: 28000,
          savingsRatePercent: 56,
          activeMonthCount: 2,
          averageMonthlyExpense: 11000,
        },
        netWorth: {
          storedNetWorth: 100000,
          totalAssets: 120000,
          totalLiabilities: 20000,
        },
        goals: {
          totalSaved: 25000,
          totalTarget: 100000,
          remainingAmount: 75000,
          overallProgressPercent: 25,
        },
      },
    });
    expect(packet.evidence?.topExpenseCategories).toEqual([
      { name: "เดินทาง", amount: 15000, sharePercent: 68.2 },
      { name: "อาหาร", amount: 7000, sharePercent: 31.8 },
    ]);
    expect(packet.evidence?.bestNetCashflowMonth).toMatchObject({
      month: "ม.ค.",
      amount: 45000,
    });
    expect(packet.evidence?.worstNetCashflowMonth).toMatchObject({
      month: "ก.พ.",
      amount: -17000,
    });
    expect(packet.coverage.caveats).toContain("account_balances_are_stored_values");
  });

  it("surfaces empty-state caveats without inventing numbers", () => {
    const packet = buildDashboardMetricPacket({
      year: 2026,
      transactions: [],
      accounts: [],
      generatedAt: "2026-04-22T00:00:00.000Z",
    });

    expect(packet.metrics.cashflow).toMatchObject({
      incomeTotal: 0,
      expenseTotal: 0,
      netCashflow: 0,
      savingsRatePercent: 0,
    });
    expect(packet.evidence?.topExpenseCategories).toEqual([]);
    expect(packet.evidence?.bestNetCashflowMonth).toBeUndefined();
    expect(packet.coverage.caveats).toEqual(
      expect.arrayContaining([
        "no_transactions_imported",
        "no_active_accounts",
        "no_active_savings_goals",
      ])
    );
  });
});

