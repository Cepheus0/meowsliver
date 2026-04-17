import { NextResponse } from "next/server";
import { ENTRY_TYPE_LABELS } from "@/lib/savings-goals";
import {
  deleteSavingsGoalEntry,
  updateSavingsGoalEntry,
} from "@/lib/server/savings-goals";
import type { SavingsGoalEntryType } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isEntryType(value: unknown): value is SavingsGoalEntryType {
  return typeof value === "string" && value in ENTRY_TYPE_LABELS;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ goalId: string; entryId: string }> }
) {
  const { goalId, entryId } = await context.params;
  const parsedGoalId = parseId(goalId);
  const parsedEntryId = parseId(entryId);

  if (!parsedGoalId || !parsedEntryId) {
    return NextResponse.json(
      { error: "รหัสรายการไม่ถูกต้อง" },
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

    const detail = await updateSavingsGoalEntry({
      goalId: parsedGoalId,
      entryId: parsedEntryId,
      date: body.date,
      type: body.type,
      amount,
      note: typeof body.note === "string" ? body.note : undefined,
    });

    if (!detail) {
      return NextResponse.json(
        { error: "ไม่พบรายการของเป้าหมายนี้" },
        { status: 404 }
      );
    }

    return NextResponse.json({ detail });
  } catch (error) {
    console.error("Failed to update savings goal entry", error);
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถแก้ไขรายการของเป้าหมายนี้ได้";
    const status =
      message === "เป้าหมายนี้ถูก archive แล้ว แก้ไข movement เพิ่มไม่ได้" ||
      message === "รายการที่แก้ไขจะทำให้ยอดสะสมติดลบ"
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ goalId: string; entryId: string }> }
) {
  const { goalId, entryId } = await context.params;
  const parsedGoalId = parseId(goalId);
  const parsedEntryId = parseId(entryId);

  if (!parsedGoalId || !parsedEntryId) {
    return NextResponse.json(
      { error: "รหัสรายการไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  try {
    const detail = await deleteSavingsGoalEntry({
      goalId: parsedGoalId,
      entryId: parsedEntryId,
    });

    if (!detail) {
      return NextResponse.json(
        { error: "ไม่พบรายการของเป้าหมายนี้" },
        { status: 404 }
      );
    }

    return NextResponse.json({ detail });
  } catch (error) {
    console.error("Failed to delete savings goal entry", error);
    const message =
      error instanceof Error ? error.message : "ไม่สามารถลบรายการนี้ได้";
    const status =
      message === "เป้าหมายนี้ถูก archive แล้ว แก้ไข movement เพิ่มไม่ได้" ||
      message === "การลบรายการนี้จะทำให้ยอดสะสมติดลบ"
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
