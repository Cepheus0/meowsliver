import { describe, expect, it } from "vitest";
import {
  getExpenseHeatmapFromTransactions,
  getSpendCategoryDrilldownFromTransactions,
} from "@/lib/dashboard-surface-analytics";
import type { Transaction } from "@/lib/types";

const transactions: Transaction[] = [
  {
    id: "1",
    date: "2026-01-02",
    amount: 1800,
    category: "อาหาร",
    type: "expense",
    recipient: "Sushi Bar",
    tag: "กินข้าว",
  },
  {
    id: "2",
    date: "2026-01-02",
    amount: 900,
    category: "อาหาร",
    type: "expense",
    recipient: "Sushi Bar",
    tag: "กินข้าว",
  },
  {
    id: "3",
    date: "2026-01-05",
    amount: 1200,
    category: "เดินทาง",
    type: "expense",
    recipient: "BTS MRT",
    tag: "เดินทาง",
  },
  {
    id: "4",
    date: "2026-01-05",
    amount: 650,
    category: "เดินทาง",
    type: "expense",
    recipient: "Bolt",
    tag: "เดินทาง",
  },
  {
    id: "5",
    date: "2026-02-09",
    amount: 3540,
    category: "ที่อยู่อาศัย",
    type: "expense",
    recipient: "Landlord",
    tag: "ค่าเช่า",
  },
  {
    id: "6",
    date: "2026-02-09",
    amount: 50000,
    category: "เงินเดือน",
    type: "income",
    recipient: "Employer",
  },
];

describe("dashboard-surface-analytics", () => {
  it("builds expense category drilldown with top merchants and tags", () => {
    const result = getSpendCategoryDrilldownFromTransactions(transactions, 2026);

    expect(result[0]).toMatchObject({
      category: "ที่อยู่อาศัย",
      amount: 3540,
      count: 1,
    });
    expect(result[1]).toMatchObject({
      category: "อาหาร",
      amount: 2700,
      count: 2,
    });
    expect(result[1]?.topMerchants[0]).toMatchObject({
      label: "Sushi Bar",
      amount: 2700,
      count: 2,
    });
    expect(result[2]?.topTags[0]).toMatchObject({
      label: "เดินทาง",
      amount: 1850,
    });
  });

  it("builds a year heatmap with daily totals and non-zero intensity levels", () => {
    const result = getExpenseHeatmapFromTransactions(transactions, 2026);

    const febNine = result.find((day) => day.date === "2026-02-09");
    const janTwo = result.find((day) => day.date === "2026-01-02");
    const janThree = result.find((day) => day.date === "2026-01-03");

    expect(result).toHaveLength(365);
    expect(febNine).toMatchObject({
      amount: 3540,
      count: 1,
    });
    expect(febNine?.level).toBeGreaterThan(0);
    expect(janTwo).toMatchObject({
      amount: 2700,
      count: 2,
    });
    expect(janThree).toMatchObject({
      amount: 0,
      count: 0,
      level: 0,
    });
  });
});
