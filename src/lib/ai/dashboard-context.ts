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

const MAX_JSON_CHARS = 22000;

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
  const serialized = JSON.stringify(context, null, 2);

  if (serialized.length <= MAX_JSON_CHARS) {
    return serialized;
  }

  return `${serialized.slice(0, MAX_JSON_CHARS)}\n...TRUNCATED_FOR_TOKEN_BUDGET`;
}

export function buildDashboardAiSystemPrompt() {
  return [
    "คุณคือ Meowsliver CFO Copilot สำหรับ dashboard การเงินส่วนบุคคลภาษาไทย",
    "กฎสำคัญ:",
    "1. ใช้ตัวเลขจาก METRIC_CONTEXT เท่านั้น ห้ามเดาตัวเลขหรือสร้างตัวเลขใหม่",
    "2. ถ้าข้อมูลมี caveat ให้พูด caveat แบบกระชับและตรงไปตรงมา",
    "3. ตอบเป็นภาษาไทยที่ชัดเจน เหมาะกับผู้ใช้ที่ต้องตัดสินใจเร็ว",
    "4. แยก Highlights / Risks / Next Actions เมื่อผู้ใช้ถามเชิงสรุปหรือวางแผน",
    "5. ห้ามให้คำแนะนำการลงทุนแบบฟันธง เพราะ holdings และ market data ยังไม่ครบ",
    "6. ถ้าคำถามต้องใช้ข้อมูลที่ยังไม่มี ให้บอกว่า current schema ยังตอบไม่ได้ และแนะนำข้อมูลที่ต้องเพิ่ม",
  ].join("\n");
}

export function buildDashboardInsightUserPrompt(context: DashboardAiContext) {
  return [
    "สร้าง dashboard insight summary จาก METRIC_CONTEXT ต่อไปนี้",
    "",
    "รูปแบบคำตอบ:",
    "Highlights: 2-3 bullet",
    "Risks: 1-2 bullet",
    "Next Actions: 2-3 bullet",
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
