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
      { value: "", label: activeAccounts.length > 0 ? "ใช้บัญชีหลักอัตโนมัติ" : "สร้าง/ใช้บัญชีหลักอัตโนมัติ" },
      ...activeAccounts.map((account) => ({
        value: String(account.id),
        label: account.isDefault ? `${account.name} (บัญชีหลัก)` : account.name,
      })),
    ],
    [activeAccounts]
  );

  const handleSave = async () => {
    const parsedAmount = Number(amount);
    if (!date) {
      setError("กรุณาระบุวันที่");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("กรุณาระบุจำนวนเงินที่มากกว่า 0");
      return;
    }
    if (!category.trim()) {
      setError("กรุณาระบุหมวดหมู่");
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
          : "ไม่สามารถบันทึกรายการได้"
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--app-overlay)] p-0 sm:items-center sm:p-4">
      <div className="theme-border theme-surface-strong w-full max-w-xl rounded-t-xl border p-6 shadow-[var(--app-card-shadow)] sm:rounded-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[color:var(--app-text)]">
            {initial ? "แก้ไขรายการ" : "บันทึกรายการใหม่"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[color:var(--app-text-subtle)] hover:bg-[color:var(--app-surface-soft)]"
            aria-label="ปิด"
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
          <div className="flex rounded-md bg-[color:var(--app-surface-soft)] p-1">
            {([
              { value: "expense", label: "รายจ่าย", activeClass: "bg-[color:var(--expense)] text-white shadow" },
              { value: "income", label: "รายรับ", activeClass: "bg-[color:var(--income)] text-white shadow" },
              { value: "transfer", label: "ย้ายเงิน", activeClass: "bg-[color:var(--app-brand)] text-white shadow" },
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
                  "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
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
                เทมเพลตด่วน
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="theme-border rounded-lg border px-3 py-1.5 text-xs font-medium text-[color:var(--app-text-muted)] transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
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
                จำนวนเงิน (บาท)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0"
                className="theme-border w-full rounded-md border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-[#f54e00]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                บัญชี
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
              หมวดหมู่
            </label>
            <Select
              value={category}
              onChange={setCategory}
              options={[
                ...(type === "transfer"
                  ? []
                  : [{ value: "", label: "-- เลือกหมวดหมู่ --" }]),
                ...categories.map((value) => ({ value, label: value })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                วันที่
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
                เวลา (ถ้ามี)
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
              หมายเหตุ
            </label>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="รายละเอียดเพิ่มเติม..."
              className="theme-border w-full rounded-md border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-[#f54e00]"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? "กำลังบันทึก..." : initial ? "บันทึกการแก้ไข" : "บันทึกรายการ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
