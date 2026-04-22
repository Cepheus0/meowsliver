import { NextResponse } from "next/server";
import { getGoalHealthMetricPacket } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const packet = await getGoalHealthMetricPacket();
    return NextResponse.json({ packet });
  } catch (error) {
    console.error("Failed to build goal metrics", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง goal metrics ได้" },
      { status: 500 }
    );
  }
}
