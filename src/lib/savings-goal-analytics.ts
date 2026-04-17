import { getEntrySignedAmount } from "@/lib/savings-goals";
import type {
  SavingsBucket,
  SavingsGoal,
  SavingsGoalEntry,
  SavingsGoalMetrics,
  SavingsGoalSeriesPoint,
  SavingsGoalsPortfolio,
} from "@/lib/types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const AVG_DAYS_PER_MONTH = 30.4375;

function formatChartLabel(dateString: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateString}T00:00:00`));
}

export function getSavingsGoalDaysRemaining(
  targetDate?: string,
  now = new Date()
) {
  if (!targetDate) {
    return null;
  }

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const target = new Date(`${targetDate}T00:00:00`);

  return Math.ceil((target.getTime() - startOfToday.getTime()) / DAY_IN_MS);
}

export function calculateSavingsGoalMetrics(
  goal: SavingsGoal,
  entries: SavingsGoalEntry[],
  now = new Date()
): SavingsGoalMetrics {
  let totalContributions = 0;
  let totalGrowth = 0;
  let totalWithdrawals = 0;
  let totalAdjustments = 0;

  for (const entry of entries) {
    if (entry.type === "contribution") {
      totalContributions += entry.amount;
      continue;
    }

    if (entry.type === "growth") {
      totalGrowth += entry.amount;
      continue;
    }

    if (entry.type === "withdrawal") {
      totalWithdrawals += entry.amount;
      continue;
    }

    totalAdjustments += entry.amount;
  }

  const currentAmount =
    totalContributions + totalGrowth + totalAdjustments - totalWithdrawals;
  const netContributions =
    totalContributions + totalAdjustments - totalWithdrawals;
  const progressPercent =
    goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0;
  const remainingAmount = Math.max(goal.targetAmount - currentAmount, 0);
  const growthPercent =
    netContributions > 0 ? (totalGrowth / netContributions) * 100 : 0;
  const daysRemaining = getSavingsGoalDaysRemaining(goal.targetDate, now);

  let monthlyPaceNeeded: number | null = null;
  if (daysRemaining !== null && daysRemaining > 0 && remainingAmount > 0) {
    monthlyPaceNeeded =
      remainingAmount / Math.max(daysRemaining / AVG_DAYS_PER_MONTH, 1);
  }

  return {
    currentAmount,
    totalContributions,
    totalGrowth,
    totalWithdrawals,
    totalAdjustments,
    netContributions,
    progressPercent,
    growthPercent,
    remainingAmount,
    daysRemaining,
    monthlyPaceNeeded,
    entryCount: entries.length,
  };
}

export function buildSavingsGoalChartData(
  entries: SavingsGoalEntry[]
): SavingsGoalSeriesPoint[] {
  const sortedEntries = [...entries].sort(
    (left, right) =>
      left.date.localeCompare(right.date) || left.id - right.id
  );

  let balance = 0;
  let netContributions = 0;
  let cumulativeGrowth = 0;

  return sortedEntries.map((entry) => {
    const movement = getEntrySignedAmount(entry.type, entry.amount);
    balance += movement;

    if (entry.type === "growth") {
      cumulativeGrowth += entry.amount;
    } else if (entry.type === "withdrawal") {
      netContributions -= entry.amount;
    } else {
      netContributions += movement;
    }

    return {
      date: entry.date,
      label: formatChartLabel(entry.date),
      balance,
      netContributions,
      cumulativeGrowth,
      movement,
    };
  });
}

export function buildSavingsBucketSummary(
  goal: SavingsGoal,
  metrics: SavingsGoalMetrics
): SavingsBucket {
  return {
    id: goal.id,
    name: goal.name,
    category: goal.category,
    icon: goal.icon,
    color: goal.color,
    isArchived: goal.isArchived,
    targetAmount: goal.targetAmount,
    targetDate: goal.targetDate,
    strategyLabel: goal.strategyLabel,
    currentAmount: metrics.currentAmount,
    totalGrowth: metrics.totalGrowth,
    growthPercent: metrics.growthPercent,
    progressPercent: metrics.progressPercent,
    remainingAmount: metrics.remainingAmount,
    entryCount: metrics.entryCount,
  };
}

export function buildSavingsGoalsOverview(
  goals: SavingsBucket[],
  archivedGoalCount = 0
): SavingsGoalsPortfolio["overview"] {
  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalGrowth = goals.reduce((sum, goal) => sum + goal.totalGrowth, 0);
  const remainingAmount = Math.max(totalTarget - totalSaved, 0);
  const completedGoals = goals.filter((goal) => goal.progressPercent >= 100).length;

  return {
    goalCount: goals.length,
    archivedGoalCount,
    completedGoals,
    totalSaved,
    totalTarget,
    totalGrowth,
    overallProgressPercent: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
    remainingAmount,
  };
}
