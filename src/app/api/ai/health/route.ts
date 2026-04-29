import { NextResponse } from "next/server";
import { getAiHealth } from "@/lib/server/ai-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getAiHealth();
  return NextResponse.json({ health });
}
