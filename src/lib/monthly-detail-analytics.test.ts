import { describe, expect, it } from "vitest";
import {
  applyMonthlyFilters,
  buildBreakdown,
  buildSubBreakdownByValue,
  computeTotals,
  EMPTY_FILTER_STATE,
  getMonthlyDetailFromTransactions,
  rollupDaily,
} from "@/lib/monthly-detail-analytics";
import type { Transaction } from "@/lib/types";

const txns: Transaction[] = [
  {
    id: "1",
    date: "2026-02-03",
    time: "09:00",
    amount: 120,
    type: "expense",
    category: "อาหาร",
    tag: "ทริป",
    paymentChannel: "PromptPay",
    payFrom: "ไทยพาณิชย์",
    recipient: "Cafe A",
  },
  {
    id: "2",
    date: "2026-02-03",
    time: "12:30",
    amount: 80,
    type: "expense",
    category: "อาหาร",
    paymentChannel: "บัตรเครดิต",
    payFrom: "CardX",
    recipient: "Grab",
  },
  {
    id: "3",
    date: "2026-02-15",
    time: "08:00",
    amount: 50000,
    type: "income",
    category: "เงินเดือน",
  },
  {
    id: "4",
    date: "2026-02-20",
    time: "10:00",
    amount: 90000,
    type: "transfer",
    category: "ย้ายเงิน",
    payFrom: "ไทยพาณิชย์",
    recipient: "MR. WORAVEE C",
  },
  {
    // Different month — must be excluded.
    id: "5",
    date: "2026-03-01",
    amount: 999,
    type: "expense",
    category: "อาหาร",
  },
];

describe("getMonthlyDetailFromTransactions", () => {
  it("returns only the given month's transactions sorted newest first", () => {
    const detail = getMonthlyDetailFromTransactions(txns, 2026, 1);

    expect(detail.transactions.map((tx) => tx.id)).toEqual([
      "4", // Feb 20
      "3", // Feb 15
      "2", // Feb 3 12:30
      "1", // Feb 3 09:00
    ]);
  });

  it("computes per-type totals and net (income - expense)", () => {
    const detail = getMonthlyDetailFromTransactions(txns, 2026, 1);
    expect(detail.totals).toEqual({
      income: 50000,
      expense: 200,
      transfer: 90000,
      net: 49800,
      count: 4,
      incomeCount: 1,
      expenseCount: 2,
      transferCount: 1,
    });
  });

  it("buckets activity by day and pre-allocates empty days", () => {
    const detail = getMonthlyDetailFromTransactions(txns, 2026, 1);
    expect(detail.daily).toHaveLength(28); // Feb 2026 (non-leap)
    const day3 = detail.daily.find((bucket) => bucket.day === 3)!;
    expect(day3).toMatchObject({ expense: 200, income: 0, net: -200 });
    const day1 = detail.daily.find((bucket) => bucket.day === 1)!;
    expect(day1).toMatchObject({ expense: 0, income: 0, transfer: 0 });
  });

  it("ranks expense breakdowns and includes share-of-total", () => {
    const detail = getMonthlyDetailFromTransactions(txns, 2026, 1);
    const recipients = detail.breakdowns.recipient;
    // Only expense rows contribute to default breakdowns; "Cafe A" 120 vs "Grab" 80.
    expect(recipients.map((slice) => slice.value)).toEqual(["Cafe A", "Grab"]);
    expect(recipients[0]?.share).toBeCloseTo(0.6, 5);
    expect(recipients[1]?.share).toBeCloseTo(0.4, 5);
  });
});

describe("applyMonthlyFilters", () => {
  it("returns all rows when no filter is active", () => {
    const result = applyMonthlyFilters(txns, EMPTY_FILTER_STATE);
    expect(result).toHaveLength(txns.length);
  });

  it("intersects across dimensions (AND between fields)", () => {
    const result = applyMonthlyFilters(txns, {
      ...EMPTY_FILTER_STATE,
      categories: new Set(["อาหาร"]),
      tags: new Set(["ทริป"]),
    });
    expect(result.map((tx) => tx.id)).toEqual(["1"]);
  });

  it("unions within a single dimension (OR inside a field)", () => {
    const result = applyMonthlyFilters(txns, {
      ...EMPTY_FILTER_STATE,
      categories: new Set(["อาหาร", "เงินเดือน"]),
    });
    expect(result.map((tx) => tx.id).sort()).toEqual(["1", "2", "3", "5"]);
  });

  it("free-text search hits category, note, recipient, payFrom", () => {
    const result = applyMonthlyFilters(txns, {
      ...EMPTY_FILTER_STATE,
      search: "grab",
    });
    expect(result.map((tx) => tx.id)).toEqual(["2"]);
  });

  it("filters by amount range inclusive", () => {
    const result = applyMonthlyFilters(txns, {
      ...EMPTY_FILTER_STATE,
      amountMin: 100,
      amountMax: 200,
    });
    expect(result.map((tx) => tx.id)).toEqual(["1"]);
  });

  it("filters by date range inclusive (e.g. clicked-bar drill-down)", () => {
    const singleDay = applyMonthlyFilters(txns, {
      ...EMPTY_FILTER_STATE,
      dateFrom: "2026-02-03",
      dateTo: "2026-02-03",
    });
    expect(singleDay.map((tx) => tx.id).sort()).toEqual(["1", "2"]);

    const week = applyMonthlyFilters(txns, {
      ...EMPTY_FILTER_STATE,
      dateFrom: "2026-02-15",
      dateTo: "2026-02-21",
    });
    expect(week.map((tx) => tx.id).sort()).toEqual(["3", "4"]);
  });
});

