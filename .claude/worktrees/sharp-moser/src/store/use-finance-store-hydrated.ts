"use client";

import { useSyncExternalStore } from "react";
import { useFinanceStore } from "@/store/finance-store";

function subscribe(onStoreChange: () => void) {
  const unsubscribeHydrate = useFinanceStore.persist.onHydrate(() => {
    onStoreChange();
  });
  const unsubscribeFinishHydration = useFinanceStore.persist.onFinishHydration(() => {
    onStoreChange();
  });

  return () => {
    unsubscribeHydrate();
    unsubscribeFinishHydration();
  };
}

export function useFinanceStoreHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => useFinanceStore.persist.hasHydrated(),
    () => false
  );
}
