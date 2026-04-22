export type InsightSurface =
  | "dashboard"
  | "transactions"
  | "reports"
  | "accounts"
  | "goals"
  | "import";

export type InsightType =
  | "anomaly"
  | "trend"
  | "coverage"
  | "risk"
  | "opportunity";

export type InsightSeverity = "info" | "watch" | "warning" | "critical";

export interface InsightCandidate {
  id: string;
  surface: InsightSurface;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  summary: string;
  evidence: Array<{
    label: string;
    value: string;
  }>;
}
