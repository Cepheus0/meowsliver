"use client";

import { useEffect, useRef } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { useFinanceStoreHydrated } from "@/store/use-finance-store-hydrated";
import { fetchTransactionsFromApi } from "@/lib/client/finance-sync";

export function TransactionsHydrator() {
  const { importedTransactions, replaceImportedTransactions } = useFinanceStore();
  const storeHydrated = useFinanceStoreHydrated();
  const hasAttemptedLocalRehydration = useRef(false);
  const hasAttemptedDbHydration = useRef(false);

  useEffect(() => {
    if (hasAttemptedLocalRehydration.current) {
      return;
    }

    hasAttemptedLocalRehydration.current = true;
    void useFinanceStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!storeHydrated || hasAttemptedDbHydration.current) {
      return;
    }

    hasAttemptedDbHydration.current = true;
    let isCancelled = false;

    void fetchTransactionsFromApi()
      .then((transactions) => {
        if (!isCancelled) {
          replaceImportedTransactions(transactions);
        }
      })
      .catch((error) => {
        console.error("Transaction hydration failed", error);
      });

    return () => {
      isCancelled = true;
    };
  }, [storeHydrated, replaceImportedTransactions]);

  return null;
}
