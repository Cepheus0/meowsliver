import type { MetricPacket } from "@/lib/metrics/types";
import type {
  AccountHealthEvidence,
  AccountHealthMetrics,
} from "@/lib/metrics/accounts";
import type {
  GoalHealthEvidence,
  GoalHealthMetrics,
} from "@/lib/metrics/goals";
import type {
  ImportQualityEvidence,
  ImportQualityMetrics,
} from "@/lib/metrics/imports";
import type {
  TransactionAnomalyEvidence,
  TransactionAnomalyMetrics,
} from "@/lib/metrics/transactions";
import type { InsightCandidate, InsightSeverity } from "@/lib/insights/types";

interface BuildDashboardInsightPacketInput {
  anomalyPacket: MetricPacket<TransactionAnomalyMetrics, TransactionAnomalyEvidence>;
  accountHealthPacket: MetricPacket<AccountHealthMetrics, AccountHealthEvidence>;
  goalHealthPacket: MetricPacket<GoalHealthMetrics, GoalHealthEvidence>;
  importQualityPacket: MetricPacket<ImportQualityMetrics, ImportQualityEvidence>;
  generatedAt?: string;
}

export interface DashboardInsightMetrics {
  insightCount: number;
  criticalCount: number;
  warningCount: number;
  watchCount: number;
}

export interface DashboardInsightEvidence {
  insights: InsightCandidate[];
}

function formatBaht(value: number) {
  return `฿${Math.round(value).toLocaleString("th-TH")}`;
}

function formatPercent(value: number | null) {
  return value === null ? "n/a" : `${value.toLocaleString("th-TH")}%`;
}

function severityRank(severity: InsightSeverity) {
  const ranks: Record<InsightSeverity, number> = {
    info: 0,
    watch: 1,
    warning: 2,
    critical: 3,
  };

  return ranks[severity];
}

function anomalySeverity(
  level: TransactionAnomalyMetrics["anomalyLevel"]
): InsightSeverity {
  if (level === "critical") {
    return "critical";
  }

  if (level === "warning") {
    return "warning";
  }

  if (level === "watch") {
    return "watch";
  }

  return "info";
}

function buildTransactionAnomalyInsight(
  packet: MetricPacket<TransactionAnomalyMetrics, TransactionAnomalyEvidence>
): InsightCandidate | null {
  if (packet.metrics.anomalyLevel === "normal") {
    return null;
  }

  const topCategory = packet.evidence?.topExpenseCategories[0];

  return {
    id: `transaction-anomaly-${packet.metrics.date}`,
    surface: "dashboard",
    type: "anomaly",
    severity: anomalySeverity(packet.metrics.anomalyLevel),
    title: "พบสัญญาณใช้จ่ายผิดปกติ",
    summary: topCategory
      ? `วันนี้มีรายจ่าย ${formatBaht(packet.metrics.expenseTotal)} โดย driver หลักคือ ${topCategory.name}`
      : `วันนี้มีรายจ่าย ${formatBaht(packet.metrics.expenseTotal)} สูงกว่า baseline ที่ระบบคำนวณไว้`,
    evidence: [
      { label: "วันที่", value: packet.metrics.date },
      { label: "รายจ่ายวันนี้", value: formatBaht(packet.metrics.expenseTotal) },
      {
        label: "เทียบค่าเฉลี่ย 30 วัน",
        value: formatPercent(packet.metrics.expenseVsRolling30dPercent),
      },
      {
        label: "อันดับรายจ่ายในประวัติ",
        value:
          packet.metrics.dailyExpenseRankInHistory === null
            ? "n/a"
            : `#${packet.metrics.dailyExpenseRankInHistory}`,
      },
    ],
  };
}

function buildAccountHealthInsight(
  packet: MetricPacket<AccountHealthMetrics, AccountHealthEvidence>
): InsightCandidate | null {
  const highestRisk = packet.evidence?.highestRiskAccounts[0];
  if (!highestRisk || highestRisk.riskLevel === "green") {
    return null;
  }

  const severity: InsightSeverity =
    highestRisk.riskLevel === "critical" ? "critical" : "warning";

  return {
    id: `account-health-${highestRisk.accountId}`,
    surface: "dashboard",
    type: "coverage",
    severity,
    title: "มีบัญชีที่ควรตรวจสอบความน่าเชื่อถือของยอด",
    summary: `${highestRisk.name} มีสถานะ ${highestRisk.reconciliationStatus} และส่วนต่าง ${formatBaht(
      Math.abs(highestRisk.balanceDifference)
    )}`,
    evidence: [
      { label: "บัญชี", value: highestRisk.name },
      { label: "สถานะ", value: highestRisk.reconciliationStatus },
      {
        label: "ส่วนต่าง",
        value: formatBaht(Math.abs(highestRisk.balanceDifference)),
      },
      {
        label: "รายการที่เชื่อมไว้",
        value: highestRisk.linkedTransactionCount.toLocaleString("th-TH"),
      },
    ],
  };
}

