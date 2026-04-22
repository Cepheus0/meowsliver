import { NextResponse } from "next/server";
import { getTodayAnomalyMetricPacket } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

function resolveDate(value: string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("invalid_date");
  }

  return value;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = resolveDate(url.searchParams.get("date"));
    const packet = await getTodayAnomalyMetricPacket(date);

    return NextResponse.json({ packet });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_date") {
      return NextResponse.json(
        { error: "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD" },
        { status: 400 }
      );
    }

    console.error("Failed to build anomaly metrics", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง anomaly metrics ได้" },
      { status: 500 }
    );
  }
}
