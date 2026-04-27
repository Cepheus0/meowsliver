import type { MetricPacket } from "@/lib/metrics/types";
import type {
  AiChatMessage,
  AiContextPacket,
  DashboardAiContext,
} from "@/lib/ai/types";

export type DashboardAiLanguage = "th" | "en";

interface BuildDashboardAiContextInput {
  dashboardPacket: MetricPacket<unknown, unknown>;
  deterministicInsightPacket: MetricPacket<unknown, unknown>;
  anomalyPacket: MetricPacket<unknown, unknown>;
  transactionIntelligencePacket: MetricPacket<unknown, unknown>;
  accountHealthPacket: MetricPacket<unknown, unknown>;
  goalHealthPacket: MetricPacket<unknown, unknown>;
  importQualityPacket: MetricPacket<unknown, unknown>;
  generatedAt?: string;
}

const MAX_JSON_CHARS = 6500;
const MAX_ARRAY_ITEMS = 4;
const PRESERVED_ARRAY_KEYS = new Set(["currentWeekDailyExpenses"]);
const MAX_STRING_CHARS = 600;

type JsonObject = Record<string, unknown>;

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function compactPacket<TMetrics, TEvidence>(
  packet: MetricPacket<TMetrics, TEvidence>
): AiContextPacket<TMetrics, TEvidence> {
  return {
    scope: packet.scope,
    period: packet.period,
    metrics: packet.metrics,
    evidence: packet.evidence,
    coverage: packet.coverage,
    generatedAt: packet.generatedAt,
  };
}

function priorityScore(value: unknown) {
  if (!value || typeof value !== "object") {
    return 0;
  }

  const item = value as JsonObject;
  const riskLevel =
    typeof item.riskLevel === "string" ? item.riskLevel : undefined;
  const severity =
    typeof item.severity === "string" ? item.severity : undefined;
  const level = riskLevel ?? severity;

  switch (level) {
    case "critical":
    case "red":
      return 5;
    case "warning":
    case "amber":
      return 4;
    case "watch":
      return 3;
    case "info":
      return 2;
    case "green":
      return 1;
    default:
      return 0;
  }
}

function prioritizePromptArray(values: unknown[]) {
  if (values.length <= MAX_ARRAY_ITEMS) {
    return values;
  }

  const hasPrioritizedItems = values.some((value) => priorityScore(value) > 0);

  if (!hasPrioritizedItems) {
    return values;
  }

  return values
    .map((value, index) => ({ value, index, score: priorityScore(value) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((item) => item.value);
}

function compactPromptValue(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    if (key && PRESERVED_ARRAY_KEYS.has(key)) {
      return value.map((item) => compactPromptValue(item));
    }

    const prioritized = prioritizePromptArray(value);
    const items = prioritized
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => compactPromptValue(item));

    if (value.length <= MAX_ARRAY_ITEMS) {
      return items;
    }

    return {
      items,
      omittedCount: value.length - MAX_ARRAY_ITEMS,
      originalCount: value.length,
    };
  }

  if (typeof value === "string" && value.length > MAX_STRING_CHARS) {
    return `${value.slice(0, MAX_STRING_CHARS)}...TRUNCATED_STRING`;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonObject).map(([key, nestedValue]) => [
        key,
        compactPromptValue(nestedValue, key),
      ])
    );
  }

  return value;
}

function compactContextForPrompt(context: DashboardAiContext) {
  const packetEntries = Object.entries(context.packets);

  return {
    scope: context.scope,
    generatedAt: context.generatedAt,
    caveats: context.caveats,
    packets: Object.fromEntries(
      packetEntries.map(([key, packet]) => [
        key,
        {
          scope: packet.scope,
          period: packet.period,
          metrics: compactPromptValue(packet.metrics),
          coverage: {
            ...packet.coverage,
            generatedFrom: undefined,
          },
        },
      ])
    ),
    evidence: Object.fromEntries(
      packetEntries.map(([key, packet]) => [
        key,
        compactPromptValue(packet.evidence),
      ])
    ),
  };
}

export function buildDashboardAiContext({
  dashboardPacket,
  deterministicInsightPacket,
  anomalyPacket,
  transactionIntelligencePacket,
  accountHealthPacket,
  goalHealthPacket,
  importQualityPacket,
  generatedAt = new Date().toISOString(),
}: BuildDashboardAiContextInput): DashboardAiContext {
  const packets = {
    dashboard: compactPacket(dashboardPacket),
    deterministicInsights: compactPacket(deterministicInsightPacket),
    anomaly: compactPacket(anomalyPacket),
    transactionIntelligence: compactPacket(transactionIntelligencePacket),
    accounts: compactPacket(accountHealthPacket),
    goals: compactPacket(goalHealthPacket),
    imports: compactPacket(importQualityPacket),
  };

  return {
    scope: "dashboard",
    generatedAt,
    packets,
    caveats: unique(
      Object.values(packets).flatMap((packet) => packet.coverage.caveats)
    ),
  };
}

