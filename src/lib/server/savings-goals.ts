import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsGoalEntries, savingsGoals } from "@/db/schema";
import {
  getEntrySignedAmount,
  getGoalPreset,
  sanitizeGoalColor,
} from "@/lib/savings-goals";
import type {
  SavingsBucket,
  SavingsGoal,
  SavingsGoalCategory,
  SavingsGoalDetail,
  SavingsGoalEntry,
  SavingsGoalEntryType,
  SavingsGoalMetrics,
  SavingsGoalSeriesPoint,
  SavingsGoalsPortfolio,
} from "@/lib/types";

type SavingsGoalRow = typeof savingsGoals.$inferSelect;
type SavingsGoalEntryRow = typeof savingsGoalEntries.$inferSelect;

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const AVG_DAYS_PER_MONTH = 30.4375;

function toSatang(amount: number) {
  return Math.round(amount * 100);
}

function fromSatang(amountSatang: number) {
  return amountSatang / 100;
}

function toIsoString(value: Date) {
  return value.toISOString();
}

function formatChartLabel(dateString: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateString}T00:00:00`));
}

function getDaysRemaining(targetDate?: string) {
  if (!targetDate) {
    return null;
  }

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const target = new Date(`${targetDate}T00:00:00`);

  return Math.ceil((target.getTime() - startOfToday.getTime()) / DAY_IN_MS);
}

function mapGoal(row: SavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    icon: row.icon,
    color: row.color,
    targetAmount: fromSatang(row.targetAmountSatang),
    targetDate: row.targetDate ?? undefined,
    strategyLabel: row.strategyLabel ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function mapEntry(row: SavingsGoalEntryRow): SavingsGoalEntry {
  return {
    id: row.id,
    goalId: row.savingsGoalId,
    date: row.entryDate,
    type: row.entryType,
    amount: fromSatang(row.amountSatang),
    note: row.note ?? undefined,
    createdAt: toIsoString(row.createdAt),
  };
}

function calculateMetrics(
  goal: SavingsGoal,
  entries: SavingsGoalEntry[]
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
  const daysRemaining = getDaysRemaining(goal.targetDate);

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

function buildChartData(entries: SavingsGoalEntry[]): SavingsGoalSeriesPoint[] {
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

function buildGoalSummary(
  goal: SavingsGoal,
  metrics: SavingsGoalMetrics
): SavingsBucket {
  return {
    id: goal.id,
    name: goal.name,
    category: goal.category,
    icon: goal.icon,
    color: goal.color,
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

function groupEntriesByGoal(entries: SavingsGoalEntry[]) {
  const grouped = new Map<number, SavingsGoalEntry[]>();

  for (const entry of entries) {
    const currentEntries = grouped.get(entry.goalId) ?? [];
    currentEntries.push(entry);
    grouped.set(entry.goalId, currentEntries);
  }

  return grouped;
}

export async function getSavingsGoalsPortfolio(): Promise<SavingsGoalsPortfolio> {
  const [goalRows, entryRows] = await Promise.all([
    db.select().from(savingsGoals).orderBy(desc(savingsGoals.createdAt)),
    db
      .select()
      .from(savingsGoalEntries)
      .orderBy(desc(savingsGoalEntries.entryDate), desc(savingsGoalEntries.id)),
  ]);

  const goals = goalRows.map(mapGoal);
  const entries = entryRows.map(mapEntry);
  const entriesByGoal = groupEntriesByGoal(entries);

  const summaries = goals.map((goal) => {
    const goalEntries = entriesByGoal.get(goal.id) ?? [];
    const metrics = calculateMetrics(goal, goalEntries);
    return buildGoalSummary(goal, metrics);
  });

  const totalSaved = summaries.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const totalTarget = summaries.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalGrowth = summaries.reduce((sum, goal) => sum + goal.totalGrowth, 0);
  const remainingAmount = Math.max(totalTarget - totalSaved, 0);
  const completedGoals = summaries.filter(
    (goal) => goal.progressPercent >= 100
  ).length;

  return {
    goals: summaries,
    overview: {
      goalCount: summaries.length,
      completedGoals,
      totalSaved,
      totalTarget,
      totalGrowth,
      overallProgressPercent:
        totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
      remainingAmount,
    },
  };
}

export async function getSavingsGoalDetail(
  goalId: number
): Promise<SavingsGoalDetail | null> {
  const [goalRow] = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.id, goalId))
    .limit(1);

  if (!goalRow) {
    return null;
  }

  const entryRows = await db
    .select()
    .from(savingsGoalEntries)
    .where(eq(savingsGoalEntries.savingsGoalId, goalId))
    .orderBy(desc(savingsGoalEntries.entryDate), desc(savingsGoalEntries.id));

  const goal = mapGoal(goalRow);
  const entries = entryRows.map(mapEntry);
  const metrics = calculateMetrics(goal, entries);

  return {
    goal,
    metrics,
    entries,
    chartData: buildChartData(entries),
  };
}

export async function createSavingsGoal(input: {
  name: string;
  category: SavingsGoalCategory;
  targetAmount: number;
  targetDate?: string;
  strategyLabel?: string;
  notes?: string;
  icon?: string;
  color?: string;
  initialAmount?: number;
  initialDate?: string;
}) {
  const preset = getGoalPreset(input.category);
  const targetAmount = Math.max(input.targetAmount, 0);
  const initialAmount = Math.max(input.initialAmount ?? 0, 0);

  const goalId = await db.transaction(async (tx) => {
    const [goal] = await tx
      .insert(savingsGoals)
      .values({
        name: input.name.trim(),
        category: input.category,
        icon: input.icon?.trim() || preset?.icon || "🎯",
        color: sanitizeGoalColor(input.color ?? preset?.color),
        targetAmountSatang: toSatang(targetAmount),
        targetDate: input.targetDate,
        strategyLabel: input.strategyLabel?.trim() || preset?.strategyLabel,
        notes: input.notes?.trim(),
      })
      .returning({ id: savingsGoals.id });

    if (initialAmount > 0) {
      await tx.insert(savingsGoalEntries).values({
        savingsGoalId: goal.id,
        entryDate: input.initialDate ?? new Date().toISOString().slice(0, 10),
        entryType: "contribution",
        amountSatang: toSatang(initialAmount),
        note: "ยอดตั้งต้น",
      });
    }

    return goal.id;
  });

  return getSavingsGoalDetail(goalId);
}

export async function updateSavingsGoal(input: {
  goalId: number;
  name: string;
  category: SavingsGoalCategory;
  targetAmount: number;
  targetDate?: string;
  strategyLabel?: string;
  notes?: string;
  icon?: string;
  color?: string;
}) {
  const existingDetail = await getSavingsGoalDetail(input.goalId);

  if (!existingDetail) {
    return null;
  }

  const preset = getGoalPreset(input.category);

  await db
    .update(savingsGoals)
    .set({
      name: input.name.trim(),
      category: input.category,
      icon: input.icon?.trim() || preset?.icon || existingDetail.goal.icon,
      color: sanitizeGoalColor(
        input.color ?? preset?.color ?? existingDetail.goal.color
      ),
      targetAmountSatang: toSatang(Math.max(input.targetAmount, 0)),
      targetDate: input.targetDate,
      strategyLabel: input.strategyLabel?.trim() || preset?.strategyLabel,
      notes: input.notes?.trim(),
      updatedAt: new Date(),
    })
    .where(eq(savingsGoals.id, input.goalId));

  return getSavingsGoalDetail(input.goalId);
}

export async function addSavingsGoalEntry(input: {
  goalId: number;
  date: string;
  type: SavingsGoalEntryType;
  amount: number;
  note?: string;
}) {
  const existingDetail = await getSavingsGoalDetail(input.goalId);

  if (!existingDetail) {
    return null;
  }

  const normalizedAmount =
    input.type === "adjustment" ? input.amount : Math.abs(input.amount);
  const movement = getEntrySignedAmount(input.type, normalizedAmount);
  const projectedBalance = existingDetail.metrics.currentAmount + movement;

  if (projectedBalance < 0) {
    throw new Error("รายการนี้จะทำให้ยอดสะสมติดลบ");
  }

  await db.insert(savingsGoalEntries).values({
    savingsGoalId: input.goalId,
    entryDate: input.date,
    entryType: input.type,
    amountSatang: toSatang(normalizedAmount),
    note: input.note?.trim(),
  });

  return getSavingsGoalDetail(input.goalId);
}
