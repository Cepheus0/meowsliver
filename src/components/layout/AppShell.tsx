"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ManualEntryFAB } from "@/components/forms/ManualEntryFAB";
import { TransactionsHydrator } from "@/components/providers/TransactionsHydrator";
import { useFinanceStore } from "@/store/finance-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useFinanceStore();

  return (
    <div className="min-h-screen bg-[color:var(--app-bg)] text-[color:var(--app-text)]">
      <TransactionsHydrator />
      <Sidebar />
      <main
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-60"
        )}
      >
        <TopBar />
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
      <ManualEntryFAB />
    </div>
  );
}
