import { NextResponse } from "next/server";
import { reconcileAccountFromTransactions } from "@/lib/server/accounts";

export const dynamic = "force-dynamic";

function parseId(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const id = parseId(accountId);
    if (!id) {
      return NextResponse.json({ error: "invalid account id" }, { status: 400 });
    }

    const detail = await reconcileAccountFromTransactions(id);
    if (!detail) {
      return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 404 });
    }

    return NextResponse.json({ detail });
  } catch (error) {
    console.error("Failed to reconcile account", error);
    const message =
      error instanceof Error ? error.message : "ไม่สามารถ reconcile บัญชีได้";
    const status =
      message === "บัญชีนี้ยังไม่มีรายการที่เชื่อมไว้ให้ reconcile" ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
