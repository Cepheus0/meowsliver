import { NextResponse } from "next/server";
import {
  buildDashboardChatMessages,
  serializeDashboardAiContext,
} from "@/lib/ai/dashboard-context";
import type { AiChatMessage } from "@/lib/ai/types";
import { getDashboardAiContext } from "@/lib/server/ai-context";
import { createLmStudioChatCompletion } from "@/lib/server/lm-studio";

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

function errorStatus(error: Error) {
  if (
    error.message === "invalid_year" ||
    error.message === "invalid_date" ||
    error.message === "invalid_messages"
  ) {
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const year = resolveYear(body.year);
    const date = resolveDate(body.date);
    const messages = normalizeMessages(body.messages);
    const context = await getDashboardAiContext({ year, date });
    const completion = await createLmStudioChatCompletion({
      messages: buildDashboardChatMessages(context, messages),
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
    console.error("Dashboard AI chat failed", error);

    return NextResponse.json(
      {
        error:
          errorStatus(error instanceof Error ? error : new Error(message)) === 503
            ? "LM Studio ยังไม่พร้อมใช้งาน กรุณาเปิด Local Server และโหลด model ก่อน"
            : "ไม่สามารถเรียก AI chat ได้",
        detail: message,
      },
      { status: errorStatus(error instanceof Error ? error : new Error(message)) }
    );
  }
}
