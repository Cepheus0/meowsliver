import { NextResponse } from "next/server";
import { GOAL_CATEGORY_LABELS } from "@/lib/savings-goals";
import {
  deleteSavingsGoal,
  getSavingsGoalDetail,
  setSavingsGoalArchived,
  updateSavingsGoal,
} from "@/lib/server/savings-goals";
import type { SavingsGoalCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

function isSavingsGoalCategory(value: unknown): value is SavingsGoalCategory {
  return typeof value === "string" && value in GOAL_CATEGORY_LABELS;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ goalId: string }> }
) {
  const { goalId } = await context.params;
  const parsedGoalId = Number(goalId);

  if (!Number.isInteger(parsedGoalId) || parsedGoalId <= 0) {
    return NextResponse.json(
      { error: "รหัสเป้าหมายไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  try {
    const detail = await getSavingsGoalDetail(parsedGoalId);

    if (!detail) {
      return NextResponse.json(
        { error: "ไม่พบเป้าหมายการออมนี้" },
        { status: 404 }
      );
    }

    return NextResponse.json({ detail });
  } catch (error) {
    console.error("Failed to load savings goal detail", error);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายละเอียดเป้าหมายได้" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ goalId: string }> }
) {
  const { goalId } = await context.params;
  const parsedGoalId = Number(goalId);

  if (!Number.isInteger(parsedGoalId) || parsedGoalId <= 0) {
    return NextResponse.json(
      { error: "รหัสเป้าหมายไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const lifecyclePatch =
      typeof body.isArchived === "boolean" && Object.keys(body).length === 1;

    if (lifecyclePatch) {
      const detail = await setSavingsGoalArchived(
        parsedGoalId,
        body.isArchived === true
      );

      if (!detail) {
        return NextResponse.json(
          { error: "ไม่พบเป้าหมายการออมนี้" },
          { status: 404 }
        );
      }

      return NextResponse.json({ detail });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const targetAmount = Number(body.targetAmount);

    if (!name) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อเป้าหมาย" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return NextResponse.json(
        { error: "กรุณาระบุจำนวนเงินเป้าหมายให้มากกว่า 0" },
        { status: 400 }
      );
    }

    const detail = await updateSavingsGoal({
      goalId: parsedGoalId,
      name,
      category: isSavingsGoalCategory(body.category) ? body.category : "custom",
      targetAmount,
      targetDate:
        typeof body.targetDate === "string" && body.targetDate
          ? body.targetDate
          : undefined,
      strategyLabel:
        typeof body.strategyLabel === "string" ? body.strategyLabel : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      icon: typeof body.icon === "string" ? body.icon : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
    });

    if (!detail) {
      return NextResponse.json(
        { error: "ไม่พบเป้าหมายการออมนี้" },
        { status: 404 }
      );
    }

    return NextResponse.json({ detail });
  } catch (error) {
    console.error("Failed to update savings goal detail", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตเป้าหมายการออมได้" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ goalId: string }> }
) {
  const { goalId } = await context.params;
  const parsedGoalId = Number(goalId);

  if (!Number.isInteger(parsedGoalId) || parsedGoalId <= 0) {
    return NextResponse.json(
      { error: "รหัสเป้าหมายไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteSavingsGoal(parsedGoalId);

    if (!deleted) {
      return NextResponse.json(
        { error: "ไม่พบเป้าหมายการออมนี้" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete savings goal", error);
    return NextResponse.json(
      { error: "ไม่สามารถลบเป้าหมายการออมได้" },
      { status: 500 }
    );
  }
}
