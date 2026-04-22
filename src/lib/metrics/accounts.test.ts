import { describe, expect, it } from "vitest";
import { buildAccountHealthMetricPacket } from "@/lib/metrics/accounts";
import type { Account, AccountReconciliation, Transaction } from "@/lib/types";

const accounts: Account[] = [
  {
    id: 1,
    name: "บัญชีหลัก",
    type: "cash",
    icon: "Wallet",
    color: "#10b981",
    currentBalance: 1000,
    isArchived: false,
    isDefault: true,
    sortOrder: 1,
    aliases: ["main"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "KBank",
    type: "bank_savings",
    icon: "Landmark",
    color: "#3b82f6",
    currentBalance: 1000,
    isArchived: false,
    isDefault: false,
    sortOrder: 2,
    aliases: ["กสิกร"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const reconciliations: AccountReconciliation[] = [
  {
    status: "no_linked_transactions",
    storedBalance: 1000,
    transactionDerivedBalance: 0,
    balanceDifference: 1000,
    linkedTransactionCount: 0,
    linkedIncome: 0,
    linkedExpense: 0,
    linkedTransferCount: 0,
    canReconcile: false,
  },
  {
    status: "needs_attention",
    storedBalance: 1000,
    transactionDerivedBalance: -20000,
    balanceDifference: 21000,
    linkedTransactionCount: 4,
    linkedIncome: 0,
    linkedExpense: 20000,
    linkedTransferCount: 0,
    lastLinkedTransactionDate: "2026-04-10",
    canReconcile: true,
  },
];

const transactions: Transaction[] = [
  {
    id: "txn-1",
    date: "2026-04-10",
    amount: 100,
    category: "อาหาร",
    type: "expense",
    payFrom: "Unknown Wallet",
    accountId: 1,
  },
  {
    id: "txn-2",
    date: "2026-04-11",
    amount: 200,
    category: "อาหาร",
    type: "expense",
    payFrom: "กสิกร",
    accountId: 2,
  },
];

describe("account health metrics", () => {
  it("summarizes reconciliation risk and pay-from coverage", () => {
    const packet = buildAccountHealthMetricPacket({
      accountDetails: accounts.map((account, index) => ({
        account,
        reconciliation: reconciliations[index],
      })),
      transactions,
      generatedAt: "2026-04-22T00:00:00.000Z",
    });

    expect(packet.metrics).toMatchObject({
      accountCount: 2,
      activeAccountCount: 2,
      needsAttentionCount: 1,
      noLinkedTransactionsCount: 1,
      totalAbsoluteBalanceDifference: 22000,
      payFromCoverage: {
        transactionWithPayFromCount: 2,
        unmatchedPayFromCount: 1,
        defaultAccountFallbackCount: 1,
      },
    });
    expect(packet.evidence?.highestRiskAccounts[0]).toMatchObject({
      accountId: 2,
      riskLevel: "critical",
    });
  });
});
