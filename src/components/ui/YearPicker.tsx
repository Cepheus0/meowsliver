"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";
import { useTr, useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PILL_COUNT = 3; // show the N most-recent years as pills; the rest live in the dropdown

export function YearPicker() {
  const { selectedYear, setSelectedYear, importedTransactions } = useFinanceStore();
  const tr = useTr();
  const language = useLanguage();

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();

    const set = new Set<number>();
    for (const tx of importedTransactions) {
      const dateStr = (tx as any).transactionDate || (tx as any).date;
      if (dateStr) {
        const y = new Date(`${dateStr}T00:00:00`).getFullYear();
        if (Number.isInteger(y) && y > 0) set.add(y);
      }
    }
    set.add(currentYear);
    if (Number.isInteger(selectedYear) && selectedYear > 0) set.add(selectedYear);

    return Array.from(set).sort((a, b) => a - b); // ascending
  }, [importedTransactions, selectedYear]);

  // Pills = N most-recent years in ascending order (oldest → newest, newest on the right);
  // remaining (older) years fall into the dropdown, sorted newest-first.
  const pillYears = years.slice(-PILL_COUNT);
  const otherYears = years
    .filter((y) => !pillYears.includes(y))
    .sort((a, b) => b - a);
  const selectedInPills = pillYears.includes(selectedYear);

  const formatYearLong = (y: number) =>
    language === "en" ? `FY ${y}` : `ปี ${y} (${y + 543})`;

  return (
    <div className="flex items-center gap-3">
      {/* Label — stacks on 2 lines, sits outside the pill zone */}
      <span className="whitespace-pre-line text-[9px] font-bold uppercase leading-[1.1] tracking-[0.18em] text-[color:var(--app-text-subtle)]">
        {tr("ปี\nภาษี", "FISCAL\nYEAR")}
      </span>

      {/* Pill zone */}
      <div className="flex h-10 items-stretch gap-0.5 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-1">
        {pillYears.map((y) => (
          <YearPill
            key={y}
            year={y}
            active={y === selectedYear}
            onClick={() => setSelectedYear(y)}
            ariaLabel={formatYearLong(y)}
          />
        ))}

        {otherYears.length > 0 && (
          <OverflowDropdown
            years={otherYears}
            selectedYear={selectedInPills ? null : selectedYear}
            onSelect={setSelectedYear}
            formatLabel={formatYearLong}
            ariaLabel={tr("เลือกปีอื่น", "Select another year")}
          />
        )}
      </div>
    </div>
  );
}

function YearPill({
  year,
  active,
  onClick,
  ariaLabel,
}: {
  year: number;
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "flex h-full min-w-[60px] items-center justify-center rounded-xl px-3 text-[14px] font-semibold tabular-nums transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
        active
          ? "bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_-4px_color-mix(in_srgb,var(--app-brand)_35%,transparent)]"
          : "text-[color:var(--app-text-subtle)] hover:text-[color:var(--app-text)]"
      )}
    >
      {year}
    </button>
  );
}

function OverflowDropdown({
  years,
  selectedYear,
  onSelect,
  formatLabel,
  ariaLabel,
}: {
  years: number[];
  /** The year to highlight as active. Null when the active year is already in a pill. */
  selectedYear: number | null;
  onSelect: (year: number) => void;
  formatLabel: (year: number) => string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // When the dropdown holds the active year, it looks like a "4th pill"
  const active = selectedYear !== null;

  return (
    <div ref={ref} className="relative flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          "flex h-full items-center justify-center gap-1 rounded-xl px-3 text-[14px] font-semibold tabular-nums transition-all duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40",
          active
            ? "bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_-4px_color-mix(in_srgb,var(--app-brand)_35%,transparent)]"
            : "text-[color:var(--app-text-subtle)] hover:text-[color:var(--app-text)]",
          !active && "min-w-[36px]"
        )}
      >
        {active && <span>{selectedYear}</span>}
        <ChevronDown
          size={14}
          className={cn("shrink-0 transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-[color:var(--app-border-strong)]",
            "bg-[color:var(--app-surface-strong)] shadow-[0_24px_48px_-30px_rgba(0,0,0,0.3)]",
            "animate-in fade-in-0 zoom-in-95 duration-100"
          )}
        >
          <div className="max-h-60 overflow-y-auto p-1">
            {years.map((y) => {
              const isSelected = y === selectedYear;
              return (
                <button
                  key={y}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(y);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm tabular-nums transition-colors",
                    isSelected
                      ? "bg-[color:var(--app-brand-soft)] font-semibold text-[color:var(--app-brand-text)]"
                      : "text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-soft)]"
                  )}
                >
                  <span>{formatLabel(y)}</span>
                  {isSelected && <Check size={13} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
