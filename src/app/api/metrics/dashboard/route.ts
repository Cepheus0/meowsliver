import { NextResponse } from "next/server";
import { getDashboardMetricPacket } from "@/lib/server/dashboard-metrics";

export const dynamic = "force-dynamic";

function resolveYear(value: string | null) {
  if (!value) {
    return new Date().getFullYear();
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2200) {
    throw new Error("invalid_year");
  }

  return parsed;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const year = resolveYear(url.searchParams.get("year"));
    const packet = await getDashboardMetricPacket(year);

    return NextResponse.json({ packet });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_year") {
      return NextResponse.json(
        { error: "ปีที่เลือกไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    console.error("Failed to build dashboard metrics", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง dashboard metrics ได้" },
      { status: 500 }
    );
  }
}

