"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TransactionFormModal } from "@/components/transactions/TransactionFormModal";
import { refreshFinanceStoreFromServer } from "@/lib/client/finance-sync";
import { useFinanceStore } from "@/store/finance-store";

export function ManualEntryFAB() {
  const accounts = useFinanceStore((state) => state.accounts);
  const replaceImportedTransactions = useFinanceStore(
    (state) => state.replaceImportedTransactions
  );
  const setAccounts = useFinanceStore((state) => state.setAccounts);
  const selectedYear = useFinanceStore((state) => state.selectedYear);
  const setSelectedYear = useFinanceStore((state) => state.setSelectedYear);

  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#f54e00] text-white shadow-lg shadow-[#f54e00]/25 transition-transform hover:scale-110 hover:bg-[#d44400] active:scale-95"
        aria-label="เพิ่มรายการใหม่"
      >
        <Plus size={28} />
      </button>

      {isOpen ? (
        <TransactionFormModal
          accounts={accounts}
          busy={busy}
          onClose={() => {
            if (!busy) {
              setIsOpen(false);
            }
          }}
          onSubmit={async (values) => {
            setBusy(true);

            try {
              const response = await fetch("/api/transactions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
              });

              const data = (await response.json()) as {
                error?: string;
              };

              if (!response.ok) {
                throw new Error(data.error ?? "ไม่สามารถบันทึกรายการได้");
              }

              await refreshFinanceStoreFromServer({
                replaceImportedTransactions,
                setAccounts,
              });

              const transactionYear = Number(values.date.slice(0, 4));
              if (Number.isInteger(transactionYear) && transactionYear !== selectedYear) {
                setSelectedYear(transactionYear);
              }

              setIsOpen(false);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </>
  );
}
