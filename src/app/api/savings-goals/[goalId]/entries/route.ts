import { NextResponse } from "next/server";
import { ENTRY_TYPE_LABELS } from "@/lib/savings-goals";
import { addSavingsGoalEntry } from "@/lib/server/savings-goals";
import type { SavingsGoalEntryType } from "@/lib/types";

export const dynamic = "force-dynamic";

function isEntryType(value: unknown): value is SavingsGoalEntryType {
  return typeof value === "string" && value in ENTRY_TYPE_LABELS;
}

export async function POST(
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
    const amount = Number(body.amount);

    if (!isEntryType(body.type)) {
      return NextResponse.json(
        { error: "ประเภทการบันทึกไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json(
        { error: "กรุณาระบุจำนวนเงินที่ไม่เท่ากับ 0" },
        { status: 400 }
      );
    }

    if (typeof body.date !== "string" || !body.date) {
      return NextResponse.json(
        { error: "กรุณาระบุวันที่ของรายการ" },
        { status: 400 }
      );
    }

    const detail = await addSavingsGoalEntry({
      goalId: parsedGoalId,
      date: body.date,
      type: body.type,
      amount,
      note: typeof body.note === "string" ? body.note : undefined,
    });

    if (!detail) {
      return NextResponse.json(
        { error: "ไม่พบเป้าหมายการออมนี้" },
        { status: 404 }
      );
    }

    return NextResponse.json({ detail }, { status: 201 });
  } catch (error) {
    console.error("Failed to add savings goal entry", error);
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถบันทึกรายการให้เป้าหมายนี้ได้";
    const status =
      message === "รายการนี้จะทำให้ยอดสะสมติดลบ" ||
      message === "เป้าหมายนี้ถูก archive แล้ว แก้ไข movement เพิ่มไม่ได้"
        ? 400
        : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
