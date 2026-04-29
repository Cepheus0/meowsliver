import type { MetricPacket } from "@/lib/metrics/types";
import type { Account, AccountReconciliation, Transaction } from "@/lib/types";

interface AccountHealthSource {
  account: Account;
  reconciliation: AccountReconciliation;
}

interface BuildAccountHealthMetricPacketInput {
  accountDetails: AccountHealthSource[];
  transactions: Transaction[];
  generatedAt?: string;
}

interface BuildAccountHealthDetailMetricPacketInput
  extends BuildAccountHealthMetricPacketInput {
  accountId: number;
}

export interface AccountHealthItem {
  accountId: number;
  name: string;
  type: Account["type"];
  isDefault: boolean;
  isArchived: boolean;
  reconciliationStatus: AccountReconciliation["status"];
  storedBalance: number;
  transactionDerivedBalance: number;
  balanceDifference: number;
  linkedTransactionCount: number;
  lastLinkedTransactionDate?: string;
  riskLevel: "info" | "green" | "watch" | "warning" | "critical";
  reasons: string[];
}

export interface PayFromCoverageMetric {
  transactionWithPayFromCount: number;
  attributedTransactionCount: number;
  attributedTransactionRatePercent: number;
  unmatchedPayFromCount: number;
  unmatchedPayFromRatePercent: number;
  defaultAccountFallbackCount: number;
  defaultAccountFallbackRatePercent: number;
}

export interface AccountHealthMetrics {
  accountCount: number;
  activeAccountCount: number;
  archivedAccountCount: number;
  alignedAccountCount: number;
  needsAttentionCount: number;
  noLinkedTransactionsCount: number;
  totalAbsoluteBalanceDifference: number;
  payFromCoverage: PayFromCoverageMetric;
}

export interface AccountHealthEvidence {
  accounts: AccountHealthItem[];
  highestRiskAccounts: AccountHealthItem[];
  unmatchedPayFromValues: Array<{
    value: string;
    count: number;
  }>;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function canonicalize(value?: string | null) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function getRiskWeight(riskLevel: AccountHealthItem["riskLevel"]) {
  const weights: Record<AccountHealthItem["riskLevel"], number> = {
    info: 0,
    green: 1,
    watch: 2,
    warning: 3,
    critical: 4,
  };

  return weights[riskLevel];
}

function buildAccountAliasMap(accounts: Account[]) {
  const aliases = new Map<string, number>();

  for (const account of accounts) {
    if (account.isArchived) {
      continue;
    }

    aliases.set(canonicalize(account.name), account.id);
    for (const alias of account.aliases) {
      aliases.set(canonicalize(alias), account.id);
    }
  }

  return aliases;
}

function buildPayFromCoverage(
  accounts: Account[],
  transactions: Transaction[]
): {
  metrics: PayFromCoverageMetric;
  unmatchedPayFromValues: Array<{ value: string; count: number }>;
} {
  const aliasMap = buildAccountAliasMap(accounts);
  const defaultAccount = accounts.find(
    (account) => !account.isArchived && account.isDefault
  );
  let transactionWithPayFromCount = 0;
  let attributedTransactionCount = 0;
  let unmatchedPayFromCount = 0;
  let defaultAccountFallbackCount = 0;
  const unmatchedValues = new Map<string, number>();

  for (const transaction of transactions) {
    const payFromKey = canonicalize(transaction.payFrom);
    if (!payFromKey) {
      continue;
    }

    transactionWithPayFromCount += 1;
    const matchedAccountId = aliasMap.get(payFromKey);

    if (matchedAccountId && transaction.accountId === matchedAccountId) {
      attributedTransactionCount += 1;
    } else if (!matchedAccountId) {
      unmatchedPayFromCount += 1;
      unmatchedValues.set(
        transaction.payFrom?.trim() || "ไม่ระบุ",
        (unmatchedValues.get(transaction.payFrom?.trim() || "ไม่ระบุ") ?? 0) + 1
      );

      if (defaultAccount && transaction.accountId === defaultAccount.id) {
        defaultAccountFallbackCount += 1;
      }
    }
  }

  return {
    metrics: {
      transactionWithPayFromCount,
      attributedTransactionCount,
      attributedTransactionRatePercent:
        transactionWithPayFromCount > 0
          ? roundPercent(
              (attributedTransactionCount / transactionWithPayFromCount) * 100
            )
          : 0,
      unmatchedPayFromCount,
      unmatchedPayFromRatePercent:
        transactionWithPayFromCount > 0
          ? roundPercent((unmatchedPayFromCount / transactionWithPayFromCount) * 100)
          : 0,
      defaultAccountFallbackCount,
      defaultAccountFallbackRatePercent:
        transactionWithPayFromCount > 0
          ? roundPercent(
              (defaultAccountFallbackCount / transactionWithPayFromCount) * 100
            )
          : 0,
    },
    unmatchedPayFromValues: Array.from(unmatchedValues.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, count })),
  };
}

function hasReconciliationEligibleRows(transactions: Transaction[]) {
  return transactions.some((transaction) => transaction.source !== "import");
}

