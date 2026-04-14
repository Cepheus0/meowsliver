import { describe, expect, it } from "vitest";
import {
  getExpenseBreakdownFromTransactions,
  getMonthlyCashflowFromTransactions,
  getMonthlyNetWorthTrendFromTransactions,
  getTransactionsForYear,
  getYearlySummariesFromTransactions,
} from "@/lib/finance-analytics";
import type { Transaction } from "@/lib/types";

const transactions: Transaction[] = [
  {
    id: "1",
    date: "2025-12-15",
    amount: 50000,
    category: "เงินเดือน",
    type: "income",
  },
  {
    id: "2",
    date: "2025-12-20",
    amount: 12000,
    category: "ค่าเช่า",
    type: "expense",
  },
  {
    id: "3",
    date: "2026-01-03",
    amount: 52000,
    category: "เงินเดือน",
    type: "income",
  },
  {
    id: "4",
    date: "2026-01-04",
    amount: 4000,
    category: "อาหาร",
    type: "expense",
  },
  {
    id: "5",
    date: "2026-02-10",
    amount: 2000,
    category: "เดินทาง",
    type: "expense",
  },
  {
    id: "6",
    date: "2026-02-12",
    amount: 15000,
    category: "ย้ายเงิน",
    type: "transfer",
  },
];

describe("finance-analytics", () => {
  it("filters and sorts transactions by selected year", () => {
    const result = getTransactionsForYear(transactions, 2026);

    expect(result).toHaveLength(4);
    expect(result.map((item) => item.id)).toEqual(["6", "5", "4", "3"]);
  });

  it("calculates monthly cashflow for a given year", () => {
    const result = getMonthlyCashflowFromTransactions(transactions, 2026);

    expect(result[0]).toMatchObject({
      income: 52000,
      expense: 4000,
      net: 48000,
    });
    expect(result[1]).toMatchObject({
      income: 0,
      expense: 2000,
      net: -2000,
    });
  });

  it("builds yearly summaries with running balance growth", () => {
    const result = getYearlySummariesFromTransactions(transactions);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      year: 2025,
      totalIncome: 50000,
      totalExpense: 12000,
      netCashflow: 38000,
      netWorth: 38000,
    });
    expect(result[1]).toMatchObject({
      year: 2026,
      totalIncome: 52000,
      totalExpense: 6000,
      netCashflow: 46000,
      netWorth: 84000,
    });
  });

  it("groups expense breakdown by category", () => {
    const result = getExpenseBreakdownFromTransactions(transactions, 2026);

    expect(result).toEqual([
      expect.objectContaining({ name: "อาหาร", value: 4000 }),
      expect.objectContaining({ name: "เดินทาง", value: 2000 }),
    ]);
  });

  it("builds monthly net worth trend data with opening balance from prior years", () => {
    const result = getMonthlyNetWorthTrendFromTransactions(transactions, 2026);

    expect(result[0]).toMatchObject({
      month: "ม.ค.",
      netWorth: 86000,
      monthlyNet: 48000,
    });
    expect(result[1]).toMatchObject({
      month: "ก.พ.",
      netWorth: 84000,
      monthlyNet: -2000,
    });
    expect(result[11]).toMatchObject({
      month: "ธ.ค.",
      netWorth: 84000,
      monthlyNet: 0,
    });
  });

  it("ignores transfer rows when calculating cashflow-style metrics", () => {
    const monthly = getMonthlyCashflowFromTransactions(transactions, 2026);
    const yearly = getYearlySummariesFromTransactions(transactions);

    expect(monthly[1]).toMatchObject({
      income: 0,
      expense: 2000,
      net: -2000,
    });
    expect(yearly[1]).toMatchObject({
      year: 2026,
      totalIncome: 52000,
      totalExpense: 6000,
      netCashflow: 46000,
    });
  });
});
