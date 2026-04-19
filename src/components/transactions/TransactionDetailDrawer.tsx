"use client";

import { useEffect, useMemo } from "react";
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Calendar,
  Hash,
  PencilLine,
  Receipt,
  Tag,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatBaht } from "@/lib/utils";
import {
  getTransactionAmountPrefix,
  getTransactionTypeLabel,
} from "@/lib/transaction-presentation";
import type { Transaction } from "@/lib/types";
import { useLanguage, useTr } from "@/lib/i18n";

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  /** All transactions in the same scope (e.g. selected month). Used to compute
   *  contribution shares so the user sees provenance, not just the row itself. */
  scopeTransactions?: Transaction[];
  scopeLabel?: string;
  onClose: () => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  mutationBusy?: boolean;
}

export function TransactionDetailDrawer({
  transaction,
  scopeTransactions = [],
  scopeLabel,
  onClose,
  onEdit,
  onDelete,
  mutationBusy = false,
}: TransactionDetailDrawerProps) {
  const tr = useTr();
  const language = useLanguage();
  const resolvedScopeLabel = scopeLabel ?? tr("ในขอบเขตนี้", "in this scope");
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
      ? "text-[color:var(--income-text)]"
      : transaction.type === "transfer"
        ? "text-[color:var(--app-brand-text)]"
        : "text-[color:var(--expense-text)]";

  const TypeIcon =
    transaction.type === "income"
      ? ArrowUpRight
      : transaction.type === "transfer"
        ? ArrowRightLeft
        : ArrowDownRight;
  const isManual = transaction.source === "manual" || !transaction.importRunId;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex">
      {/* Scrim — transparent click-catcher only. We deliberately do NOT dim or
       *  blur the page so the row/table behind stays fully readable; that's
       *  the whole point of using a drawer instead of a modal. On small
       *  screens we add a faint dim so it still feels like an overlay. */}
      <button
        aria-label={tr("ปิดรายละเอียด", "Close details")}
        onClick={onClose}
        className="pointer-events-auto flex-1 bg-black/15 sm:bg-black/5"
      />
      {/* Drawer */}
      <aside className="pointer-events-auto theme-surface theme-border flex h-full w-full max-w-sm flex-col overflow-y-auto border-l shadow-[-20px_0_60px_-32px_rgba(0,0,0,0.5)] backdrop-blur-sm">
        <header className="theme-border sticky top-0 flex items-center justify-between border-b bg-[color:color-mix(in_srgb,var(--app-surface)_90%,transparent)] px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-wide text-[color:var(--app-text-subtle)]">
              {tr("รายละเอียดรายการ", "Transaction details")}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[color:var(--app-text)]">
              {transaction.category}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[color:var(--app-text-muted)] transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
            aria-label={tr("ปิด", "Close")}
          >
            <X size={18} />
          </button>
        </header>

          <div className="space-y-5 px-5 py-5">
          {isManual && (onEdit || onDelete) ? (
            <section className="flex flex-wrap gap-2">
              {onEdit ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(transaction)}
                  disabled={mutationBusy}
                >
                  <PencilLine size={14} />
                  {tr("แก้ไขรายการ", "Edit transaction")}
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(transaction)}
                  disabled={mutationBusy}
                >
                  <Trash2 size={14} />
                  {tr("ลบรายการ", "Delete transaction")}
                </Button>
              ) : null}
            </section>
          ) : null}

          {/* Hero amount */}
          <div className="theme-border rounded-[24px] border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--app-surface-soft)_85%,transparent),color-mix(in_srgb,var(--app-surface)_35%,transparent))] p-4">
            <div className="flex items-center gap-2 text-xs text-[color:var(--app-text-muted)]">
              <TypeIcon size={14} className={typeColor} />
              {getTransactionTypeLabel(transaction.type, language)}
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
          <FieldGrid transaction={transaction} tr={tr} />

          {/* Provenance — how this row contributes */}
          {provenance && provenance.typeCount > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                {tr(`สัดส่วน${resolvedScopeLabel}`, `Share ${resolvedScopeLabel}`)}
              </h3>
              <ProvenanceRow
                label={tr(
                  `คิดเป็น${getTransactionTypeLabel(transaction.type, "th")}ของช่วง`,
                  `${getTransactionTypeLabel(transaction.type, "en")} share of the range`
                )}
                share={provenance.typeShare}
                amount={transaction.amount}
                outOf={provenance.typeTotal}
                count={provenance.typeCount}
                tr={tr}
              />
              {provenance.categoryCount > 1 && (
                <ProvenanceRow
                  label={tr(
                    `ในหมวด "${transaction.category}"`,
                    `In category "${transaction.category}"`
                  )}
                  share={provenance.categoryShare}
                  amount={transaction.amount}
                  outOf={provenance.categoryTotal}
                  count={provenance.categoryCount}
                  tr={tr}
                />
              )}
            </section>
          )}

          {/* Source */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
              {tr("ที่มา", "Source")}
            </h3>
            <p className="text-sm text-[color:var(--app-text-muted)]">
              {transaction.importRunId ? (
                <>
                  {tr(
                    `นำเข้าจาก import run #${transaction.importRunId} — id ภายใน: `,
                    `Imported from run #${transaction.importRunId} — internal id: `
                  )}
                  <code className="rounded bg-[color:var(--app-surface-soft)] px-1.5 py-0.5 text-xs">
                    {transaction.id}
                  </code>
                </>
              ) : (
                <>
                  {tr(
                    "บันทึกด้วยตนเองในฐานข้อมูล — id: ",
                    "Manually entered in database — id: "
                  )}
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

function FieldGrid({
  transaction,
  tr,
}: {
  transaction: Transaction;
  tr: (th: string, en: string) => string;
}) {
  const fields: Array<{ icon: React.ReactNode; label: string; value?: string }> = [
    { icon: <Receipt size={14} />, label: tr("หมายเหตุ", "Note"), value: transaction.note },
    { icon: <Tag size={14} />, label: tr("หมวดย่อย", "Subcategory"), value: transaction.subcategory },
    { icon: <Hash size={14} />, label: tr("แท็ก", "Tag"), value: transaction.tag },
    {
      icon: <Wallet size={14} />,
      label: tr("ช่องทาง", "Channel"),
      value: transaction.paymentChannel,
    },
    { icon: <Wallet size={14} />, label: tr("จากบัญชี", "From account"), value: transaction.payFrom },
    { icon: <Wallet size={14} />, label: tr("ผู้รับ", "Recipient"), value: transaction.recipient },
  ].filter((field) => field.value);

  if (fields.length === 0) {
    return (
      <p className="text-sm italic text-[color:var(--app-text-subtle)]">
        {tr("ไม่มีข้อมูลเพิ่มเติมจาก import", "No additional data from import")}
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
  tr,
}: {
  label: string;
  share: number;
  amount: number;
  outOf: number;
  count: number;
  tr: (th: string, en: string) => string;
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
          className="h-full bg-[color:var(--app-brand)]"
          style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }}
        />
      </div>
      <p className="text-xs text-[color:var(--app-text-subtle)]">
        {tr(
          `${formatBaht(amount)} จากทั้งหมด ${formatBaht(outOf)} (${count} รายการ)`,
          `${formatBaht(amount)} of ${formatBaht(outOf)} (${count} items)`
        )}
      </p>
    </div>
  );
}
