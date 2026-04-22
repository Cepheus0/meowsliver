import type { MetricPacket } from "@/lib/metrics/types";
import type {
  SavingsGoalDetail,
  SavingsGoalEntry,
  SavingsGoalMetrics,
} from "@/lib/types";

const AVG_DAYS_PER_MONTH = 30.4375;
const RECENT_WINDOW_DAYS = 90;

interface BuildGoalHealthMetricPacketInput {
  goalDetails: SavingsGoalDetail[];
  generatedAt?: string;
  now?: Date;
}

interface BuildGoalHealthDetailMetricPacketInput
  extends BuildGoalHealthMetricPacketInput {
  goalId: number;
}

export type GoalRiskLevel = "info" | "green" | "amber" | "red";

export interface GoalHealthItem {
  goalId: number;
  name: string;
  category: string;
  isArchived: boolean;
  targetAmount: number;
  targetDate?: string;
  currentAmount: number;
  progressPercent: number;
  remainingAmount: number;
  monthlyPaceNeeded: number | null;
  recentContributionPace: number;
  paceGap: number | null;
  growthSharePercent: number;
  daysRemaining: number | null;
  riskLevel: GoalRiskLevel;
  reasons: string[];
}

export interface GoalHealthMetrics {
  goalCount: number;
  activeGoalCount: number;
  archivedGoalCount: number;
  completedGoalCount: number;
  redGoalCount: number;
  amberGoalCount: number;
  totalRemainingAmount: number;
}

