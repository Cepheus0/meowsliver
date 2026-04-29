import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import type { TransactionType } from "@/lib/types";
import {
  databaseUnavailableResponseBody,
  isDatabaseUnavailableError,
} from "@/lib/server/db-errors";
import { dbTransactionToUiTransaction } from "@/lib/server/import-db";
import { createManualTransaction } from "@/lib/server/transactions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(transactions)
      .orderBy(
        desc(transactions.transactionDate),
        desc(transactions.transactionTime),
        desc(transactions.id)
      );

    return NextResponse.json({
      transactions: rows.map(dbTransactionToUiTransaction),
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      console.warn("Transactions are unavailable because the database is not ready.");
      return NextResponse.json(databaseUnavailableResponseBody(), { status: 503 });
    }

    console.warn("Failed to load transactions.");
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายการจากฐานข้อมูลได้" },
      { status: 500 }
    );
  }
}

function isTransactionType(value: unknown): value is TransactionType {
  return value === "income" || value === "expense" || value === "transfer";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (!isTransactionType(body.type)) {
      return NextResponse.json(
        { error: "ประเภทรายการไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const transaction = await createManualTransaction({
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

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถบันทึกรายการได้";
    const status =
      message === "ไม่พบบัญชีที่ต้องการใช้งาน" ||
      message === "กรุณาระบุวันที่ให้ถูกต้อง" ||
      message === "กรุณาระบุจำนวนเงินที่มากกว่า 0" ||
      message === "ประเภทรายการไม่ถูกต้อง" ||
      message === "กรุณาระบุเวลาเป็นรูปแบบ HH:MM"
        ? 400
        : 500;

    console.error("Failed to create manual transaction", error);
    return NextResponse.json({ error: message }, { status });
  }
}
