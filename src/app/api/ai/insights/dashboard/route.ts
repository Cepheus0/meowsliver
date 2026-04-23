import { NextResponse } from "next/server";
import {
  buildDashboardAiSystemPrompt,
  buildDashboardInsightUserPrompt,
} from "@/lib/ai/dashboard-context";
import { getDashboardAiContext } from "@/lib/server/ai-context";
import { createLmStudioChatCompletion } from "@/lib/server/lm-studio";

export const dynamic = "force-dynamic";

function resolveYear(value: string | null) {
  if (!value) {
    return new Date().getFullYear();
  }

  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new Error("invalid_year");
  }

  return year;
}

function resolveDate(value: string | null) {
  if (!value) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("invalid_date");
  }

  return value;
}

function errorStatus(error: Error) {
  if (error.message === "invalid_year" || error.message === "invalid_date") {
    return 400;
  }

  if (
    error.message.startsWith("lm_studio_") ||
    error.name === "AbortError"
  ) {
    return 503;
  }

  return 500;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const year = resolveYear(url.searchParams.get("year"));
    const date = resolveDate(url.searchParams.get("date"));
    const context = await getDashboardAiContext({ year, date });
    const completion = await createLmStudioChatCompletion({
      messages: [
        { role: "system", content: buildDashboardAiSystemPrompt() },
        { role: "user", content: buildDashboardInsightUserPrompt(context) },
      ],
      maxTokens: 200,
      temperature: 0.1,
    });

    return NextResponse.json({
      insight: completion.content,
      model: completion.model,
      context: {
        generatedAt: context.generatedAt,
        caveats: context.caveats,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถสร้าง dashboard AI insight ได้";
    console.error("Dashboard AI insight failed", error);

    return NextResponse.json(
      {
        error:
          errorStatus(error instanceof Error ? error : new Error(message)) === 503
            ? "LM Studio ยังไม่พร้อมใช้งาน กรุณาเปิด Local Server และโหลด model ก่อน"
            : "ไม่สามารถสร้าง dashboard AI insight ได้",
        detail: message,
      },
      { status: errorStatus(error instanceof Error ? error : new Error(message)) }
    );
  }
}
