import { describe, expect, it } from "vitest";
import { buildGoalHealthMetricPacket } from "@/lib/metrics/goals";
import type { SavingsGoalDetail } from "@/lib/types";

const details: SavingsGoalDetail[] = [
  {
    goal: {
      id: 1,
      name: "Emergency",
      category: "emergency_fund",
      icon: "🛟",
      color: "#10b981",
      isArchived: false,
      targetAmount: 100000,
      targetDate: "2026-06-30",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    metrics: {
      currentAmount: 10000,
      totalContributions: 10000,
      totalGrowth: 0,
      totalWithdrawals: 0,
      totalAdjustments: 0,
      netContributions: 10000,
      progressPercent: 10,
      growthPercent: 0,
      remainingAmount: 90000,
      daysRemaining: 69,
      monthlyPaceNeeded: 39673.91,
      entryCount: 1,
    },
    entries: [
      {
        id: 1,
        goalId: 1,
        date: "2026-04-01",
        type: "contribution",
        amount: 10000,
        createdAt: "2026-04-01T00:00:00.000Z",
      },
    ],
    chartData: [],
  },
];

describe("goal health metrics", () => {
  it("flags goals whose required pace exceeds recent contribution pace", () => {
    const packet = buildGoalHealthMetricPacket({
      goalDetails: details,
      now: new Date("2026-04-22T00:00:00.000Z"),
      generatedAt: "2026-04-22T00:00:00.000Z",
    });

    expect(packet.metrics).toMatchObject({
      goalCount: 1,
      activeGoalCount: 1,
      redGoalCount: 1,
      totalRemainingAmount: 90000,
    });
    expect(packet.evidence?.atRiskGoals[0]).toMatchObject({
      goalId: 1,
      riskLevel: "red",
      monthlyPaceNeeded: 39673.91,
    });
  });
});
