import { NextResponse } from "next/server";
import { getAccountHealthMetricPacket } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const packet = await getAccountHealthMetricPacket();
    return NextResponse.json({ packet });
  } catch (error) {
    console.error("Failed to build account health metrics", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง account health metrics ได้" },
      { status: 500 }
    );
  }
}
