import { NextResponse } from "next/server";
import { getTransactionPeriodComparisonMetricPacket } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

function resolveMonth(value: string | null, fieldName: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    throw new Error(fieldName);
  }

  return value;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const from = resolveMonth(url.searchParams.get("from"), "invalid_from");
    const to = resolveMonth(url.searchParams.get("to"), "invalid_to");
    const packet = await getTransactionPeriodComparisonMetricPacket(from, to);

    return NextResponse.json({ packet });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "invalid_from" || error.message === "invalid_to")
    ) {
      return NextResponse.json(
        { error: "ช่วงเดือนต้องอยู่ในรูปแบบ YYYY-MM" },
        { status: 400 }
      );
    }

    console.error("Failed to build transaction comparison metrics", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง transaction comparison metrics ได้" },
      { status: 500 }
    );
  }
}