describe("rollupDaily", () => {
  it("returns one bucket per day for `day` granularity", () => {
    const detail = getMonthlyDetailFromTransactions(txns, 2026, 1);
    const rolled = rollupDaily(detail.daily, detail.monthLabelFull, "day");
    expect(rolled).toHaveLength(28);
    const day3 = rolled.find((bucket) => bucket.label === "3")!;
    expect(day3).toMatchObject({
      expense: 200,
      income: 0,
      dateFrom: "2026-02-03",
      dateTo: "2026-02-03",
      rangeLabel: "วันที่ 3",
    });
  });

  it("chunks into 7-day weeks for `week` granularity", () => {
    const detail = getMonthlyDetailFromTransactions(txns, 2026, 1);
    const rolled = rollupDaily(detail.daily, detail.monthLabelFull, "week");
    // Feb 2026 has 28 days → 4 weekly buckets
    expect(rolled).toHaveLength(4);
    expect(rolled[0]).toMatchObject({
      label: "ส1",
      dateFrom: "2026-02-01",
      dateTo: "2026-02-07",
      expense: 200, // both Feb 3 expenses fall in week 1
      income: 0,
    });
    expect(rolled[2]).toMatchObject({
      dateFrom: "2026-02-15",
      dateTo: "2026-02-21",
      income: 50000,
      expense: 0,
    });
  });

  it("collapses to a single bucket for `month` granularity", () => {
    const detail = getMonthlyDetailFromTransactions(txns, 2026, 1);
    const rolled = rollupDaily(detail.daily, detail.monthLabelFull, "month");
    expect(rolled).toHaveLength(1);
    expect(rolled[0]).toMatchObject({
      label: "กุมภาพันธ์",
      income: 50000,
      expense: 200,
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
    });
  });
});

describe("computeTotals + buildBreakdown on arbitrary subsets", () => {
  it("computeTotals works on a single-day slice (drill-down range)", () => {
    const day3 = txns.filter((tx) => tx.date === "2026-02-03");
    const totals = computeTotals(day3);
    expect(totals).toMatchObject({
      income: 0,
      expense: 200,
      transfer: 0,
      net: -200,
      count: 2,
      expenseCount: 2,
    });
  });

  it("buildBreakdown ranks tags within a date-range slice", () => {
    const day3 = txns.filter((tx) => tx.date === "2026-02-03");
    const tagSlices = buildBreakdown(day3, "tag");
    // Only the row tagged "ทริป" contributes to expenses with a non-empty tag.
    expect(tagSlices.find((slice) => slice.value === "ทริป")?.amount).toBe(120);
  });
});

describe("buildSubBreakdownByValue", () => {
  it("groups expenses by primary dimension and breaks each group down by secondary", () => {
    // Restrict to Feb so the cross-month "noise" row (id 5) doesn't leak in —
    // callers typically pass a month or range subset already.
    const febOnly = txns.filter((tx) => tx.date.startsWith("2026-02"));
    const map = buildSubBreakdownByValue(febOnly, "category", "tag");
    // Only expense rows contribute. "อาหาร" has two rows; "เงินเดือน" (income)
    // and "ย้ายเงิน" (transfer) are skipped.
    expect([...map.keys()].sort()).toEqual(["อาหาร"]);
    const foodTags = map.get("อาหาร")!;
    // "ทริป" 120 vs "ไม่ระบุ" 80 — both must appear so users see how much
    // had no tag.
    expect(foodTags.map((slice) => slice.label).sort()).toEqual([
      "ทริป",
      "ไม่ระบุ",
    ]);
    expect(foodTags.find((slice) => slice.value === "ทริป")?.amount).toBe(120);
    expect(foodTags.find((slice) => slice.value === undefined)?.amount).toBe(80);
  });

  it("skips primary rows with no value so 'ไม่ระบุ' doesn't become a key", () => {
    const txnsWithoutCategory: Transaction[] = [
      {
        id: "x",
        date: "2026-02-01",
        amount: 50,
        type: "expense",
        category: "",
        tag: "a",
      },
    ];
    const map = buildSubBreakdownByValue(txnsWithoutCategory, "subcategory", "tag");
    // No subcategory on the row → nothing to group by → empty map.
    expect(map.size).toBe(0);
  });
});
