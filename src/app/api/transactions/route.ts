import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { dbTransactionToUiTransaction } from "@/lib/server/import-db";

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
    console.error("Failed to load transactions", error);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายการจากฐานข้อมูลได้" },
      { status: 500 }
    );
  }
}
