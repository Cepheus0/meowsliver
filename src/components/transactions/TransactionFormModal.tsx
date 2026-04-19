"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  QUICK_TEMPLATES,
  type Account,
  type Transaction,
  type TransactionType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { getTransactionDefaultCategory } from "@/lib/transaction-presentation";
import { useTr } from "@/lib/i18n";

function getCategoriesForType(type: TransactionType) {
  if (type === "income") return [...INCOME_CATEGORIES];
  if (type === "expense") return [...EXPENSE_CATEGORIES];
  return [getTransactionDefaultCategory("transfer")];
}

export interface TransactionFormValues {
  date: string;
  time?: string;
  amount: number;
  type: TransactionType;
  category: string;
  note?: string;
  accountId: number | null;
}

interface TransactionFormModalProps {
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void> | void;
  accounts: Account[];
  initial?: Transaction | null;
  busy?: boolean;
}

export function TransactionFormModal({
  onClose,
  onSubmit,
  accounts,
  initial,
  busy = false,
}: TransactionFormModalProps) {
  const tr = useTr();
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : ""
  );
  const [category, setCategory] = useState(
    initial?.category ??
      (initial?.type === "transfer" ? getTransactionDefaultCategory("transfer") : "")
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [date, setDate] = useState(
    initial?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [time, setTime] = useState(initial?.time ?? "");
  const [accountId, setAccountId] = useState(
    initial?.accountId != null ? String(initial.accountId) : ""
  );
  const [error, setError] = useState<string | null>(null);

  const activeAccounts = useMemo(
    () =>
      accounts
        .filter((account) => !account.isArchived)
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id),
    [accounts]
  );

  const categories = useMemo(() => {
    return getCategoriesForType(type);
  }, [type]);

  const accountOptions = useMemo(
    () => [
      {
        value: "",
        label:
          activeAccounts.length > 0
            ? tr("ใช้บัญชีหลักอัตโนมัติ", "Auto-use primary account")
            : tr("สร้าง/ใช้บัญชีหลักอัตโนมัติ", "Create / auto-use primary account"),
      },
      ...activeAccounts.map((account) => ({
        value: String(account.id),
        label: account.isDefault
          ? `${account.name} (${tr("บัญชีหลัก", "primary")})`
          : account.name,
      })),
    ],
    [activeAccounts, tr]
  );

  const handleSave = async () => {
    const parsedAmount = Number(amount);
    if (!date) {
      setError(tr("กรุณาระบุวันที่", "Please enter a date"));
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(
        tr("กรุณาระบุจำนวนเงินที่มากกว่า 0", "Please enter an amount greater than 0")
      );
      return;
    }
    if (!category.trim()) {
      setError(tr("กรุณาระบุหมวดหมู่", "Please select a category"));
      return;
    }

    setError(null);
    try {
      await onSubmit({
        date,
        time: time || undefined,
        amount: parsedAmount,
        type,
        category: category.trim(),
        note: note.trim() || undefined,
        accountId: accountId ? Number(accountId) : null,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : tr("ไม่สามารถบันทึกรายการได้", "Could not save transaction")
      );
    }
  };

  const applyTemplate = (template: (typeof QUICK_TEMPLATES)[number]) => {
    setType(template.type);
    setCategory(template.category);
    setAmount(template.amount > 0 ? String(template.amount) : "");
    setNote(template.label);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--app-overlay)]/90 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="theme-border theme-surface-strong w-full max-w-xl rounded-t-[28px] border p-6 shadow-[0_32px_80px_-48px_rgba(0,0,0,0.55)] sm:rounded-[28px]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[color:var(--app-text)]">
            {initial
              ? tr("แก้ไขรายการ", "Edit transaction")
              : tr("บันทึกรายการใหม่", "Add new transaction")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[color:var(--app-text-subtle)] transition-colors hover:bg-[color:var(--app-surface-soft)]"
            aria-label={tr("ปิด", "Close")}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-[color:var(--expense-soft)] bg-[color:var(--expense-soft)] px-3 py-2 text-sm text-[color:var(--expense-text)]">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex rounded-2xl bg-[color:var(--app-surface-soft)] p-1">
            {([
              { value: "expense", label: tr("รายจ่าย", "Expense"), activeClass: "bg-[color:var(--expense)] text-white shadow" },
              { value: "income", label: tr("รายรับ", "Income"), activeClass: "bg-[color:var(--income)] text-white shadow" },
              { value: "transfer", label: tr("ย้ายเงิน", "Transfer"), activeClass: "bg-[color:var(--app-brand)] text-white shadow" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setType(option.value);
                  setCategory((currentCategory) => {
                    const nextCategories = getCategoriesForType(option.value);
                    if (option.value === "transfer") {
                      return getTransactionDefaultCategory("transfer");
                    }
                    return nextCategories.includes(currentCategory)
                      ? currentCategory
                      : "";
                  });
                }}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
                  type === option.value
                    ? option.activeClass
                    : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {!initial && (
            <div>
              <p className="mb-2 text-xs font-medium text-[color:var(--app-text-muted)]">
                {tr("เทมเพลตด่วน", "Quick templates")}
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="theme-border rounded-full border px-3 py-1.5 text-xs font-medium text-[color:var(--app-text-muted)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                {tr("จำนวนเงิน (บาท)", "Amount (THB)")}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                className="theme-border w-full rounded-xl border bg-transparent px-4 py-3 text-sm text-[color:var(--app-text)] outline-none transition-all duration-200 focus:border-[#f54e00] focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                {tr("บัญชี", "Account")}
              </label>
              <Select
                value={accountId}
                onChange={setAccountId}
                options={accountOptions}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
              {tr("หมวดหมู่", "Category")}
            </label>
            <Select
              value={category}
              onChange={setCategory}
              options={[
                ...(type === "transfer"
                  ? []
                  : [{ value: "", label: tr("-- เลือกหมวดหมู่ --", "-- Select category --") }]),
                ...categories.map((value) => ({ value, label: value })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                {tr("วันที่", "Date")}
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="theme-border w-full rounded-md border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-[#f54e00]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                {tr("เวลา (ถ้ามี)", "Time (optional)")}
              </label>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="theme-border w-full rounded-md border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-[#f54e00]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
              {tr("หมายเหตุ", "Note")}
            </label>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={tr("รายละเอียดเพิ่มเติม...", "Additional details...")}
              className="theme-border w-full rounded-md border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-[#f54e00]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-[color:var(--app-divider-soft)] pt-4">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {tr("ยกเลิก", "Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy
              ? tr("กำลังบันทึก...", "Saving...")
              : initial
                ? tr("บันทึกการแก้ไข", "Save changes")
                : tr("บันทึกรายการ", "Save transaction")}
          </Button>
        </div>
      </div>
    </div>
  );
}
