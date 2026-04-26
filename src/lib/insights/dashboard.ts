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

type InsightLanguage = "th" | "en";

interface BuildDashboardInsightPacketInput {
  anomalyPacket: MetricPacket<TransactionAnomalyMetrics, TransactionAnomalyEvidence>;
  accountHealthPacket: MetricPacket<AccountHealthMetrics, AccountHealthEvidence>;
  goalHealthPacket: MetricPacket<GoalHealthMetrics, GoalHealthEvidence>;
  importQualityPacket: MetricPacket<ImportQualityMetrics, ImportQualityEvidence>;
  language?: InsightLanguage;
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

function t(language: InsightLanguage, th: string, en: string) {
  return language === "en" ? en : th;
}

function formatBaht(value: number, language: InsightLanguage) {
  return `฿${Math.round(value).toLocaleString(language === "en" ? "en-US" : "th-TH")}`;
}

function formatPercent(value: number | null, language: InsightLanguage) {
  if (value === null) {
    return language === "en" ? "n/a" : "n/a";
  }

  return `${value.toLocaleString(language === "en" ? "en-US" : "th-TH")}%`;
}

function getAccountStatusLabel(
  status: string,
  language: InsightLanguage
) {
  if (status === "no_linked_transactions") {
    return t(language, "ยังไม่มีรายการที่เชื่อม", "No linked transactions yet");
  }

  if (status === "needs_attention") {
    return t(language, "ยอดยังไม่ตรงกับ ledger", "Balance differs from ledger");
  }

  return t(language, "ตรงกับ ledger", "Aligned with ledger");
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
  packet: MetricPacket<TransactionAnomalyMetrics, TransactionAnomalyEvidence>,
  language: InsightLanguage
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
    title: t(language, "พบสัญญาณใช้จ่ายผิดปกติ", "Unusual spending detected"),
    summary: topCategory
      ? t(
          language,
          `วันนี้มีรายจ่าย ${formatBaht(packet.metrics.expenseTotal, language)} โดย driver หลักคือ ${topCategory.name}`,
          `Today's expense reached ${formatBaht(packet.metrics.expenseTotal, language)} and ${topCategory.name} is the main driver.`
        )
      : t(
          language,
          `วันนี้มีรายจ่าย ${formatBaht(packet.metrics.expenseTotal, language)} สูงกว่า baseline ที่ระบบคำนวณไว้`,
          `Today's expense is ${formatBaht(packet.metrics.expenseTotal, language)}, above the system baseline.`
        ),
    actionHref: "/transactions",
    actionLabel: t(language, "เปิดดูรายการ", "Open transactions"),
    evidence: [
      { label: t(language, "วันที่", "Date"), value: packet.metrics.date },
      {
        label: t(language, "รายจ่ายวันนี้", "Expense today"),
        value: formatBaht(packet.metrics.expenseTotal, language),
      },
      {
        label: t(language, "เทียบค่าเฉลี่ย 30 วัน", "Vs rolling 30d"),
        value: formatPercent(packet.metrics.expenseVsRolling30dPercent, language),
      },
      {
        label: t(language, "อันดับรายจ่ายในประวัติ", "Historical rank"),
        value:
          packet.metrics.dailyExpenseRankInHistory === null
            ? "n/a"
            : `#${packet.metrics.dailyExpenseRankInHistory}`,
      },
    ],
  };
}

function buildAccountHealthInsight(
  packet: MetricPacket<AccountHealthMetrics, AccountHealthEvidence>,
  language: InsightLanguage
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
    title: t(
      language,
      "มีบัญชีที่ควรตรวจสอบความน่าเชื่อถือของยอด",
      "An account balance needs review"
    ),
    summary:
      highestRisk.reconciliationStatus === "no_linked_transactions"
        ? t(
            language,
            `${highestRisk.name} ยังไม่มีรายการที่เชื่อมไว้ จึงยังอธิบายยอด ${formatBaht(
              Math.abs(highestRisk.storedBalance),
              language
            )} จาก ledger ไม่ได้`,
            `${highestRisk.name} has no linked transactions yet, so the ledger cannot explain the ${formatBaht(
              Math.abs(highestRisk.storedBalance),
              language
            )} balance.`
          )
        : t(
            language,
            `${highestRisk.name} มียอดต่างจาก ledger อยู่ ${formatBaht(
              Math.abs(highestRisk.balanceDifference),
              language
            )}`,
            `${highestRisk.name} is off from the linked ledger by ${formatBaht(
              Math.abs(highestRisk.balanceDifference),
              language
            )}.`
          ),
    actionHref: `/accounts/${highestRisk.accountId}`,
    actionLabel:
      highestRisk.reconciliationStatus === "no_linked_transactions"
        ? t(language, "ดูวิธีแก้", "View fix steps")
        : t(language, "ตรวจสอบบัญชี", "Review account"),
    evidence: [
      { label: t(language, "บัญชี", "Account"), value: highestRisk.name },
      {
        label: t(language, "สถานะ", "Status"),
        value: getAccountStatusLabel(highestRisk.reconciliationStatus, language),
      },
      {
        label: t(language, "ส่วนต่าง", "Difference"),
        value: formatBaht(Math.abs(highestRisk.balanceDifference), language),
      },
      {
        label: t(language, "รายการที่เชื่อมไว้", "Linked transactions"),
        value: highestRisk.linkedTransactionCount.toLocaleString(
          language === "en" ? "en-US" : "th-TH"
        ),
      },
    ],
  };
}

