"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Account,
  AssetItem,
  InvestmentHolding,
  LiabilityItem,
  MonthlyCashflow,
  Transaction,
  YearlySummary,
} from "@/lib/types";
import {
  EMPTY_ASSETS,
  EMPTY_INVESTMENTS,
  EMPTY_LIABILITIES,
  getMonthlyCashflowFromTransactions,
  getTransactionsForYear,
  getYearlySummariesFromTransactions,
  getInvestmentsFromAccounts,
  getAssetsFromAccounts,
  getLiabilitiesFromAccounts,
} from "@/lib/finance-analytics";

type Language = "th" | "en";

interface FinanceStore {
  // Year selector
  selectedYear: number;
  setSelectedYear: (year: number) => void;

  // Theme
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Language (i18n)
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;

  // Dashboard prefs
  accountOrder: number[]; // account IDs in user-preferred order
  setAccountOrder: (order: number[]) => void;
  accountsExpanded: boolean;
  toggleAccountsExpanded: () => void;

  // Imported transactions
  importedTransactions: Transaction[];
  addTransaction: (txn: Transaction) => void;
  addImportedTransactions: (txns: Transaction[]) => void;
  replaceImportedTransactions: (txns: Transaction[]) => void;
  clearImportedTransactions: () => void;

  // Accounts
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;
  upsertAccount: (account: Account) => void;
  removeAccount: (id: number) => void;

  // Data getters
  getAssets: () => AssetItem[];
  getLiabilities: () => LiabilityItem[];
  getInvestments: () => Record<string, InvestmentHolding[]>;
  getMonthlyCashflow: () => MonthlyCashflow[];
  getYearlySummaries: () => YearlySummary[];
  getTransactions: () => Transaction[];

  // Computed
  getNetWorth: () => number;
  getTotalAssets: () => number;
  getTotalLiabilities: () => number;
  getAccountById: (id: number) => Account | undefined;
  getActiveAccounts: () => Account[];
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      selectedYear: new Date().getFullYear(),
      setSelectedYear: (year) => set({ selectedYear: year }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      language: "th",
      setLanguage: (lang) => set({ language: lang }),
      toggleLanguage: () => set((s) => ({ language: s.language === "th" ? "en" : "th" })),

      accountOrder: [],
      setAccountOrder: (order) => set({ accountOrder: order }),
      accountsExpanded: false,
      toggleAccountsExpanded: () =>
        set((s) => ({ accountsExpanded: !s.accountsExpanded })),

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

      // Accounts
      accounts: [],
      setAccounts: (accounts) => set({ accounts }),
      upsertAccount: (account) =>
        set((s) => {
          const idx = s.accounts.findIndex((a) => a.id === account.id);
          if (idx === -1) return { accounts: [...s.accounts, account] };
          const next = [...s.accounts];
          next[idx] = account;
          return { accounts: next };
        }),
      removeAccount: (id) =>
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

      getAssets: () => getAssetsFromAccounts(get().accounts),
      getLiabilities: () => getLiabilitiesFromAccounts(get().accounts),
      getInvestments: () =>
        getInvestmentsFromAccounts(get().accounts, get().importedTransactions),
      getMonthlyCashflow: () =>
        getMonthlyCashflowFromTransactions(
          get().importedTransactions,
          get().selectedYear
        ),
      getYearlySummaries: () =>
        getYearlySummariesFromTransactions(get().importedTransactions),
      getTransactions: () =>
        getTransactionsForYear(get().importedTransactions, get().selectedYear),

      // Computed
      getNetWorth: () => {
        const active = get().accounts.filter((a) => !a.isArchived);
        return active.reduce((sum, a) => sum + a.currentBalance, 0);
      },
      getTotalAssets: () => {
        const active = get().accounts.filter(
          (a) => !a.isArchived && a.currentBalance > 0
        );
        return active.reduce((sum, a) => sum + a.currentBalance, 0);
      },
      getTotalLiabilities: () => {
        const active = get().accounts.filter(
          (a) => !a.isArchived && a.currentBalance < 0
        );
        return active.reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);
      },
      getAccountById: (id) => get().accounts.find((a) => a.id === id),
      getActiveAccounts: () =>
        get().accounts.filter((a) => !a.isArchived),
    }),
    {
      name: "moneycat-finance-store",
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        importedTransactions: state.importedTransactions,
        selectedYear: state.selectedYear,
        sidebarCollapsed: state.sidebarCollapsed,
        language: state.language,
        accountOrder: state.accountOrder,
        accountsExpanded: state.accountsExpanded,
      }),
    }
  )
);
