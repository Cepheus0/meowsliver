"use client";

import type { Account, Transaction } from "@/lib/types";

export async function fetchTransactionsFromApi(): Promise<Transaction[]> {
  const response = await fetch("/api/transactions", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }

  const data = (await response.json()) as { transactions: Transaction[] };
  return data.transactions;
}

export async function fetchAccountsFromApi(): Promise<Account[]> {
  const response = await fetch("/api/accounts", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch accounts");
  }

  const data = (await response.json()) as { accounts: Account[] };
  return data.accounts;
}

export async function refreshFinanceStoreFromServer(actions: {
  replaceImportedTransactions: (transactions: Transaction[]) => void;
  setAccounts: (accounts: Account[]) => void;
}) {
  const [transactions, accounts] = await Promise.all([
    fetchTransactionsFromApi(),
    fetchAccountsFromApi(),
  ]);

  actions.replaceImportedTransactions(transactions);
  actions.setAccounts(accounts);

  return { transactions, accounts };
}
