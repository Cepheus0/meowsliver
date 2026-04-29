import { NextResponse } from "next/server";
import { GOAL_CATEGORY_LABELS } from "@/lib/savings-goals";
import { createSavingsGoal, getSavingsGoalsPortfolio } from "@/lib/server/savings-goals";
import type { SavingsGoalCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

function isSavingsGoalCategory(value: unknown): value is SavingsGoalCategory {
  return typeof value === "string" && value in GOAL_CATEGORY_LABELS;
}

export async function GET() {
  try {
    const portfolio = await getSavingsGoalsPortfolio();
    return NextResponse.json(portfolio);
  } catch (error) {
    console.warn("Failed to load savings goals", error);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดเป้าหมายการออมได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const targetAmount = Number(body.targetAmount);
    const initialAmount = body.initialAmount === undefined ? 0 : Number(body.initialAmount);

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

    if (!Number.isFinite(initialAmount) || initialAmount < 0) {
      return NextResponse.json(
        { error: "ยอดตั้งต้นต้องเป็นตัวเลขที่ไม่ติดลบ" },
        { status: 400 }
      );
    }

    const detail = await createSavingsGoal({
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
      initialAmount,
      initialDate:
        typeof body.initialDate === "string" && body.initialDate
          ? body.initialDate
          : undefined,
    });

    return NextResponse.json({ detail }, { status: 201 });
  } catch (error) {
    console.error("Failed to create savings goal", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างเป้าหมายการออมได้" },
      { status: 500 }
    );
  }
}