export function serializeDashboardAiContext(context: DashboardAiContext) {
  const serialized = JSON.stringify(compactContextForPrompt(context));

  if (serialized.length <= MAX_JSON_CHARS) {
    return serialized;
  }

  return `${serialized.slice(0, MAX_JSON_CHARS)}\n...TRUNCATED_FOR_TOKEN_BUDGET`;
}

export function buildDashboardAiSystemPrompt(
  language: DashboardAiLanguage = "th"
) {
  if (language === "en") {
    return [
      "You are the Meowsliver CFO Copilot for a personal finance dashboard.",
      "",
      "Rules:",
      "1. Use numbers from METRIC_CONTEXT only. Never invent or estimate missing values.",
      "2. Reply in concise, practical English.",
      "3. Keep the answer decision-oriented: explain what matters, why, and what to do next.",
      "4. If caveats materially affect trust, say so clearly.",
      "5. Use clean Markdown with short sections and bullets.",
      "6. Do not give definitive investment advice because holdings and market coverage are incomplete.",
      "7. If the schema cannot answer something, say that directly and name the missing data.",
      "8. When source labels are Thai transaction tags or categories, keep the original labels instead of mistranslating them.",
    ].join("\n");
  }

  return [
    "คุณคือ Meowsliver CFO Copilot สำหรับ dashboard การเงินส่วนบุคคล",
    "",
    "กฎสำคัญ:",
    "1. ใช้ตัวเลขจาก METRIC_CONTEXT เท่านั้น ห้ามเดาตัวเลขหรือสร้างตัวเลขใหม่",
    "2. ตอบแบบกระชับ ตรงประเด็น และ actionable",
    "3. ถ้ามี caveat ที่กระทบความน่าเชื่อถือ ให้บอกตรง ๆ แบบสั้นและชัด",
    "4. ใช้ Markdown ที่อ่านง่าย มีหัวข้อสั้น และ bullet ที่สแกนได้เร็ว",
    "5. ห้ามให้คำแนะนำการลงทุนแบบฟันธง เพราะ holdings และ market data ยังไม่ครบ",
    "6. ถ้าคำถามต้องใช้ข้อมูลที่ยังไม่มี ให้บอกว่า schema ปัจจุบันยังตอบไม่ได้ และแนะนำว่าต้องเพิ่มข้อมูลอะไร",
  ].join("\n");
}

export function buildDashboardInsightUserPrompt(
  context: DashboardAiContext,
  language: DashboardAiLanguage = "th"
) {
  if (language === "en") {
    return [
      "Create a dashboard summary from the METRIC_CONTEXT below.",
      "",
      "Return simple Markdown with this exact structure:",
      "",
      "## Snapshot",
      "- **[key metric]** - what it means now",
      "- **[largest expense category]** - amount and share",
      "- **[top tag or spend pattern]** - why it matters",
      "",
      "## Cut First",
      "- 3 to 5 concrete spend-reduction ideas, starting with the biggest leverage",
      "",
      "## Watchouts",
      "- caveats, trust gaps, or blocked decisions that matter right now",
      "",
      "Keep it compact. Use only facts from the context.",
      "",
      "METRIC_CONTEXT:",
      serializeDashboardAiContext(context),
    ].join("\n");
  }

  return [
    "สร้าง dashboard summary จาก METRIC_CONTEXT ต่อไปนี้",
    "",
    "ตอบเป็น Markdown ตามโครงนี้เท่านั้น:",
    "",
    "## ภาพรวมตอนนี้",
    "- **[ตัวเลขสำคัญ]** - ความหมายของสถานะตอนนี้",
    "- **[หมวดที่ใช้เยอะสุด]** - จำนวนเงินและสัดส่วน",
    "- **[tag หรือ pattern ที่เด่น]** - ทำไมต้องสนใจ",
    "",
    "## ควรตัดรายจ่ายจากอะไรก่อน",
    "- ให้ 3 ถึง 5 ข้อ เรียงจากจุดที่ลดแล้ว impact มากสุด",
    "",
    "## ข้อควรระวัง",
    "- caveat หรือข้อจำกัดของข้อมูลที่กระทบการตัดสินใจตอนนี้",
    "",
    "เขียนให้กระชับ ใช้เฉพาะข้อเท็จจริงจาก context",
    "",
    "METRIC_CONTEXT:",
    serializeDashboardAiContext(context),
  ].join("\n");
}

export function buildDashboardChatMessages(
  context: DashboardAiContext,
  messages: AiChatMessage[],
  language: DashboardAiLanguage = "th"
) {
  const recentMessages = messages.slice(-8);

  return [
    {
      role: "system" as const,
      content: buildDashboardAiSystemPrompt(language),
    },
    {
      role: "user" as const,
      content: [
        "METRIC_CONTEXT:",
        serializeDashboardAiContext(context),
        "",
        language === "en"
          ? "Answer the following conversation using METRIC_CONTEXT only."
          : "ตอบคำถามต่อไปนี้โดยยึด METRIC_CONTEXT เท่านั้น",
      ].join("\n"),
    },
    ...recentMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}
