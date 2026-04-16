"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useFinanceStore } from "@/store/finance-store";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, QUICK_TEMPLATES } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ManualEntryFAB() {
  const { addTransaction } = useFinanceStore();
  const nextManualId = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const categories = txType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSave = () => {
    const transactionId = `manual-${nextManualId.current}`;
    nextManualId.current += 1;

    addTransaction({
      id: transactionId,
      date,
      amount: Number(amount),
      category,
      type: txType,
      note: note || undefined,
    });
    setIsOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setAmount("");
    setCategory("");
    setNote("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const applyTemplate = (tpl: (typeof QUICK_TEMPLATES)[number]) => {
    setTxType(tpl.type);
    setCategory(tpl.category);
    if (tpl.amount > 0) setAmount(String(tpl.amount));
    setNote(tpl.label);
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-transform hover:scale-110 hover:bg-emerald-700 active:scale-95"
      >
        <Plus size={28} />
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--app-overlay)] sm:items-center">
          <div className="theme-border theme-surface-strong w-full max-w-lg rounded-t-3xl border p-6 shadow-[var(--app-card-shadow)] sm:rounded-3xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[color:var(--app-text)]">
                บันทึกรายการใหม่
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-[color:var(--app-text-subtle)] hover:bg-[color:var(--app-surface-soft)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Income / Expense Toggle */}
            <div className="mb-4 flex rounded-xl bg-[color:var(--app-surface-soft)] p-1">
              <button
                onClick={() => setTxType("expense")}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                  txType === "expense"
                    ? "bg-red-500 text-white shadow"
                    : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                )}
              >
                รายจ่าย
              </button>
              <button
                onClick={() => setTxType("income")}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                  txType === "income"
                    ? "bg-emerald-500 text-white shadow"
                    : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                )}
              >
                รายรับ
              </button>
            </div>

            {/* Quick Templates */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-[color:var(--app-text-muted)]">
                เทมเพลตด่วน
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => applyTemplate(tpl)}
                    className="theme-border rounded-lg border px-3 py-1.5 text-xs font-medium text-[color:var(--app-text-muted)] transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                  จำนวนเงิน (บาท)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="theme-border w-full rounded-xl border bg-transparent px-4 py-2.5 text-lg font-bold text-[color:var(--app-text)] outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                  หมวดหมู่
                </label>
                <Select
                  value={category}
                  onChange={setCategory}
                  options={[
                    { value: "", label: "-- เลือกหมวด --" },
                    ...categories.map((cat) => ({ value: cat, label: cat })),
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                    วันที่
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="theme-border w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                    หมายเหตุ
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="รายละเอียด..."
                    className="theme-border w-full rounded-xl border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-5">
              <Button
                onClick={handleSave}
                disabled={!amount || !category}
                className="w-full py-3 text-base"
              >
                บันทึก
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
