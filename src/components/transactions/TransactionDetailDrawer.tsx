"use client";

import { useEffect, useMemo } from "react";
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Calendar,
  Hash,
  Receipt,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { formatBaht } from "@/lib/utils";
import {
  getTransactionAmountPrefix,
  getTransactionTypeLabel,
} from "@/lib/transaction-presentation";
import type { Transaction } from "@/lib/types";

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  /** All transactions in the same scope (e.g. selected month). Used to compute
   *  contribution shares so the user sees provenance, not just the row itself. */
  scopeTransactions?: Transaction[];
  scopeLabel?: string;
  onClose: () => void;
}

export function TransactionDetailDrawer({
  transaction,
  scopeTransactions = [],
  scopeLabel = "ในขอบเขตนี้",
  onClose,
}: TransactionDetailDrawerProps) {
  // Lock body scroll while drawer is open. Cheap UX win — without this the
  // background page scrolls behind a tall drawer on mobile.
  useEffect(() => {
    if (!transaction) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [transaction]);

  // Esc to close — drawer should feel like a modal in keyboard land.
  useEffect(() => {
    if (!transaction) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transaction, onClose]);

  const provenance = useMemo(() => {
    if (!transaction) return null;
    const sameType = scopeTransactions.filter((tx) => tx.type === transaction.type);
    const sameCategory = sameType.filter((tx) => tx.category === transaction.category);
    const typeTotal = sameType.reduce((sum, tx) => sum + tx.amount, 0);
    const categoryTotal = sameCategory.reduce((sum, tx) => sum + tx.amount, 0);
    return {
      typeTotal,
      categoryTotal,
      typeShare: typeTotal > 0 ? transaction.amount / typeTotal : 0,
      categoryShare: categoryTotal > 0 ? transaction.amount / categoryTotal : 0,
      typeCount: sameType.length,
      categoryCount: sameCategory.length,
    };
  }, [transaction, scopeTransactions]);

  if (!transaction) return null;

  const typeColor =
    transaction.type === "income"
      ? "text-emerald-600 dark:text-emerald-400"
      : transaction.type === "transfer"
        ? "text-sky-600 dark:text-sky-400"
        : "text-red-500";

  const TypeIcon =
    transaction.type === "income"
      ? ArrowUpRight
      : transaction.type === "transfer"
        ? ArrowRightLeft
        : ArrowDownRight;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex">
      {/* Scrim — transparent click-catcher only. We deliberately do NOT dim or
       *  blur the page so the row/table behind stays fully readable; that's
       *  the whole point of using a drawer instead of a modal. On small
       *  screens we add a faint dim so it still feels like an overlay. */}
      <button
        aria-label="ปิดรายละเอียด"
        onClick={onClose}
        className="pointer-events-auto flex-1 bg-transparent sm:bg-black/0"
      />
      {/* Drawer */}
      <aside className="pointer-events-auto theme-surface theme-border flex h-full w-full max-w-sm flex-col overflow-y-auto border-l shadow-[-12px_0_40px_-20px_rgba(0,0,0,0.25)]">
        <header className="theme-border sticky top-0 flex items-center justify-between border-b bg-[color:var(--app-surface)] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[color:var(--app-text-subtle)]">
              รายละเอียดรายการ
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[color:var(--app-text)]">
              {transaction.category}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
            aria-label="ปิด"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
          {/* Hero amount */}
          <div className="theme-border rounded-2xl border bg-[color:var(--app-surface-soft)] p-4">
            <div className="flex items-center gap-2 text-xs text-[color:var(--app-text-muted)]">
              <TypeIcon size={14} className={typeColor} />
              {getTransactionTypeLabel(transaction.type)}
            </div>
            <p className={`mt-2 text-3xl font-bold ${typeColor}`}>
              {getTransactionAmountPrefix(transaction.type)}
              {formatBaht(transaction.amount)}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-[color:var(--app-text-muted)]">
              <Calendar size={14} />
              {transaction.date}
              {transaction.time ? ` · ${transaction.time}` : ""}
            </p>
          </div>

          {/* Field grid */}
          <FieldGrid transaction={transaction} />

          {/* Provenance — how this row contributes */}
          {provenance && provenance.typeCount > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                สัดส่วน{scopeLabel}
              </h3>
              <ProvenanceRow
                label={`คิดเป็น ${getTransactionTypeLabel(transaction.type)}ของช่วง`}
                share={provenance.typeShare}
                amount={transaction.amount}
                outOf={provenance.typeTotal}
                count={provenance.typeCount}
              />
              {provenance.categoryCount > 1 && (
                <ProvenanceRow
                  label={`ในหมวด "${transaction.category}"`}
                  share={provenance.categoryShare}
                  amount={transaction.amount}
                  outOf={provenance.categoryTotal}
                  count={provenance.categoryCount}
                />
              )}
            </section>
          )}

          {/* Source */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
              ที่มา
            </h3>
            <p className="text-sm text-[color:var(--app-text-muted)]">
              {transaction.importRunId ? (
                <>
                  นำเข้าจาก import run #{transaction.importRunId} — id ภายใน:{" "}
                  <code className="rounded bg-[color:var(--app-surface-soft)] px-1.5 py-0.5 text-xs">
                    {transaction.id}
                  </code>
                </>
              ) : (
                <>
                  บันทึกด้วยตนเอง — id:{" "}
                  <code className="rounded bg-[color:var(--app-surface-soft)] px-1.5 py-0.5 text-xs">
                    {transaction.id}
                  </code>
                </>
              )}
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

function FieldGrid({ transaction }: { transaction: Transaction }) {
  const fields: Array<{ icon: React.ReactNode; label: string; value?: string }> = [
    { icon: <Receipt size={14} />, label: "หมายเหตุ", value: transaction.note },
    { icon: <Tag size={14} />, label: "หมวดย่อย", value: transaction.subcategory },
    { icon: <Hash size={14} />, label: "แท็ก", value: transaction.tag },
    {
      icon: <Wallet size={14} />,
      label: "ช่องทาง",
      value: transaction.paymentChannel,
    },
    { icon: <Wallet size={14} />, label: "จากบัญชี", value: transaction.payFrom },
    { icon: <Wallet size={14} />, label: "ผู้รับ", value: transaction.recipient },
  ].filter((field) => field.value);

  if (fields.length === 0) {
    return (
      <p className="text-sm italic text-[color:var(--app-text-subtle)]">
        ไม่มีข้อมูลเพิ่มเติมจาก import
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.label}
          className="theme-border rounded-xl border bg-[color:var(--app-surface-soft)] p-3"
        >
          <dt className="flex items-center gap-1.5 text-xs text-[color:var(--app-text-subtle)]">
            {field.icon}
            {field.label}
          </dt>
          <dd className="mt-1 break-words text-sm text-[color:var(--app-text)]">
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ProvenanceRow({
  label,
  share,
  amount,
  outOf,
  count,
}: {
  label: string;
  share: number;
  amount: number;
  outOf: number;
  count: number;
}) {
  const percent = (share * 100).toFixed(share >= 0.1 ? 1 : 2);
  return (
    <div className="theme-border space-y-2 rounded-xl border bg-[color:var(--app-surface-soft)] p-3">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-[color:var(--app-text-muted)]">{label}</span>
        <span className="font-semibold text-[color:var(--app-text)]">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--app-surface-strong)]">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }}
        />
      </div>
      <p className="text-xs text-[color:var(--app-text-subtle)]">
        {formatBaht(amount)} จากทั้งหมด {formatBaht(outOf)} ({count} รายการ)
      </p>
    </div>
  );
}
