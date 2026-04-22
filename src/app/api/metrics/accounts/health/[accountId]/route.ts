import { NextResponse } from "next/server";
import { getAccountHealthDetailMetricPacket } from "@/lib/server/metrics";

export const dynamic = "force-dynamic";

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await context.params;
    const id = parseId(accountId);

    if (!id) {
      return NextResponse.json({ error: "invalid account id" }, { status: 400 });
    }

    const packet = await getAccountHealthDetailMetricPacket(id);
    if (!packet) {
      return NextResponse.json({ error: "ไม่พบบัญชีนี้" }, { status: 404 });
    }

    return NextResponse.json({ packet });
  } catch (error) {
    console.error("Failed to build account health detail metrics", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้าง account health detail metrics ได้" },
      { status: 500 }
    );
  }
}
