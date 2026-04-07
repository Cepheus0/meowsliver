"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";
import { getYearRange } from "@/lib/utils";

export function YearPicker() {
  const { selectedYear, setSelectedYear } = useFinanceStore();
  const years = getYearRange();
  const minYear = years[years.length - 1];
  const maxYear = years[0];

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setSelectedYear(Math.max(minYear, selectedYear - 1))}
        disabled={selectedYear <= minYear}
        className="rounded-lg p-1.5 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] disabled:opacity-30"
      >
        <ChevronLeft size={18} />
      </button>

      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(Number(e.target.value))}
        className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2 text-sm font-bold text-[color:var(--app-text)] shadow-[var(--app-card-shadow)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            ปี {y} ({y + 543})
          </option>
        ))}
      </select>

      <button
        onClick={() => setSelectedYear(Math.min(maxYear, selectedYear + 1))}
        disabled={selectedYear >= maxYear}
        className="rounded-lg p-1.5 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] disabled:opacity-30"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
