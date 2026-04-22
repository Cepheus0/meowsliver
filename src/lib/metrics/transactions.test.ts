import { describe, expect, it } from "vitest";
import {
  buildDailyTransactionMetricPacket,
  buildTransactionAnomalyMetricPacket,
  buildTransactionPeriodComparisonMetricPacket,
} from "@/lib/metrics/transactions";
import type { Transaction } from "@/lib/types";

const transactions: Transaction[] = [
  {
    id: "baseline-1",
    date: "2026-04-01",
    amount: 100,
    category: "อาหาร",
    type: "expense",
    recipient: "ร้านอาหาร",
  },
  {
    id: "baseline-2",
    date: "2026-04-02",
    amount: 100,
    category: "อาหาร",
    type: "expense",
    recipient: "ร้านอาหาร",
  },
  {
    id: "baseline-3",
    date: "2026-04-03",
    amount: 100,
    category: "เดินทาง",
    type: "expense",
    recipient: "รถไฟฟ้า",
  },
  {
    id: "spike-1",
    date: "2026-04-10",
    amount: 5000,
    category: "เดินทาง",
    type: "expense",
    recipient: "สายการบิน",
  },
  {
    id: "spike-2",
    date: "2026-04-10",
    amount: 50000,
    category: "เงินเดือน",
    type: "income",
  },
  {
    id: "march-income",
    date: "2026-03-05",
    amount: 45000,
    category: "เงินเดือน",
    type: "income",
  },
  {
    id: "march-expense",
    date: "2026-03-07",
    amount: 1000,
    category: "อาหาร",
    type: "expense",
  },
];

describe("transaction metrics", () => {
  it("builds daily cashflow and evidence packets", () => {
    const packet = buildDailyTransactionMetricPacket({
      date: "2026-04-10",
      transactions,
      generatedAt: "2026-04-22T00:00:00.000Z",
    });

    expect(packet).toMatchObject({
      scope: "transactions.day",
      period: "2026-04-10",
      metrics: {
        transactionCount: 2,
        incomeTotal: 50000,
        expenseTotal: 5000,
        netCashflow: 45000,
        dailyExpenseRankInHistory: 1,
      },
    });
    expect(packet.evidence?.topExpenseCategories).toEqual([
      { name: "เดินทาง", amount: 5000, sharePercent: 100 },
    ]);
  });

  it("flags a high-spend anomaly against rolling baseline", () => {
    const packet = buildTransactionAnomalyMetricPacket({
      date: "2026-04-10",
      transactions,
      generatedAt: "2026-04-22T00:00:00.000Z",
    });

    expect(packet.metrics.anomalyLevel).toBe("critical");
    expect(packet.metrics.anomalyReasons).toContain(
      "highest_expense_day_in_history"
    );
    expect(packet.metrics.expenseVsRolling30dPercent).toBeGreaterThan(250);
  });

  it("compares month-over-month period metrics", () => {
    const packet = buildTransactionPeriodComparisonMetricPacket({
      from: "2026-04",
      to: "2026-03",
      transactions,
      generatedAt: "2026-04-22T00:00:00.000Z",
    });

    expect(packet.metrics.from).toMatchObject({
      incomeTotal: 50000,
      expenseTotal: 5300,
      netCashflow: 44700,
    });
    expect(packet.metrics.to).toMatchObject({
      incomeTotal: 45000,
      expenseTotal: 1000,
      netCashflow: 44000,
    });
    expect(packet.evidence?.categoryShareDelta[0].name).toBe("เดินทาง");
  });
});
