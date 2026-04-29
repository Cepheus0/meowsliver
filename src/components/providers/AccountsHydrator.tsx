"use client";

import { useEffect, useRef } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { useFinanceStoreHydrated } from "@/store/use-finance-store-hydrated";
import { fetchAccountsFromApi } from "@/lib/client/finance-sync";

export function AccountsHydrator() {
  const setAccounts = useFinanceStore((s) => s.setAccounts);
  const storeHydrated = useFinanceStoreHydrated();
  const hasAttemptedFetch = useRef(false);

  useEffect(() => {
    if (!storeHydrated || hasAttemptedFetch.current) {
      return;
    }

    hasAttemptedFetch.current = true;
    let isCancelled = false;

    void fetchAccountsFromApi()
      .then((accounts) => {
        if (!isCancelled) {
          setAccounts(accounts);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.warn(
            "Account hydration skipped:",
            error instanceof Error ? error.message : "unknown_error"
          );
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [storeHydrated, setAccounts]);

  return null;
}
