"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";
import { getYearRange } from "@/lib/utils";
import { Select } from "@/components/ui/Select";

export function YearPicker() {
  const { selectedYear, setSelectedYear } = useFinanceStore();
  const years = getYearRange();
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