export interface GoalHealthEvidence {
  goals: GoalHealthItem[];
  atRiskGoals: GoalHealthItem[];
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function parseIsoDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return null;
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function getStartOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getEntryCashMovement(entry: SavingsGoalEntry) {
  if (entry.type === "contribution") {
    return entry.amount;
  }

  if (entry.type === "withdrawal") {
    return -entry.amount;
  }

  if (entry.type === "adjustment") {
    return entry.amount;
  }

  return 0;
}

function getRecentContributionPace(
  entries: SavingsGoalEntry[],
  now: Date
) {
  const today = getStartOfUtcDay(now);
  const windowStart = new Date(today);
  windowStart.setUTCDate(today.getUTCDate() - RECENT_WINDOW_DAYS);

  const recentCashMovement = entries.reduce((sum, entry) => {
    const entryDate = parseIsoDate(entry.date);
    if (!entryDate) {
      return sum;
    }

    if (entryDate < windowStart || entryDate > today) {
      return sum;
    }

    return sum + getEntryCashMovement(entry);
  }, 0);

  return roundCurrency(recentCashMovement / (RECENT_WINDOW_DAYS / AVG_DAYS_PER_MONTH));
}

function getRiskLevel(input: {
  metrics: SavingsGoalMetrics;
  targetAmount: number;
  recentContributionPace: number;
  isArchived: boolean;
}) {
  const reasons: string[] = [];
  let riskLevel: GoalRiskLevel = "green";

  if (input.isArchived) {
    return {
      riskLevel: "info" as const,
      reasons: ["goal_archived"],
    };
  }

  if (input.metrics.progressPercent >= 100) {
    return {
      riskLevel: "green" as const,
      reasons: ["goal_completed"],
    };
  }

  if (input.targetAmount <= 0) {
    return {
      riskLevel: "info" as const,
      reasons: ["goal_has_no_positive_target"],
    };
  }

  if (input.metrics.daysRemaining === null) {
    return {
      riskLevel: "info" as const,
      reasons: ["goal_has_no_target_date"],
    };
  }

  if (input.metrics.daysRemaining <= 0 && input.metrics.remainingAmount > 0) {
    return {
      riskLevel: "red" as const,
      reasons: ["target_date_passed_with_remaining_amount"],
    };
  }

  const paceNeeded = input.metrics.monthlyPaceNeeded;
  if (paceNeeded === null || paceNeeded <= 0) {
    return {
      riskLevel,
      reasons,
    };
  }

  if (input.recentContributionPace <= 0) {
    return {
      riskLevel: "red" as const,
      reasons: ["no_recent_cash_contribution_pace"],
    };
  }

  const paceRatio = paceNeeded / input.recentContributionPace;

  if (paceRatio >= 1.5) {
    riskLevel = "red";
    reasons.push("required_pace_far_above_recent_pace");
  } else if (paceRatio >= 1.1) {
    riskLevel = "amber";
    reasons.push("required_pace_above_recent_pace");
  }

  return {
    riskLevel,
    reasons,
  };
}

function getRiskWeight(riskLevel: GoalRiskLevel) {
  const weights: Record<GoalRiskLevel, number> = {
    info: 0,
    green: 1,
    amber: 2,
    red: 3,
  };

  return weights[riskLevel];
}

function buildGoalHealthItem(
  detail: SavingsGoalDetail,
  now: Date
): GoalHealthItem {
  const recentContributionPace = getRecentContributionPace(detail.entries, now);
  const risk = getRiskLevel({
    metrics: detail.metrics,
    targetAmount: detail.goal.targetAmount,
    recentContributionPace,
    isArchived: detail.goal.isArchived,
  });
  const monthlyPaceNeeded =
    detail.metrics.monthlyPaceNeeded === null
      ? null
      : roundCurrency(detail.metrics.monthlyPaceNeeded);

  return {
    goalId: detail.goal.id,
    name: detail.goal.name,
    category: detail.goal.category,
    isArchived: detail.goal.isArchived,
    targetAmount: roundCurrency(detail.goal.targetAmount),
    targetDate: detail.goal.targetDate,
    currentAmount: roundCurrency(detail.metrics.currentAmount),
    progressPercent: roundPercent(detail.metrics.progressPercent),
    remainingAmount: roundCurrency(detail.metrics.remainingAmount),
    monthlyPaceNeeded,
    recentContributionPace,
    paceGap:
      monthlyPaceNeeded === null
        ? null
        : roundCurrency(monthlyPaceNeeded - recentContributionPace),
    growthSharePercent:
      detail.metrics.currentAmount > 0
        ? roundPercent((detail.metrics.totalGrowth / detail.metrics.currentAmount) * 100)
        : 0,
    daysRemaining: detail.metrics.daysRemaining,
    riskLevel: risk.riskLevel,
    reasons: risk.reasons,
  };
}

function buildCoverageCaveats(input: { activeGoalCount: number }) {
  const caveats: string[] = ["savings_goals_are_not_linked_to_transactions"];

  if (input.activeGoalCount === 0) {
    caveats.push("no_active_savings_goals");
  }

  caveats.push("recent_pace_uses_cash_goal_entries_not_transaction_lineage");

  return caveats;
}

export function buildGoalHealthMetricPacket({
  goalDetails,
  generatedAt = new Date().toISOString(),
  now = new Date(),
}: BuildGoalHealthMetricPacketInput): MetricPacket<
  GoalHealthMetrics,
  GoalHealthEvidence
> {
  const goals = goalDetails.map((detail) => buildGoalHealthItem(detail, now));
  const activeGoals = goals.filter((goal) => !goal.isArchived);
  const atRiskGoals = activeGoals
    .filter((goal) => goal.riskLevel === "red" || goal.riskLevel === "amber")
    .sort((left, right) => {
      const riskDelta = getRiskWeight(right.riskLevel) - getRiskWeight(left.riskLevel);
      if (riskDelta !== 0) {
        return riskDelta;
      }

      return (right.paceGap ?? 0) - (left.paceGap ?? 0);
    });

  return {
    scope: "goals.health",
    metrics: {
      goalCount: goals.length,
      activeGoalCount: activeGoals.length,
      archivedGoalCount: goals.length - activeGoals.length,
      completedGoalCount: activeGoals.filter((goal) => goal.progressPercent >= 100)
        .length,
      redGoalCount: activeGoals.filter((goal) => goal.riskLevel === "red").length,
      amberGoalCount: activeGoals.filter((goal) => goal.riskLevel === "amber")
        .length,
      totalRemainingAmount: roundCurrency(
        activeGoals.reduce((sum, goal) => sum + goal.remainingAmount, 0)
      ),
    },
    evidence: {
      goals,
      atRiskGoals,
    },
    generatedAt,
    coverage: {
      goalCount: goals.length,
      activeGoalCount: activeGoals.length,
      generatedFrom: ["savings_goals", "savings_goal_entries"],
      caveats: buildCoverageCaveats({ activeGoalCount: activeGoals.length }),
    },
  };
}

export function buildGoalHealthDetailMetricPacket({
  goalId,
  goalDetails,
  generatedAt = new Date().toISOString(),
  now = new Date(),
}: BuildGoalHealthDetailMetricPacketInput): MetricPacket<
  GoalHealthItem,
  GoalHealthEvidence
> {
  const packet = buildGoalHealthMetricPacket({
    goalDetails,
    generatedAt,
    now,
  });
  const item = packet.evidence?.goals.find((goal) => goal.goalId === goalId);

  if (!item) {
    throw new Error("goal_not_found");
  }

  return {
    scope: "goals.health.detail",
    period: String(goalId),
    metrics: item,
    evidence: packet.evidence,
    generatedAt,
    coverage: packet.coverage,
  };
}
