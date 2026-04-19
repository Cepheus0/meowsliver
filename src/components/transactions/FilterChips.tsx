"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { DimensionSlice } from "@/lib/monthly-detail-analytics";
import { formatBaht } from "@/lib/utils";
import { useTr } from "@/lib/i18n";

interface FilterChipsProps {
  label: string;
  /** Pre-ranked slices from monthly-detail-analytics. Falsy/empty arrays
   *  collapse the chip group entirely so we don't show empty rails. */
  slices: DimensionSlice[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  /** How many to show before "ดูเพิ่มเติม". Defaults to 6 — fits one row on
   *  most laptop widths without horizontal scroll. */
  initialLimit?: number;
}

export function FilterChips({
  label,
  slices,
  selected,
  onToggle,
  initialLimit = 6,
}: FilterChipsProps) {
  const tr = useTr();
  const [expanded, setExpanded] = useState(false);
  // Skip "ไม่ระบุ" buckets — selecting them is rarely useful and clutters the row.
  const visibleAll = slices.filter((slice) => slice.value !== undefined);
  if (visibleAll.length === 0) return null;

  const visible = expanded ? visibleAll : visibleAll.slice(0, initialLimit);
  const hiddenCount = Math.max(0, visibleAll.length - visible.length);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
          {label}
        </h4>
        {selected.size > 0 && (
          <button
            onClick={() => {
              for (const value of [...selected]) onToggle(value);
            }}
            className="text-xs text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
          >
            {tr("ล้าง", "Clear")}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((slice) => {
          const isActive = slice.value !== undefined && selected.has(slice.value);
          return (
            <button
              key={slice.label}
              onClick={() => slice.value !== undefined && onToggle(slice.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                isActive
                  ? "border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft-strong)] text-[color:var(--app-brand-text)] shadow-[0_12px_30px_-24px_var(--app-brand-shadow)]"
                  : "border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)] hover:-translate-y-0.5 hover:border-[color:var(--app-border-strong)] hover:bg-[color:var(--app-surface)] hover:text-[color:var(--app-text)]"
              }`}
              title={tr(
                `${formatBaht(slice.amount)} · ${slice.count} รายการ`,
                `${formatBaht(slice.amount)} · ${slice.count} items`
              )}
            >
              <span className="max-w-[14ch] truncate">{slice.label}</span>
              <span className="text-[10px] opacity-70">{slice.count}</span>
              {isActive && <X size={10} />}
            </button>
          );
        })}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="theme-border inline-flex items-center gap-1 rounded-full border bg-[color:var(--app-surface-soft)] px-3 py-1.5 text-xs text-[color:var(--app-text-muted)] transition-all duration-200 hover:-translate-y-0.5 hover:text-[color:var(--app-text)]"
          >
            <ChevronDown size={12} /> +{hiddenCount}
          </button>
        )}
      </div>
    </div>
  );
}
