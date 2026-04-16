"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { DimensionSlice } from "@/lib/monthly-detail-analytics";
import { formatBaht } from "@/lib/utils";

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
            ล้าง
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
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                isActive
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "theme-border bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
              }`}
              title={`${formatBaht(slice.amount)} · ${slice.count} รายการ`}
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
            className="theme-border inline-flex items-center gap-1 rounded-full border bg-[color:var(--app-surface-soft)] px-3 py-1 text-xs text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
          >
            <ChevronDown size={12} /> +{hiddenCount}
          </button>
        )}
      </div>
    </div>
  );
}
