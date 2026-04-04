"use client";

import { useEffect, useRef } from "react";
import { useFinanceStore } from "@/store/finance-store";
import type { Transaction } from "@/lib/types";

export function TransactionsHydrator() {
  const { importedTransactions, replaceImportedTransactions } = useFinanceStore();
  const hasAttemptedHydration = useRef(false);

  useEffect(() => {
    if (hasAttemptedHydration.current || importedTransactions.length > 0) {
      return;
    }

    hasAttemptedHydration.current = true;
    let isCancelled = false;

    void fetch("/api/transactions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }

        return (await response.json()) as { transactions: Transaction[] };
      })
      .then((data) => {
        if (!isCancelled && data.transactions.length > 0) {
          replaceImportedTransactions(data.transactions);
        }
      })
      .catch((error) => {
        console.error("Transaction hydration failed", error);
      });

    return () => {
      isCancelled = true;
    };
  }, [importedTransactions.length, replaceImportedTransactions]);

  return null;
}
