import { NextResponse } from "next/server";
import { getDailyTransactionMetricPacket } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

function resolveDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("invalid_date");
  }

  return value;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = resolveDate(url.searchParams.get("date"));
    const packet = await getDailyTransactionMetricPacket(date);

    return NextResponse.json({ packet });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_date") {
      return NextResponse.json(
        { error: "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD" },
        { status: 400 }
      );
    }

    console.error("Failed to build daily transaction metrics", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง daily transaction metrics ได้" },
      { status: 500 }
    );
  }
}
