import type { MetricPacket } from "@/lib/metrics/types";
import type {
  AiChatMessage,
  AiContextPacket,
  DashboardAiContext,
} from "@/lib/ai/types";

interface BuildDashboardAiContextInput {
  dashboardPacket: MetricPacket<unknown, unknown>;
  deterministicInsightPacket: MetricPacket<unknown, unknown>;
  anomalyPacket: MetricPacket<unknown, unknown>;
  accountHealthPacket: MetricPacket<unknown, unknown>;
  goalHealthPacket: MetricPacket<unknown, unknown>;
  importQualityPacket: MetricPacket<unknown, unknown>;
  generatedAt?: string;
}

const MAX_JSON_CHARS = 4200;
const MAX_ARRAY_ITEMS = 4;
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

function compactPromptValue(value: unknown): unknown {
  if (Array.isArray(value)) {
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
        compactPromptValue(nestedValue),
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
  accountHealthPacket,
  goalHealthPacket,
  importQualityPacket,
  generatedAt = new Date().toISOString(),
}: BuildDashboardAiContextInput): DashboardAiContext {
  const packets = {
    dashboard: compactPacket(dashboardPacket),
    deterministicInsights: compactPacket(deterministicInsightPacket),
    anomaly: compactPacket(anomalyPacket),
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

export function buildDashboardAiSystemPrompt() {
  return [
    "คุณคือ Meowsliver CFO Copilot สำหรับ dashboard การเงินส่วนบุคคลภาษาไทย",
    "",
    "กฎสำคัญ:",
    "1. ใช้ตัวเลขจาก METRIC_CONTEXT เท่านั้น ห้ามเดาตัวเลขหรือสร้างตัวเลขใหม่",
    "2. ตอบแบบ CONCISE และ ACTIONABLE เท่านั้น ไม่ต้องอธิบายยาว",
    "3. ถ้าข้อมูลมี caveat ให้พูด caveat แบบกระชับและตรงไปตรงมา",
    "4. ตอบเป็นภาษาไทยที่ชัดเจน เหมาะกับผู้ใช้ที่ต้องตัดสินใจเร็ว",
    "5. ใช้ Markdown format เพื่อให้ output อ่านง่ายและเป็นระเบียบ",
    "6. ห้ามให้คำแนะนำการลงทุนแบบฟันธง เพราะ holdings และ market data ยังไม่ครบ",
    "7. ถ้าคำถามต้องใช้ข้อมูลที่ยังไม่มี ให้บอกว่า current schema ยังตอบไม่ได้ และแนะนำข้อมูลที่ต้องเพิ่ม",
  ].join("\n");
}

export function buildDashboardInsightUserPrompt(context: DashboardAiContext) {
  return [
    "สร้าง dashboard insight summary จาก METRIC_CONTEXT ต่อไปนี้",
    "",
    "ตอบแบบ Markdown ที่เรียบง่าย (STRICT):",
    "",
    "## สรุปที่สำคัญ",
    "* **[ตัวเลข/สำคัญที่สุด]** - สำคัญหรือกิจกรรม",
    "* **[ตัวเลข/สำคัญรองลงมา]** - สำคัญหรือกิจกรรม",
    "",
    "## ความเสี่ยง (ถ้ามี)",
    "* **[ความเสี่ยง]** - คำอธิบายหรือคำแนะนำ",
    "",
    "## ขั้นตอนไป",
    "* **[ขั้นตอน]** - กิจกรรมที่ต้องทำตอไป",
    "",
    "เขียนให้กระชับ ไม่ต้องอธิบายยาว ใช้ตัวเลขและข้อเท็จจริงเท่านั้น",
    "",
    "METRIC_CONTEXT:",
    serializeDashboardAiContext(context),
  ].join("\n");
}

export function buildDashboardChatMessages(
  context: DashboardAiContext,
  messages: AiChatMessage[]
) {
  const recentMessages = messages.slice(-8);

  return [
    {
      role: "system" as const,
      content: buildDashboardAiSystemPrompt(),
    },
    {
      role: "user" as const,
      content: [
        "METRIC_CONTEXT:",
        serializeDashboardAiContext(context),
        "",
        "ตอบคำถามต่อไปนี้โดยยึด METRIC_CONTEXT เท่านั้น",
      ].join("\n"),
    },
    ...recentMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}
