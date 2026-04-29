import { NextResponse } from "next/server";
import {
  buildDashboardAiSystemPrompt,
  buildDashboardInsightUserPrompt,
  type DashboardAiLanguage,
} from "@/lib/ai/dashboard-context";
import { getDashboardAiContext } from "@/lib/server/ai-context";
import { createAiChatCompletion } from "@/lib/server/ai-provider";
import { isDatabaseUnavailableError } from "@/lib/server/db-errors";

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

function resolveLanguage(value: string | null): DashboardAiLanguage {
  return value === "en" ? "en" : "th";
}

function resolveAiErrorMessage(msg: string): string {
  if (isDatabaseUnavailableError(new Error(msg)))
    return "ยังเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาเปิด PostgreSQL แล้วลองใหม่";
  if (msg.includes("codex_cli_not_installed"))
    return "ยังไม่ได้ติดตั้ง Codex CLI กรุณารัน: npm install -g @openai/codex && codex login";
  if (msg.includes("codex_cli_not_authenticated"))
    return "Codex CLI ยังไม่ได้ login กรุณารัน: codex login";
  if (msg.includes("codex_cli_usage_limit"))
    return "Codex ถึงขีดจำกัดการใช้งาน กรุณาตรวจสอบ ChatGPT/Codex plan";
  if (msg.includes("codex_cli_timeout"))
    return "Codex CLI timeout กรุณาลองใหม่หรือเพิ่ม CODEX_CLI_TIMEOUT_MS";
  return "AI provider ยังไม่พร้อมใช้งาน กรุณาตรวจสอบการตั้งค่า";
}

function errorStatus(error: Error) {
  if (error.message === "invalid_year" || error.message === "invalid_date") {
    return 400;
  }

  if (
    isDatabaseUnavailableError(error) ||
    error.message.startsWith("lm_studio_") ||
    error.message.startsWith("ai_") ||
    error.message.startsWith("codex_cli_") ||
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
    const language = resolveLanguage(url.searchParams.get("language"));
    const context = await getDashboardAiContext({ year, date });
    const completion = await createAiChatCompletion({
      messages: [
        { role: "system", content: buildDashboardAiSystemPrompt(language) },
        { role: "user", content: buildDashboardInsightUserPrompt(context, language) },
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
    const resolvedStatus = errorStatus(
      error instanceof Error ? error : new Error(message)
    );
    console.warn("[AI insights] unavailable:", resolveAiErrorMessage(message));

    return NextResponse.json(
      {
        error:
          resolvedStatus === 503
            ? resolveAiErrorMessage(message)
            : "ไม่สามารถสร้าง dashboard AI insight ได้",
        detail: resolvedStatus === 503 ? "provider_unavailable" : undefined,
      },
      { status: resolvedStatus }
    );
  }
}
