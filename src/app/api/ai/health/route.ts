import { NextResponse } from "next/server";
import { getLmStudioHealth } from "@/lib/server/lm-studio";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getLmStudioHealth();
  return NextResponse.json({ health });
}
