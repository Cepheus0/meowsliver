import { NextResponse } from "next/server";
import { getImportQualityMetricPacket } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

function resolveLimit(value: string | null) {
  if (!value) {
    return 10;
  }

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("invalid_limit");
  }

  return limit;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = resolveLimit(url.searchParams.get("limit"));
    const packet = await getImportQualityMetricPacket(limit);

    return NextResponse.json({ packet });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_limit") {
      return NextResponse.json(
        { error: "limit ต้องอยู่ระหว่าง 1-50" },
        { status: 400 }
      );
    }

    console.error("Failed to build import quality metrics", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง import quality metrics ได้" },
      { status: 500 }
    );
  }
}
