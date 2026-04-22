import { describe, expect, it } from "vitest";
import { buildDashboardInsightPacket } from "@/lib/insights/dashboard";
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

function packet<TMetrics, TEvidence>(
  metrics: TMetrics,
  evidence: TEvidence
): MetricPacket<TMetrics, TEvidence> {
  return {
    scope: "test",
    metrics,
    evidence,
    generatedAt: "2026-04-22T00:00:00.000Z",
    coverage: {
      generatedFrom: ["test"],
      caveats: [],
    },
  };
}

describe("dashboard insights", () => {
  it("builds deterministic insight candidates from metric packets", () => {
    const result = buildDashboardInsightPacket({
      anomalyPacket: packet<TransactionAnomalyMetrics, TransactionAnomalyEvidence>(
        {
          date: "2026-04-22",
          expenseTotal: 5000,
          rolling30dAverageExpense: 500,
          expenseVsRolling30dPercent: 1000,
          dailyExpenseRankInHistory: 1,
          dailyExpenseZScore: 4,
          transactionCount: 3,
          rolling30dAverageTransactionCount: 1,
          transactionFrequencyVs30dPercent: 300,
          anomalyLevel: "critical",
          anomalyReasons: ["highest_expense_day_in_history"],
        },
        {
          topExpenseCategories: [{ name: "เดินทาง", amount: 5000, sharePercent: 100 }],
          topRecipients: [],
          largestTransactions: [],
        }
      ),
      accountHealthPacket: packet<AccountHealthMetrics, AccountHealthEvidence>(
        {
          accountCount: 1,
          activeAccountCount: 1,
          archivedAccountCount: 0,
          alignedAccountCount: 0,
          needsAttentionCount: 1,
          noLinkedTransactionsCount: 0,
          totalAbsoluteBalanceDifference: 12000,
          payFromCoverage: {
            transactionWithPayFromCount: 0,
            unmatchedPayFromCount: 0,
            unmatchedPayFromRatePercent: 0,
            defaultAccountFallbackCount: 0,
            defaultAccountFallbackRatePercent: 0,
          },
        },
        {
          accounts: [],
          highestRiskAccounts: [
            {
              accountId: 1,
              name: "บัญชีหลัก",
              type: "cash",
              isDefault: true,
              isArchived: false,
              reconciliationStatus: "needs_attention",
              storedBalance: 0,
              transactionDerivedBalance: -12000,
              balanceDifference: 12000,
              linkedTransactionCount: 2,
              riskLevel: "critical",
              reasons: [],
            },
          ],
          unmatchedPayFromValues: [],
        }
      ),
      goalHealthPacket: packet<GoalHealthMetrics, GoalHealthEvidence>(
        {
          goalCount: 0,
          activeGoalCount: 0,
          archivedGoalCount: 0,
          completedGoalCount: 0,
          redGoalCount: 0,
          amberGoalCount: 0,
          totalRemainingAmount: 0,
        },
        { goals: [], atRiskGoals: [] }
      ),
      importQualityPacket: packet<ImportQualityMetrics, ImportQualityEvidence>(
        {
          recentRunCount: 0,
          totalRowsReviewed: 0,
          aggregateNewRatePercent: 0,
          aggregateDuplicateRatePercent: 0,
          aggregateConflictRatePercent: 0,
          aggregateSkipRatePercent: 0,
          unresolvedConflictsCount: 0,
          topSkipReason: null,
        },
        { recentRuns: [], sourceFilenamesByConflictRows: [] }
      ),
      generatedAt: "2026-04-22T00:00:00.000Z",
    });

    expect(result.metrics).toMatchObject({
      insightCount: 2,
      criticalCount: 2,
    });
    expect(result.evidence?.insights[0]).toMatchObject({
      type: "anomaly",
      severity: "critical",
    });
  });
});
