import { NextResponse } from "next/server";
import type { TransactionType } from "@/lib/types";
import {
  deleteManualTransaction,
  updateManualTransaction,
} from "@/lib/server/transactions";

export const dynamic = "force-dynamic";

function isTransactionType(value: unknown): value is TransactionType {
  return value === "income" || value === "expense" || value === "transfer";
}

function mutationErrorStatus(message: string) {
  return message === "ไม่พบบัญชีที่ต้องการใช้งาน" ||
    message === "กรุณาระบุวันที่ให้ถูกต้อง" ||
    message === "กรุณาระบุจำนวนเงินที่มากกว่า 0" ||
    message === "ประเภทรายการไม่ถูกต้อง" ||
    message === "กรุณาระบุเวลาเป็นรูปแบบ HH:MM" ||
    message === "สามารถแก้ไขหรือลบได้เฉพาะรายการที่บันทึกด้วยตนเอง"
    ? 400
    : message === "ไม่พบรายการนี้"
      ? 404
      : 500;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    if (!isTransactionType(body.type)) {
      return NextResponse.json(
        { error: "ประเภทรายการไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const transaction = await updateManualTransaction(transactionId, {
      date: typeof body.date === "string" ? body.date : "",
      time: typeof body.time === "string" ? body.time : undefined,
      amount: Number(body.amount),
      type: body.type,
      category: typeof body.category === "string" ? body.category : undefined,
      note: typeof body.note === "string" ? body.note : undefined,
      paymentChannel:
        typeof body.paymentChannel === "string" ? body.paymentChannel : undefined,
      payFrom: typeof body.payFrom === "string" ? body.payFrom : undefined,
      recipient: typeof body.recipient === "string" ? body.recipient : undefined,
      tag: typeof body.tag === "string" ? body.tag : undefined,
      accountId:
        body.accountId === null
          ? null
          : body.accountId != null && body.accountId !== ""
            ? Number(body.accountId)
            : null,
    });

    if (!transaction) {
      return NextResponse.json({ error: "ไม่พบรายการนี้" }, { status: 404 });
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถอัปเดตรายการได้";
    console.error("Failed to update manual transaction", error);
    return NextResponse.json(
      { error: message },
      { status: mutationErrorStatus(message) }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await context.params;
    const transaction = await deleteManualTransaction(transactionId);

    if (!transaction) {
      return NextResponse.json({ error: "ไม่พบรายการนี้" }, { status: 404 });
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถลบรายการได้";
    console.error("Failed to delete manual transaction", error);
    return NextResponse.json(
      { error: message },
      { status: mutationErrorStatus(message) }
    );
  }
}
