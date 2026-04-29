import { NextResponse } from "next/server";
import {
  buildDashboardChatMessages,
  serializeDashboardAiContext,
  type DashboardAiLanguage,
} from "@/lib/ai/dashboard-context";
import type { AiChatMessage } from "@/lib/ai/types";
import { getDashboardAiContext } from "@/lib/server/ai-context";
import { createAiChatCompletion } from "@/lib/server/ai-provider";
import { isDatabaseUnavailableError } from "@/lib/server/db-errors";

export const dynamic = "force-dynamic";

function resolveYear(value: unknown) {
  const year = value === undefined ? new Date().getFullYear() : Number(value);

  if (!Number.isInteger(year) || year < 2000 || year > 2200) {
    throw new Error("invalid_year");
  }

  return year;
}

function resolveDate(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("invalid_date");
  }

  return value;
}

function normalizeMessages(value: unknown): AiChatMessage[] {
  if (!Array.isArray(value)) {
    throw new Error("invalid_messages");
  }

  const messages = value
    .map((message) => {
      if (
        typeof message !== "object" ||
        message === null ||
        !("role" in message) ||
        !("content" in message)
      ) {
        return null;
      }

      const role = message.role;
      const content =
        typeof message.content === "string" ? message.content.trim() : "";

      if ((role !== "user" && role !== "assistant") || !content) {
        return null;
      }

      return { role, content };
    })
    .filter((message): message is AiChatMessage => message !== null);

  if (messages.length === 0 || messages.at(-1)?.role !== "user") {
    throw new Error("invalid_messages");
  }

  return messages;
}

function resolveLanguage(value: unknown): DashboardAiLanguage {
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
  if (
    error.message === "invalid_year" ||
    error.message === "invalid_date" ||
    error.message === "invalid_messages"
  ) {
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const year = resolveYear(body.year);
    const date = resolveDate(body.date);
    const messages = normalizeMessages(body.messages);
    const language = resolveLanguage(body.language);
    const context = await getDashboardAiContext({ year, date });
    const completion = await createAiChatCompletion({
      messages: buildDashboardChatMessages(context, messages, language),
      maxTokens: 150,
      temperature: 0.1,
    });

    return NextResponse.json({
      message: {
        role: "assistant",
        content: completion.content,
      },
      model: completion.model,
      context: {
        generatedAt: context.generatedAt,
        caveats: context.caveats,
        size: serializeDashboardAiContext(context).length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถเรียก AI chat ได้";
    const resolvedStatus = errorStatus(
      error instanceof Error ? error : new Error(message)
    );
    console.warn("[AI chat] unavailable:", resolveAiErrorMessage(message));

    return NextResponse.json(
      {
        error:
          resolvedStatus === 503
            ? resolveAiErrorMessage(message)
            : "ไม่สามารถเรียก AI chat ได้",
        detail: resolvedStatus === 503 ? "provider_unavailable" : undefined,
      },
      { status: resolvedStatus }
    );
  }
}
