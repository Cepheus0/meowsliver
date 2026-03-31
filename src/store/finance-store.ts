"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AssetItem,
  InvestmentHolding,
  LiabilityItem,
  MonthlyCashflow,
  SavingsBucket,
  Transaction,
  YearlySummary,
} from "@/lib/types";
import {
  EMPTY_ASSETS,
  EMPTY_BUCKETS,
  EMPTY_INVESTMENTS,
  EMPTY_LIABILITIES,
  getMonthlyCashflowFromTransactions,
  getTransactionsForYear,
  getYearlySummariesFromTransactions,
} from "@/lib/finance-analytics";

interface FinanceStore {
  // Year selector
  selectedYear: number;
  setSelectedYear: (year: number) => void;

  // Theme
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Imported transactions
  importedTransactions: Transaction[];
  addTransaction: (txn: Transaction) => void;
  addImportedTransactions: (txns: Transaction[]) => void;
  replaceImportedTransactions: (txns: Transaction[]) => void;
  clearImportedTransactions: () => void;

  // Data getters
  getAssets: () => AssetItem[];
  getLiabilities: () => LiabilityItem[];
  getBuckets: () => SavingsBucket[];
  getInvestments: () => Record<string, InvestmentHolding[]>;
  getMonthlyCashflow: () => MonthlyCashflow[];
  getYearlySummaries: () => YearlySummary[];
  getTransactions: () => Transaction[];

  // Computed
  getNetWorth: () => number;
  getTotalAssets: () => number;
  getTotalLiabilities: () => number;
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      selectedYear: new Date().getFullYear(),
      setSelectedYear: (year) => set({ selectedYear: year }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Imported transactions
      importedTransactions: [],
      addTransaction: (txn) =>
        set((s) => ({
          importedTransactions: [txn, ...s.importedTransactions],
        })),
      addImportedTransactions: (txns) =>
        set((s) => ({ importedTransactions: [...s.importedTransactions, ...txns] })),
      replaceImportedTransactions: (txns) => set({ importedTransactions: txns }),
      clearImportedTransactions: () => set({ importedTransactions: [] }),

      getAssets: () => EMPTY_ASSETS,
      getLiabilities: () => EMPTY_LIABILITIES,
      getBuckets: () => EMPTY_BUCKETS,
      getInvestments: () => EMPTY_INVESTMENTS,
      getMonthlyCashflow: () =>
        getMonthlyCashflowFromTransactions(
          get().importedTransactions,
          get().selectedYear
        ),
      getYearlySummaries: () =>
        getYearlySummariesFromTransactions(get().importedTransactions),
      getTransactions: () =>
        getTransactionsForYear(get().importedTransactions, get().selectedYear),

      getNetWorth: () => 0,
      getTotalAssets: () => 0,
      getTotalLiabilities: () => 0,
    }),
    {
      name: "moneycat-finance-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        importedTransactions: state.importedTransactions,
        selectedYear: state.selectedYear,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