function buildGoalRiskInsight(
  packet: MetricPacket<GoalHealthMetrics, GoalHealthEvidence>
): InsightCandidate | null {
  const goal = packet.evidence?.atRiskGoals[0];
  if (!goal) {
    return null;
  }

  return {
    id: `goal-risk-${goal.goalId}`,
    surface: "dashboard",
    type: "risk",
    severity: goal.riskLevel === "red" ? "warning" : "watch",
    title: "มีเป้าหมายการออมที่ pace ยังไม่พอ",
    summary: `${goal.name} ต้องใช้ pace ประมาณ ${formatBaht(
      goal.monthlyPaceNeeded ?? 0
    )}/เดือน แต่ recent pace อยู่ที่ ${formatBaht(goal.recentContributionPace)}/เดือน`,
    evidence: [
      { label: "เป้าหมาย", value: goal.name },
      {
        label: "ยอดคงเหลือ",
        value: formatBaht(goal.remainingAmount),
      },
      {
        label: "pace ที่ต้องใช้",
        value:
          goal.monthlyPaceNeeded === null
            ? "n/a"
            : `${formatBaht(goal.monthlyPaceNeeded)}/เดือน`,
      },
      {
        label: "recent pace",
        value: `${formatBaht(goal.recentContributionPace)}/เดือน`,
      },
    ],
  };
}

function buildImportQualityInsight(
  packet: MetricPacket<ImportQualityMetrics, ImportQualityEvidence>
): InsightCandidate | null {
  const latestRun = packet.metrics.latestRun;
  if (!latestRun) {
    return null;
  }

  if (
    latestRun.conflictRatePercent < 10 &&
    latestRun.skipRatePercent < 10 &&
    packet.metrics.unresolvedConflictsCount === 0
  ) {
    return null;
  }

  return {
    id: `import-quality-${latestRun.id}`,
    surface: "dashboard",
    type: "coverage",
    severity:
      packet.metrics.unresolvedConflictsCount > 0 ||
      latestRun.conflictRatePercent >= 20
        ? "warning"
        : "watch",
    title: "คุณภาพ import รอบล่าสุดควรตรวจสอบ",
    summary: `${latestRun.sourceFilename} มี conflict ${formatPercent(
      latestRun.conflictRatePercent
    )} และ skipped ${formatPercent(latestRun.skipRatePercent)}`,
    evidence: [
      { label: "ไฟล์", value: latestRun.sourceFilename },
      { label: "จำนวนแถว", value: latestRun.totalRows.toLocaleString("th-TH") },
      { label: "conflict rate", value: formatPercent(latestRun.conflictRatePercent) },
      { label: "skip rate", value: formatPercent(latestRun.skipRatePercent) },
    ],
  };
}

export function buildDashboardInsightPacket({
  anomalyPacket,
  accountHealthPacket,
  goalHealthPacket,
  importQualityPacket,
  generatedAt = new Date().toISOString(),
}: BuildDashboardInsightPacketInput): MetricPacket<
  DashboardInsightMetrics,
  DashboardInsightEvidence
> {
  const insights = [
    buildTransactionAnomalyInsight(anomalyPacket),
    buildAccountHealthInsight(accountHealthPacket),
    buildGoalRiskInsight(goalHealthPacket),
    buildImportQualityInsight(importQualityPacket),
  ]
    .filter((insight): insight is InsightCandidate => insight !== null)
    .sort((left, right) => severityRank(right.severity) - severityRank(left.severity));

  return {
    scope: "dashboard.insights",
    metrics: {
      insightCount: insights.length,
      criticalCount: insights.filter((insight) => insight.severity === "critical")
        .length,
      warningCount: insights.filter((insight) => insight.severity === "warning")
        .length,
      watchCount: insights.filter((insight) => insight.severity === "watch")
        .length,
    },
    evidence: {
      insights,
    },
    generatedAt,
    coverage: {
      transactionCount: anomalyPacket.coverage.transactionCount,
      accountCount: accountHealthPacket.coverage.accountCount,
      activeAccountCount: accountHealthPacket.coverage.activeAccountCount,
      goalCount: goalHealthPacket.coverage.goalCount,
      activeGoalCount: goalHealthPacket.coverage.activeGoalCount,
      importRunCount: importQualityPacket.coverage.importRunCount,
      generatedFrom: [
        "transactions",
        "accounts",
        "savings_goals",
        "savings_goal_entries",
        "import_runs",
        "import_run_rows",
      ],
      caveats: Array.from(
        new Set([
          ...anomalyPacket.coverage.caveats,
          ...accountHealthPacket.coverage.caveats,
          ...goalHealthPacket.coverage.caveats,
          ...importQualityPacket.coverage.caveats,
        ])
      ),
    },
  };
}
