import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { savingsGoalEntries, savingsGoals } from "@/db/schema";
import {
  buildSavingsBucketSummary,
  buildSavingsGoalChartData,
  buildSavingsGoalsOverview,
  calculateSavingsGoalMetrics,
} from "@/lib/savings-goal-analytics";
import {
  getEntrySignedAmount,
  getGoalPreset,
  sanitizeGoalColor,
} from "@/lib/savings-goals";
import type {
  SavingsGoal,
  SavingsGoalCategory,
  SavingsGoalDetail,
  SavingsGoalEntry,
  SavingsGoalEntryType,
  SavingsGoalsPortfolio,
} from "@/lib/types";

type SavingsGoalRow = typeof savingsGoals.$inferSelect;
type SavingsGoalEntryRow = typeof savingsGoalEntries.$inferSelect;

function toSatang(amount: number) {
  return Math.round(amount * 100);
}

function fromSatang(amountSatang: number) {
  return amountSatang / 100;
}

function toIsoString(value: Date) {
  return value.toISOString();
}

function mapGoal(row: SavingsGoalRow): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    icon: row.icon,
    color: row.color,
    isArchived: row.isArchived,
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

function groupEntriesByGoal(entries: SavingsGoalEntry[]) {
  const grouped = new Map<number, SavingsGoalEntry[]>();

  for (const entry of entries) {
    const currentEntries = grouped.get(entry.goalId) ?? [];
    currentEntries.push(entry);
    grouped.set(entry.goalId, currentEntries);
  }

  return grouped;
}

function assertGoalEntryMutationsAllowed(goal: SavingsGoal) {
  if (goal.isArchived) {
    throw new Error("เป้าหมายนี้ถูก archive แล้ว แก้ไข movement เพิ่มไม่ได้");
  }
}

function validateGoalBalanceAfterMutation(
  goal: SavingsGoal,
  entries: SavingsGoalEntry[],
  message: string
) {
  const metrics = calculateSavingsGoalMetrics(goal, entries);

  if (metrics.currentAmount < 0) {
    throw new Error(message);
  }
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
    const metrics = calculateSavingsGoalMetrics(goal, goalEntries);
    return buildSavingsBucketSummary(goal, metrics);
  });

  const activeGoals = summaries.filter((goal) => !goal.isArchived);
  const archivedGoals = summaries.filter((goal) => goal.isArchived);

  return {
    goals: activeGoals,
    archivedGoals,
    overview: buildSavingsGoalsOverview(activeGoals, archivedGoals.length),
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
  const metrics = calculateSavingsGoalMetrics(goal, entries);

  return {
    goal,
    metrics,
    entries,
    chartData: buildSavingsGoalChartData(entries),
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
        isArchived: false,
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

  assertGoalEntryMutationsAllowed(existingDetail.goal);

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

export async function updateSavingsGoalEntry(input: {
  goalId: number;
  entryId: number;
  date: string;
  type: SavingsGoalEntryType;
  amount: number;
  note?: string;
}) {
  const existingDetail = await getSavingsGoalDetail(input.goalId);

  if (!existingDetail) {
    return null;
  }

  assertGoalEntryMutationsAllowed(existingDetail.goal);

  const existingEntry = existingDetail.entries.find(
    (entry) => entry.id === input.entryId
  );
  if (!existingEntry) {
    return null;
  }

  const normalizedAmount =
    input.type === "adjustment" ? input.amount : Math.abs(input.amount);
  const nextEntries = existingDetail.entries.map((entry) =>
    entry.id === input.entryId
      ? {
          ...entry,
          date: input.date,
          type: input.type,
          amount: normalizedAmount,
          note: input.note?.trim() || undefined,
        }
      : entry
  );

  validateGoalBalanceAfterMutation(
    existingDetail.goal,
    nextEntries,
    "รายการที่แก้ไขจะทำให้ยอดสะสมติดลบ"
  );

  await db
    .update(savingsGoalEntries)
    .set({
      entryDate: input.date,
      entryType: input.type,
      amountSatang: toSatang(normalizedAmount),
      note: input.note?.trim() || null,
    })
    .where(
      and(
        eq(savingsGoalEntries.id, input.entryId),
        eq(savingsGoalEntries.savingsGoalId, input.goalId)
      )
    );

  return getSavingsGoalDetail(input.goalId);
}

export async function deleteSavingsGoalEntry(input: {
  goalId: number;
  entryId: number;
}) {
  const existingDetail = await getSavingsGoalDetail(input.goalId);

  if (!existingDetail) {
    return null;
  }

  assertGoalEntryMutationsAllowed(existingDetail.goal);

  const existingEntry = existingDetail.entries.find(
    (entry) => entry.id === input.entryId
  );
  if (!existingEntry) {
    return null;
  }

  const nextEntries = existingDetail.entries.filter(
    (entry) => entry.id !== input.entryId
  );

  validateGoalBalanceAfterMutation(
    existingDetail.goal,
    nextEntries,
    "การลบรายการนี้จะทำให้ยอดสะสมติดลบ"
  );

  await db
    .delete(savingsGoalEntries)
    .where(
      and(
        eq(savingsGoalEntries.id, input.entryId),
        eq(savingsGoalEntries.savingsGoalId, input.goalId)
      )
    );

  return getSavingsGoalDetail(input.goalId);
}

export async function setSavingsGoalArchived(
  goalId: number,
  isArchived: boolean
) {
  const existingDetail = await getSavingsGoalDetail(goalId);

  if (!existingDetail) {
    return null;
  }

  await db
    .update(savingsGoals)
    .set({
      isArchived,
      updatedAt: new Date(),
    })
    .where(eq(savingsGoals.id, goalId));

  return getSavingsGoalDetail(goalId);
}

export async function deleteSavingsGoal(goalId: number) {
  const existingDetail = await getSavingsGoalDetail(goalId);

  if (!existingDetail) {
    return false;
  }

  await db.delete(savingsGoals).where(eq(savingsGoals.id, goalId));
  return true;
}