function buildAccountHealthItem(
  detail: AccountHealthSource,
  accountTransactions: Transaction[]
): AccountHealthItem {
  const { account, reconciliation } = detail;
  const reasons: string[] = [];
  let riskLevel: AccountHealthItem["riskLevel"] = "green";
  const absoluteDifference = Math.abs(reconciliation.balanceDifference);

  if (account.isArchived) {
    riskLevel = "info";
    reasons.push("account_archived");
  } else if (reconciliation.status === "needs_attention") {
    if (hasReconciliationEligibleRows(accountTransactions)) {
      riskLevel = absoluteDifference >= 10000 ? "critical" : "warning";
      reasons.push("legacy_linked_rows_need_cleanup");
      reasons.push("stored_snapshot_differs_from_linked_rows");
    } else {
      riskLevel = "info";
      reasons.push("import_account_attribution_only");
      reasons.push("account_balance_snapshot_only");
    }
  } else if (reconciliation.status === "no_linked_transactions") {
    riskLevel = "info";
    reasons.push("account_balance_snapshot_only");
  }

  if (account.isDefault) {
    reasons.push("default_account");
  }

  return {
    accountId: account.id,
    name: account.name,
    type: account.type,
    isDefault: account.isDefault,
    isArchived: account.isArchived,
    reconciliationStatus: reconciliation.status,
    storedBalance: reconciliation.storedBalance,
    transactionDerivedBalance: reconciliation.transactionDerivedBalance,
    balanceDifference: reconciliation.balanceDifference,
    linkedTransactionCount: reconciliation.linkedTransactionCount,
    lastLinkedTransactionDate: reconciliation.lastLinkedTransactionDate,
    riskLevel,
    reasons,
  };
}

function buildCoverageCaveats(input: {
  accountCount: number;
  transactionCount: number;
}) {
  const caveats: string[] = [
    "account_balances_are_stored_values",
    "import_account_linking_is_optional",
  ];

  if (input.accountCount === 0) {
    caveats.push("no_accounts_configured");
  }

  if (input.transactionCount === 0) {
    caveats.push("no_transactions_imported");
  }

  caveats.push("meowjot_account_source_may_be_unreliable");

  return caveats;
}

export function buildAccountHealthMetricPacket({
  accountDetails,
  transactions,
  generatedAt = new Date().toISOString(),
}: BuildAccountHealthMetricPacketInput): MetricPacket<
  AccountHealthMetrics,
  AccountHealthEvidence
> {
  const accounts = accountDetails.map((detail) => detail.account);
  const transactionsByAccountId = new Map<number, Transaction[]>();
  for (const transaction of transactions) {
    if (transaction.accountId == null) continue;
    const accountTransactions = transactionsByAccountId.get(transaction.accountId) ?? [];
    accountTransactions.push(transaction);
    transactionsByAccountId.set(transaction.accountId, accountTransactions);
  }
  const items = accountDetails.map((detail) =>
    buildAccountHealthItem(
      detail,
      transactionsByAccountId.get(detail.account.id) ?? []
    )
  );
  const activeItems = items.filter((item) => !item.isArchived);
  const attentionItems = activeItems.filter(
    (item) => getRiskWeight(item.riskLevel) >= getRiskWeight("warning")
  );
  const payFromCoverage = buildPayFromCoverage(accounts, transactions);

  return {
    scope: "accounts.health",
    metrics: {
      accountCount: items.length,
      activeAccountCount: activeItems.length,
      archivedAccountCount: items.length - activeItems.length,
      alignedAccountCount: activeItems.filter(
        (item) => item.reconciliationStatus === "aligned"
      ).length,
      needsAttentionCount: attentionItems.length,
      noLinkedTransactionsCount: activeItems.filter(
        (item) => item.reconciliationStatus === "no_linked_transactions"
      ).length,
      totalAbsoluteBalanceDifference: roundCurrency(
        attentionItems.reduce(
          (sum, item) => sum + Math.abs(item.balanceDifference),
          0
        )
      ),
      payFromCoverage: payFromCoverage.metrics,
    },
    evidence: {
      accounts: items,
      highestRiskAccounts: [...activeItems]
        .sort((left, right) => {
          const riskDelta =
            getRiskWeight(right.riskLevel) - getRiskWeight(left.riskLevel);
          if (riskDelta !== 0) {
            return riskDelta;
          }

          return Math.abs(right.balanceDifference) - Math.abs(left.balanceDifference);
        })
        .slice(0, 5),
      unmatchedPayFromValues: payFromCoverage.unmatchedPayFromValues,
    },
    generatedAt,
    coverage: {
      transactionCount: transactions.length,
      accountCount: items.length,
      activeAccountCount: activeItems.length,
      generatedFrom: ["accounts", "transactions"],
      caveats: buildCoverageCaveats({
        accountCount: items.length,
        transactionCount: transactions.length,
      }),
    },
  };
}

export function buildAccountHealthDetailMetricPacket({
  accountId,
  accountDetails,
  transactions,
  generatedAt = new Date().toISOString(),
}: BuildAccountHealthDetailMetricPacketInput): MetricPacket<
  AccountHealthItem,
  AccountHealthEvidence
> {
  const packet = buildAccountHealthMetricPacket({
    accountDetails,
    transactions,
    generatedAt,
  });
  const item = packet.evidence?.accounts.find(
    (account) => account.accountId === accountId
  );

  if (!item) {
    throw new Error("account_not_found");
  }

  return {
    scope: "accounts.health.detail",
    period: String(accountId),
    metrics: item,
    evidence: packet.evidence,
    generatedAt,
    coverage: packet.coverage,
  };
}
