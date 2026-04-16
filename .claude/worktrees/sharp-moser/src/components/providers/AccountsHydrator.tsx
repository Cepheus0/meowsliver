"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useFinanceStore } from "@/store/finance-store";
import { useFinanceStoreHydrated } from "@/store/use-finance-store-hydrated";
import type { Account } from "@/lib/types";

export function AccountsHydrator() {
  const setAccounts = useFinanceStore((s) => s.setAccounts);
  const storeHydrated = useFinanceStoreHydrated();
  const pathname = usePathname();
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!storeHydrated || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    let isCancelled = false;

    void fetch("/api/accounts", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch accounts");
        }
        return (await response.json()) as { accounts: Account[] };
      })
      .then((data) => {
        if (!isCancelled) {
          setAccounts(data.accounts);
        }
      })
      .catch((error) => {
        console.error("Account hydration failed", error);
      })
      .finally(() => {
        isFetchingRef.current = false;
      });

    return () => {
      isCancelled = true;
    };
  }, [pathname, storeHydrated, setAccounts]);

  return null;
}
