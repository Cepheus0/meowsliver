"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { SplashScreen } from "./SplashScreen";
import { ManualEntryFAB } from "@/components/forms/ManualEntryFAB";
import { TransactionsHydrator } from "@/components/providers/TransactionsHydrator";
import { AccountsHydrator } from "@/components/providers/AccountsHydrator";
import { useFinanceStore } from "@/store/finance-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useFinanceStore();

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[color:var(--app-bg)] text-[color:var(--app-text)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--app-bg-elevated)_36%,transparent),transparent_28%,transparent_72%,color-mix(in_srgb,var(--app-bg-elevated)_42%,transparent))]" />
        <div className="absolute right-[-14rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,var(--app-glow-primary)_0%,transparent_68%)]" />
        <div className="absolute bottom-[-18rem] left-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,var(--app-glow-secondary)_0%,transparent_70%)]" />
      </div>
      <SplashScreen />
      <TransactionsHydrator />
      <AccountsHydrator />
      <Sidebar />
      <main
        className={cn(
          "relative transition-all duration-200",
          sidebarCollapsed ? "ml-[52px]" : "ml-[220px]"
        )}
      >
        <TopBar />
        <div className="relative px-4 pb-10 pt-5 md:px-6 lg:px-8">
          <div className="mx-auto max-w-[1520px]">{children}</div>
        </div>
      </main>
      <ManualEntryFAB />
    </div>
  );
}
