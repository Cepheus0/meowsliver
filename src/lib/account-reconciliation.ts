import type { AccountReconciliation } from "@/lib/types";

interface BuildAccountReconciliationInput {
  storedBalance: number;
  transactionDerivedBalance: number;
  linkedTransactionCount: number;
  linkedIncome: number;
  linkedExpense: number;
  linkedTransferCount: number;
  lastLinkedTransactionDate?: string | null;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildAccountReconciliation(
  input: BuildAccountReconciliationInput
): AccountReconciliation {
  const balanceDifference = roundCurrency(
    input.storedBalance - input.transactionDerivedBalance
  );
  const linkedTransactionCount = Math.max(0, input.linkedTransactionCount);
  const hasLinkedTransactions = linkedTransactionCount > 0;

  let status: AccountReconciliation["status"] = "aligned";
  if (!hasLinkedTransactions) {
    status = "no_linked_transactions";
  } else if (Math.abs(balanceDifference) >= 0.01) {
    status = "needs_attention";
  }

  return {
    status,
    storedBalance: roundCurrency(input.storedBalance),
    transactionDerivedBalance: roundCurrency(input.transactionDerivedBalance),
    balanceDifference,
    linkedTransactionCount,
    linkedIncome: roundCurrency(Math.max(0, input.linkedIncome)),
    linkedExpense: roundCurrency(Math.max(0, input.linkedExpense)),
    linkedTransferCount: Math.max(0, input.linkedTransferCount),
    lastLinkedTransactionDate: input.lastLinkedTransactionDate ?? undefined,
    canReconcile: hasLinkedTransactions,
  };
}