function buildGoalRiskInsight(
  packet: MetricPacket<GoalHealthMetrics, GoalHealthEvidence>,
  language: InsightLanguage
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
    title: t(
      language,
      "มีเป้าหมายการออมที่ pace ยังไม่พอ",
      "A savings goal is behind pace"
    ),
    summary: t(
      language,
      `${goal.name} ต้องใช้ pace ประมาณ ${formatBaht(
        goal.monthlyPaceNeeded ?? 0,
        language
      )}/เดือน แต่ recent pace อยู่ที่ ${formatBaht(goal.recentContributionPace, language)}/เดือน`,
      `${goal.name} needs about ${formatBaht(
        goal.monthlyPaceNeeded ?? 0,
        language
      )}/month, while recent pace is ${formatBaht(goal.recentContributionPace, language)}/month.`
    ),
    actionHref: `/buckets/${goal.goalId}`,
    actionLabel: t(language, "เปิดดูเป้าหมาย", "Open goal"),
    evidence: [
      { label: t(language, "เป้าหมาย", "Goal"), value: goal.name },
      {
        label: t(language, "ยอดคงเหลือ", "Remaining"),
        value: formatBaht(goal.remainingAmount, language),
      },
      {
        label: t(language, "pace ที่ต้องใช้", "Required pace"),
        value:
          goal.monthlyPaceNeeded === null
            ? "n/a"
            : t(
                language,
                `${formatBaht(goal.monthlyPaceNeeded, language)}/เดือน`,
                `${formatBaht(goal.monthlyPaceNeeded, language)}/month`
              ),
      },
      {
        label: t(language, "recent pace", "Recent pace"),
        value: t(
          language,
          `${formatBaht(goal.recentContributionPace, language)}/เดือน`,
          `${formatBaht(goal.recentContributionPace, language)}/month`
        ),
      },
    ],
  };
}

function buildImportQualityInsight(
  packet: MetricPacket<ImportQualityMetrics, ImportQualityEvidence>,
  language: InsightLanguage
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
    title: t(language, "คุณภาพ import รอบล่าสุดควรตรวจสอบ", "Latest import quality needs review"),
    summary: t(
      language,
      `${latestRun.sourceFilename} มี conflict ${formatPercent(
        latestRun.conflictRatePercent,
        language
      )} และ skipped ${formatPercent(latestRun.skipRatePercent, language)}`,
      `${latestRun.sourceFilename} shows ${formatPercent(
        latestRun.conflictRatePercent,
        language
      )} conflicts and ${formatPercent(latestRun.skipRatePercent, language)} skipped rows.`
    ),
    actionHref: "/import",
    actionLabel: t(language, "กลับไปดูรอบนำเข้า", "Review import run"),
    evidence: [
      { label: t(language, "ไฟล์", "File"), value: latestRun.sourceFilename },
      {
        label: t(language, "จำนวนแถว", "Rows"),
        value: latestRun.totalRows.toLocaleString(language === "en" ? "en-US" : "th-TH"),
      },
      {
        label: t(language, "conflict rate", "Conflict rate"),
        value: formatPercent(latestRun.conflictRatePercent, language),
      },
      {
        label: t(language, "skip rate", "Skip rate"),
        value: formatPercent(latestRun.skipRatePercent, language),
      },
    ],
  };
}

export function buildDashboardInsightPacket({
  anomalyPacket,
  accountHealthPacket,
  goalHealthPacket,
  importQualityPacket,
  language = "th",
  generatedAt = new Date().toISOString(),
}: BuildDashboardInsightPacketInput): MetricPacket<
  DashboardInsightMetrics,
  DashboardInsightEvidence
> {
  const insights = [
    buildTransactionAnomalyInsight(anomalyPacket, language),
    buildAccountHealthInsight(accountHealthPacket, language),
    buildGoalRiskInsight(goalHealthPacket, language),
    buildImportQualityInsight(importQualityPacket, language),
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
