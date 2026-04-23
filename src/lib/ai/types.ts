import type { MetricCoverage } from "@/lib/metrics/types";

export type AiChatRole = "user" | "assistant";

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
}

export interface AiContextPacket<TMetrics = unknown, TEvidence = unknown> {
  scope: string;
  period?: string;
  metrics: TMetrics;
  evidence?: TEvidence;
  coverage: MetricCoverage;
  generatedAt: string;
}

export interface DashboardAiContext {
  scope: "dashboard";
  generatedAt: string;
  packets: {
    dashboard: AiContextPacket;
    deterministicInsights: AiContextPacket;
    anomaly: AiContextPacket;
    accounts: AiContextPacket;
    goals: AiContextPacket;
    imports: AiContextPacket;
  };
  caveats: string[];
}
