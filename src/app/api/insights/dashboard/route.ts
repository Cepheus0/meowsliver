import { NextResponse } from "next/server";
import {
  databaseUnavailableResponseBody,
  isDatabaseUnavailableError,
} from "@/lib/server/db-errors";
import { getDashboardInsightPacket } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

function resolveDate(value: string | null) {
  if (!value) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("invalid_date");
  }

  return value;
}

function resolveLanguage(value: string | null): "th" | "en" {
  return value === "en" ? "en" : "th";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = resolveDate(url.searchParams.get("date"));
    const language = resolveLanguage(url.searchParams.get("language"));
    const packet = await getDashboardInsightPacket({ date, language });

    return NextResponse.json({ packet });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_date") {
      return NextResponse.json(
        { error: "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (isDatabaseUnavailableError(error)) {
      console.warn("Dashboard insights are unavailable because the database is not ready.");
      return NextResponse.json(databaseUnavailableResponseBody(), { status: 503 });
    }

    console.warn("Failed to build dashboard insights.");
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง dashboard insights ได้" },
      { status: 500 }
    );
  }
}
