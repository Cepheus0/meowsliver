import { describe, expect, it } from "vitest";
import {
  buildCashflowForecast,
  buildSmartAlerts,
  type CashflowForecast,
} from "@/lib/ai-tools-analytics";
import type { Account, SavingsBucket, Transaction } from "@/lib/types";

const accounts: Account[] = [
  {
    id: 1,
    name: "Main bank",
    type: "bank_savings",
    icon: "Landmark",
    color: "#10b981",
    currentBalance: 100_000,
    isArchived: false,
    isDefault: true,
    sortOrder: 1,
    aliases: ["main"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Old wallet",
    type: "cash",
    icon: "Wallet",
    color: "#f97316",
    currentBalance: 50_000,
    isArchived: true,
    isDefault: false,
    sortOrder: 2,
    aliases: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const transactions: Transaction[] = [
  {
    id: "income-jan",
    date: "2026-01-31",
    amount: 60_000,
    category: "เงินเดือน",
    type: "income",
  },
  {
    id: "expense-jan",
    date: "2026-01-20",
    amount: 30_000,
    category: "อาหาร",
    type: "expense",
    recipient: "Food court",
  },
  {
    id: "income-feb",
    date: "2026-02-28",
    amount: 60_000,
    category: "เงินเดือน",
    type: "income",
  },
  {
    id: "expense-feb",
    date: "2026-02-20",
    amount: 40_000,
    category: "อาหาร",
    type: "expense",
    recipient: "Grocer",
  },
  {
    id: "spike-mar",
    date: "2026-03-15",
    amount: 90_000,
    category: "ท่องเที่ยว",
    type: "expense",
    recipient: "Airline",
  },
  {
    id: "transfer-mar",
    date: "2026-03-16",
    amount: 20_000,
    category: "ย้ายเงิน",
    type: "transfer",
  },
];

describe("ai tools analytics", () => {
  it("builds a deterministic cashflow forecast from active accounts and selected-year cashflow", () => {
    const forecast = buildCashflowForecast({
      transactions,
      accounts,
      year: 2026,
      horizonDays: 30,
    });

    expect(forecast.currentBalance).toBe(100_000);
    expect(forecast.averageMonthlyIncome).toBe(40_000);
    expect(forecast.averageMonthlyExpense).toBe(53_333.33);
    expect(forecast.averageMonthlyNet).toBe(-13_333.33);
    expect(forecast.projectedDelta).toBeLessThan(0);
    expect(forecast.points.at(-1)).toMatchObject({
      day: 30,
      date: "2026-04-15",
    });
  });

  it("turns account health, spending spikes, goals, forecast, and savings rate into actionable alerts", () => {
    const forecast: CashflowForecast = {
      horizonDays: 90,
      currentBalance: 100_000,
      projectedBalance: 80_000,
      lowestBalance: 80_000,
      lowestDate: "2026-06-13",
      averageMonthlyIncome: 40_000,
      averageMonthlyExpense: 53_333.33,
      averageMonthlyNet: -13_333.33,
      projectedDelta: -20_000,
      dangerFloor: 50_000,
      points: [],
    };
    const goals: SavingsBucket[] = [
      {
        id: 9,
        name: "Japan trip",
        category: "travel",
        icon: "🗾",
        color: "#f97316",
        isArchived: false,
        targetAmount: 100_000,
        currentAmount: 72_000,
        totalGrowth: 0,
        growthPercent: 0,
        progressPercent: 72,
        remainingAmount: 28_000,
        entryCount: 4,
      },
    ];

    const alerts = buildSmartAlerts({
      transactions,
      accounts,
      year: 2026,
      forecast,
      goals,
      accountHealth: [
        {
          accountId: 7,
          name: "SET",
          riskLevel: "warning",
          reconciliationStatus: "no_linked_transactions",
          storedBalance: 881_277,
          balanceDifference: 881_277,
          linkedTransactionCount: 0,
        },
      ],
      language: "en",
    });

    expect(alerts.map((alert) => alert.kind)).toEqual([
      "action",
      "warning",
      "goal",
      "forecast",
      "insight",
    ]);
    expect(alerts[0]).toMatchObject({
      href: "/accounts/7",
      amount: 881_277,
    });
    expect(alerts[1]).toMatchObject({
      href: "/transactions?year=2026&type=expense&category=%E0%B8%97%E0%B9%88%E0%B8%AD%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%A2%E0%B8%A7",
      amount: 90_000,
    });
    expect(alerts[2]).toMatchObject({
      href: "/buckets/9",
      severity: "success",
    });
  });
});
