import { describe, expect, it } from "vitest";
import { buildAccountReconciliation } from "@/lib/account-reconciliation";

describe("account reconciliation", () => {
  it("marks accounts with no linked transactions as non-reconcilable", () => {
    expect(
      buildAccountReconciliation({
        storedBalance: 1000,
        transactionDerivedBalance: 0,
        linkedTransactionCount: 0,
        linkedIncome: 0,
        linkedExpense: 0,
        linkedTransferCount: 0,
      })
    ).toEqual({
      status: "no_linked_transactions",
      storedBalance: 1000,
      transactionDerivedBalance: 0,
      balanceDifference: 1000,
      linkedTransactionCount: 0,
      linkedIncome: 0,
      linkedExpense: 0,
      linkedTransferCount: 0,
      lastLinkedTransactionDate: undefined,
      canReconcile: false,
    });
  });

  it("marks aligned accounts when stored and derived balances match", () => {
    const reconciliation = buildAccountReconciliation({
      storedBalance: 2500,
      transactionDerivedBalance: 2500,
      linkedTransactionCount: 3,
      linkedIncome: 4000,
      linkedExpense: 1500,
      linkedTransferCount: 1,
      lastLinkedTransactionDate: "2026-04-17",
    });

    expect(reconciliation.status).toBe("aligned");
    expect(reconciliation.balanceDifference).toBe(0);
    expect(reconciliation.canReconcile).toBe(true);
  });

  it("flags drift when stored and derived balances diverge", () => {
    const reconciliation = buildAccountReconciliation({
      storedBalance: 800,
      transactionDerivedBalance: -200,
      linkedTransactionCount: 1,
      linkedIncome: 0,
      linkedExpense: 200,
      linkedTransferCount: 0,
      lastLinkedTransactionDate: "2030-03-01",
    });

    expect(reconciliation.status).toBe("needs_attention");
    expect(reconciliation.balanceDifference).toBe(1000);
    expect(reconciliation.lastLinkedTransactionDate).toBe("2030-03-01");
  });
});
