import { describe, expect, it } from "vitest";
import {
  getExpenseBreakdownFromTransactions,
  getMonthlyCashflowFromTransactions,
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
];

describe("finance-analytics", () => {
  it("filters and sorts transactions by selected year", () => {
    const result = getTransactionsForYear(transactions, 2026);

    expect(result).toHaveLength(3);
    expect(result.map((item) => item.id)).toEqual(["5", "4", "3"]);
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
});
