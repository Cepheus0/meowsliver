"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTr } from "@/lib/i18n";

export type ConfirmTone = "danger" | "warning" | "default";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const tr = useTr();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmClasses =
    tone === "danger"
      ? "bg-[color:var(--expense-text)] text-white hover:opacity-90"
      : tone === "warning"
        ? "bg-amber-500 text-white hover:opacity-90"
        : "bg-[color:var(--app-brand)] text-white hover:opacity-90";

  const iconTone =
    tone === "danger"
      ? "bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : "bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-150"
      onClick={() => !busy && onCancel()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-sm rounded-2xl border border-[color:var(--app-border-strong)] bg-[color:var(--app-surface-strong)] p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]",
          "animate-in zoom-in-95 fade-in-0 duration-150"
        )}
      >
        <button
          type="button"
          onClick={() => !busy && onCancel()}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--app-text-muted)] transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
          aria-label={tr("ปิด", "Close")}
          disabled={busy}
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              iconTone
            )}
          >
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-[color:var(--app-text)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 text-sm leading-6 text-[color:var(--app-text-muted)]">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2 text-sm font-medium text-[color:var(--app-text)] transition-all hover:bg-[color:var(--app-surface-soft)] disabled:opacity-50"
          >
            {cancelLabel ?? tr("ยกเลิก", "Cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-[0_8px_20px_-12px_rgba(0,0,0,0.4)] transition-all disabled:opacity-50",
              confirmClasses
            )}
          >
            {busy ? tr("กำลังดำเนินการ…", "Working…") : confirmLabel ?? tr("ยืนยัน", "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
