import { describe, expect, it } from "vitest";
import {
  buildSavingsBucketSummary,
  buildSavingsGoalChartData,
  buildSavingsGoalsOverview,
  calculateSavingsGoalMetrics,
  getSavingsGoalDaysRemaining,
} from "@/lib/savings-goal-analytics";
import type { SavingsGoal, SavingsGoalEntry } from "@/lib/types";

const goal: SavingsGoal = {
  id: 1,
  name: "Retirement",
  category: "retirement",
  icon: "🌅",
  color: "#f59e0b",
  targetAmount: 500000,
  targetDate: "2027-12-31",
  strategyLabel: "RMF",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const entries: SavingsGoalEntry[] = [
  {
    id: 1,
    goalId: 1,
    date: "2026-01-05",
    type: "contribution",
    amount: 100000,
    note: "seed",
    createdAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: 2,
    goalId: 1,
    date: "2026-02-05",
    type: "growth",
    amount: 3500,
    note: "return",
    createdAt: "2026-02-05T00:00:00.000Z",
  },
  {
    id: 3,
    goalId: 1,
    date: "2026-03-05",
    type: "withdrawal",
    amount: 1000,
    note: "fee",
    createdAt: "2026-03-05T00:00:00.000Z",
  },
];

describe("savings-goal-analytics", () => {
  it("computes days remaining against a fixed clock", () => {
    const daysRemaining = getSavingsGoalDaysRemaining(
      "2026-04-30",
      new Date("2026-04-08T10:00:00.000Z")
    );

    expect(daysRemaining).toBe(22);
  });

  it("calculates metrics, progress, and required monthly pace", () => {
    const metrics = calculateSavingsGoalMetrics(
      goal,
      entries,
      new Date("2026-04-08T10:00:00.000Z")
    );

    expect(metrics.currentAmount).toBe(102500);
    expect(metrics.totalContributions).toBe(100000);
    expect(metrics.totalGrowth).toBe(3500);
    expect(metrics.totalWithdrawals).toBe(1000);
    expect(metrics.netContributions).toBe(99000);
    expect(metrics.progressPercent).toBeCloseTo(20.5);
    expect(metrics.growthPercent).toBeCloseTo(3.5353, 3);
    expect(metrics.monthlyPaceNeeded).toBeGreaterThan(0);
  });

  it("builds a running goal chart series", () => {
    const chart = buildSavingsGoalChartData(entries);

    expect(chart).toHaveLength(3);
    expect(chart[0]).toMatchObject({
      balance: 100000,
      netContributions: 100000,
      cumulativeGrowth: 0,
    });
    expect(chart[2]).toMatchObject({
      balance: 102500,
      netContributions: 99000,
      cumulativeGrowth: 3500,
      movement: -1000,
    });
  });

  it("aggregates bucket summaries into a portfolio overview", () => {
    const metrics = calculateSavingsGoalMetrics(goal, entries);
    const summary = buildSavingsBucketSummary(goal, metrics);
    const overview = buildSavingsGoalsOverview([
      summary,
      {
        ...summary,
        id: 2,
        name: "Home",
        targetAmount: 200000,
        currentAmount: 200000,
        totalGrowth: 10000,
        progressPercent: 100,
      },
    ]);

    expect(overview.goalCount).toBe(2);
    expect(overview.completedGoals).toBe(1);
    expect(overview.totalSaved).toBe(302500);
    expect(overview.totalTarget).toBe(700000);
  });
});
