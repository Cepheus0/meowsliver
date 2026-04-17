"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPE_ICONS,
  ACCOUNT_TYPE_LABELS,
  type Account,
  type AccountType,
} from "@/lib/types";

export interface AccountFormValues {
  name: string;
  type: AccountType;
  initialBalance: number;
  creditLimit?: number;
  notes?: string;
  aliases: string[];
  isDefault: boolean;
}

interface AccountFormModalProps {
  onClose: () => void;
  onSubmit: (values: AccountFormValues) => Promise<void> | void;
  initial?: Account | null;
  busy?: boolean;
}

const TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function AccountFormModal({
  onClose,
  onSubmit,
  initial,
  busy,
}: AccountFormModalProps) {
  // Initial state is derived once from `initial` at mount. Callers must
  // remount the modal (via `key` or conditional render) when switching between
  // create/edit or between different accounts to reset the form.
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "cash");
  const [initialBalance, setInitialBalance] = useState(
    initial?.currentBalance != null ? String(initial.currentBalance) : ""
  );
  const [creditLimit, setCreditLimit] = useState(
    initial?.creditLimit != null ? String(initial.creditLimit) : ""
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [aliasesText, setAliasesText] = useState(
    initial?.aliases.join(", ") ?? ""
  );
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("กรุณาระบุชื่อบัญชี");
      return;
    }
    const balance = Number(initialBalance || 0);
    if (!Number.isFinite(balance)) {
      setError("ยอดเงินต้องเป็นตัวเลข");
      return;
    }
    const parsedCreditLimit =
      creditLimit.trim() === "" ? undefined : Number(creditLimit);
    if (parsedCreditLimit != null && !Number.isFinite(parsedCreditLimit)) {
      setError("วงเงินบัตรต้องเป็นตัวเลข");
      return;
    }

    const aliases = aliasesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setError(null);
    await onSubmit({
      name: trimmedName,
      type,
      initialBalance: balance,
      creditLimit: parsedCreditLimit,
      notes: notes.trim() || undefined,
      aliases,
      isDefault,
    });
  };

  const typeColor = ACCOUNT_TYPE_COLORS[type];
  const typeIcon = ACCOUNT_TYPE_ICONS[type];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--app-overlay)] p-0 sm:items-center sm:p-4">
      <div className="theme-border theme-surface-strong w-full max-w-xl rounded-t-xl border p-6 shadow-[var(--app-card-shadow)] sm:rounded-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[color:var(--app-text)]">
            {initial ? "แก้ไขบัญชี" : "เพิ่มบัญชีใหม่"}
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
          <div className="mb-3 rounded-md border border-red-300/60 bg-red-50/60 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
              ชื่อบัญชี
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น SCB, K-Bank, เงินสด"
              className="theme-border w-full rounded-md border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-[#f54e00]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
              ประเภท
            </label>
            <Select
              value={type}
              onChange={(v) => setType(v as AccountType)}
              options={TYPE_OPTIONS}
            />
            <p className="mt-1 text-xs text-[color:var(--app-text-subtle)]">
              ไอคอนและสีเริ่มต้น:{" "}
              <span style={{ color: typeColor }}>●</span> {typeIcon}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                ยอดคงเหลือ (บาท)
              </label>
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0"
                className="theme-border w-full rounded-md border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-[#f54e00]"
              />
            </div>

            {type === "credit_card" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                  วงเงิน (บาท)
                </label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="100000"
                  className="theme-border w-full rounded-md border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-[#f54e00]"
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
              ชื่อเรียกอื่น (Aliases) — คั่นด้วย ,
            </label>
            <input
              value={aliasesText}
              onChange={(e) => setAliasesText(e.target.value)}
              placeholder="เช่น Kbank, ไทยพาณิชย์"
              className="theme-border w-full rounded-md border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-[#f54e00]"
            />
            <p className="mt-1 text-xs text-[color:var(--app-text-subtle)]">
              ใช้จับคู่กับฟิลด์ payFrom ตอน import อัตโนมัติ
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
              บันทึก
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="theme-border w-full rounded-md border bg-transparent px-4 py-2.5 text-sm text-[color:var(--app-text)] outline-none focus:border-[#f54e00]"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-4 py-3">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 accent-orange-600"
            />
            <div>
              <p className="text-sm font-medium text-[color:var(--app-text)]">
                ตั้งเป็นบัญชีหลัก
              </p>
              <p className="text-xs text-[color:var(--app-text-subtle)]">
                ใช้เป็นบัญชีสำรองเมื่อ import ไม่สามารถจับคู่ payFrom ได้
              </p>
            </div>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? "กำลังบันทึก..." : initial ? "บันทึกการแก้ไข" : "สร้างบัญชี"}
          </Button>
        </div>
      </div>
    </div>
  );
}
