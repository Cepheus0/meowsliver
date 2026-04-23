import { buildDashboardAiContext } from "@/lib/ai/dashboard-context";
import { buildDashboardInsightPacket } from "@/lib/insights/dashboard";
import { getDashboardMetricPacket } from "@/lib/server/dashboard-metrics";
import {
  getAccountHealthMetricPacket,
  getGoalHealthMetricPacket,
  getImportQualityMetricPacket,
  getTodayAnomalyMetricPacket,
} from "@/lib/server/metrics";

export async function getDashboardAiContext(input: {
  year: number;
  date?: string;
}) {
  const [
    dashboardPacket,
    anomalyPacket,
    accountHealthPacket,
    goalHealthPacket,
    importQualityPacket,
  ] = await Promise.all([
    getDashboardMetricPacket(input.year),
    getTodayAnomalyMetricPacket(input.date),
    getAccountHealthMetricPacket(),
    getGoalHealthMetricPacket(),
    getImportQualityMetricPacket(),
  ]);
  const deterministicInsightPacket = buildDashboardInsightPacket({
    anomalyPacket,
    accountHealthPacket,
    goalHealthPacket,
    importQualityPacket,
  });

  return buildDashboardAiContext({
    dashboardPacket,
    deterministicInsightPacket,
    anomalyPacket,
    accountHealthPacket,
    goalHealthPacket,
    importQualityPacket,
  });
}
