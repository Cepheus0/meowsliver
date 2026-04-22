import { NextResponse } from "next/server";
import { getGoalHealthDetailMetricPacket } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await context.params;
    const id = parseId(goalId);

    if (!id) {
      return NextResponse.json({ error: "invalid goal id" }, { status: 400 });
    }

    const packet = await getGoalHealthDetailMetricPacket(id);
    if (!packet) {
      return NextResponse.json(
        { error: "ไม่พบเป้าหมายการออมนี้" },
        { status: 404 }
      );
    }

    return NextResponse.json({ packet });
  } catch (error) {
    console.error("Failed to build goal health detail metrics", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง goal health detail metrics ได้" },
      { status: 500 }
    );
  }
}
