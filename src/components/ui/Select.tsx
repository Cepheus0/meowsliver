"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "เลือก...",
  className,
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "theme-border theme-surface flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2 text-sm font-medium text-[color:var(--app-text)] shadow-[var(--app-card-shadow)] transition-all",
          "hover:bg-[color:var(--app-surface-soft)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40",
          open && "ring-2 ring-emerald-500/40",
          disabled && "cursor-not-allowed opacity-40"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={15}
          className={cn(
            "shrink-0 text-[color:var(--app-text-muted)] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute left-0 top-full z-50 mt-1.5 min-w-full overflow-hidden rounded-2xl border border-[color:var(--app-border-strong)]",
            "bg-[color:var(--app-surface-strong)] shadow-[0_20px_60px_-20px_rgba(15,23,42,0.28)] backdrop-blur-xl",
            "dark:shadow-[0_20px_60px_-20px_rgba(2,6,23,0.7)]",
            "animate-in fade-in-0 zoom-in-95 duration-100"
          )}
        >
          <div className="max-h-60 overflow-y-auto p-1.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm transition-colors",
                    isSelected
                      ? "bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)] font-medium"
                      : "text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-soft)]"
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={14} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
