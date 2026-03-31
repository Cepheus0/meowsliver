"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 sm:rounded-3xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
                บันทึกรายการใหม่
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Income / Expense Toggle */}
            <div className="mb-4 flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                onClick={() => setTxType("expense")}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                  txType === "expense"
                    ? "bg-red-500 text-white shadow"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
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
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                )}
              >
                รายรับ
              </button>
            </div>

            {/* Quick Templates */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                เทมเพลตด่วน
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => applyTemplate(tpl)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  จำนวนเงิน (บาท)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-lg font-bold text-zinc-800 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  หมวดหมู่
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:text-zinc-100"
                >
                  <option value="">-- เลือกหมวด --</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    วันที่
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    หมายเหตุ
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="รายละเอียด..."
                    className="w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm text-zinc-800 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:text-zinc-100"
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
