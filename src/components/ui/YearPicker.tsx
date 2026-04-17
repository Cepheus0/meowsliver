"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";
import { Select } from "@/components/ui/Select";

export function YearPicker() {
  const { selectedYear, setSelectedYear, importedTransactions } = useFinanceStore();

  // Derive available years from actual transaction data
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();

    if (importedTransactions.length === 0) {
      return [currentYear, selectedYear].sort((a, b) => b - a);
    }

    const txYears = new Set<number>();
    for (const tx of importedTransactions) {
      // Use transactionDate from the transaction object
      const dateStr = (tx as any).transactionDate || (tx as any).date;
      if (dateStr) {
        const y = new Date(`${dateStr}T00:00:00`).getFullYear();
        if (!Number.isNaN(y)) txYears.add(y);
      }
    }

    // Always include currentYear so the picker is never empty
    txYears.add(currentYear);
    // Also include selectedYear to ensure it's always in the list
    txYears.add(selectedYear);

    return Array.from(txYears).sort((a, b) => b - a); // descending
  }, [importedTransactions, selectedYear]);

  const minYear = years[years.length - 1];
  const maxYear = years[0];

  const options = years.map((y) => ({
    value: String(y),
    label: `ปี ${y} (${y + 543})`,
  }));

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setSelectedYear(Math.max(minYear, selectedYear - 1))}
        disabled={selectedYear <= minYear}
        className="rounded-lg p-1.5 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] disabled:opacity-30 transition-colors"
        aria-label="ปีก่อนหน้า"
      >
        <ChevronLeft size={18} />
      </button>

      <Select
        value={String(selectedYear)}
        onChange={(v) => setSelectedYear(Number(v))}
        options={options}
        className="w-44"
      />

      <button
        onClick={() => setSelectedYear(Math.min(maxYear, selectedYear + 1))}
        disabled={selectedYear >= maxYear}
        className="rounded-lg p-1.5 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] disabled:opacity-30 transition-colors"
        aria-label="ปีถัดไป"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
