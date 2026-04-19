"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPE_ICONS,
  type Account,
  type AccountType,
} from "@/lib/types";
import { useAccountTypeLabels, useTr } from "@/lib/i18n";

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

export function AccountFormModal({
  onClose,
  onSubmit,
  initial,
  busy,
}: AccountFormModalProps) {
  const tr = useTr();
  const typeLabels = useAccountTypeLabels();
  const typeOptions = useMemo(
    () =>
      Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
    [typeLabels]
  );
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
      setError(tr("กรุณาระบุชื่อบัญชี", "Please enter an account name"));
      return;
    }
    const balance = Number(initialBalance || 0);
    if (!Number.isFinite(balance)) {
      setError(tr("ยอดเงินต้องเป็นตัวเลข", "Balance must be a number"));
      return;
    }
    const parsedCreditLimit =
      creditLimit.trim() === "" ? undefined : Number(creditLimit);
    if (parsedCreditLimit != null && !Number.isFinite(parsedCreditLimit)) {
      setError(
        tr("วงเงินบัตรต้องเป็นตัวเลข", "Credit limit must be a number")
      );
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--app-overlay)]/90 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="theme-border theme-surface-strong w-full max-w-xl rounded-t-[28px] border p-6 shadow-[0_32px_80px_-48px_rgba(0,0,0,0.55)] sm:rounded-[28px]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[color:var(--app-text)]">
            {initial
              ? tr("แก้ไขบัญชี", "Edit account")
              : tr("เพิ่มบัญชีใหม่", "Add new account")}
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
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
              {tr("ชื่อบัญชี", "Account name")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr("เช่น SCB, K-Bank, เงินสด", "e.g. SCB, K-Bank, Cash")}
              className="theme-border w-full rounded-xl border bg-transparent px-4 py-3 text-sm text-[color:var(--app-text)] outline-none transition-all duration-200 focus:border-[#f54e00] focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
              {tr("ประเภท", "Type")}
            </label>
            <Select
              value={type}
              onChange={(v) => setType(v as AccountType)}
              options={typeOptions}
            />
            <p className="mt-1 text-xs text-[color:var(--app-text-subtle)]">
              {tr("ไอคอนและสีเริ่มต้น:", "Default icon and color:")}{" "}
              <span style={{ color: typeColor }}>●</span> {typeIcon}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                {tr("ยอดคงเหลือ (บาท)", "Current balance (THB)")}
              </label>
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0"
                className="theme-border w-full rounded-xl border bg-transparent px-4 py-3 text-sm text-[color:var(--app-text)] outline-none transition-all duration-200 focus:border-[#f54e00] focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            {type === "credit_card" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
                  {tr("วงเงิน (บาท)", "Credit limit (THB)")}
                </label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="100000"
                  className="theme-border w-full rounded-xl border bg-transparent px-4 py-3 text-sm text-[color:var(--app-text)] outline-none transition-all duration-200 focus:border-[#f54e00] focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
              {tr(
                "ชื่อเรียกอื่น (Aliases) — คั่นด้วย ,",
                "Aliases — separate with ,"
              )}
            </label>
            <input
              value={aliasesText}
              onChange={(e) => setAliasesText(e.target.value)}
              placeholder={tr(
                "เช่น Kbank, ไทยพาณิชย์",
                "e.g. Kbank, SCB Bank"
              )}
              className="theme-border w-full rounded-xl border bg-transparent px-4 py-3 text-sm text-[color:var(--app-text)] outline-none transition-all duration-200 focus:border-[#f54e00] focus:ring-2 focus:ring-orange-500/20"
            />
            <p className="mt-1 text-xs text-[color:var(--app-text-subtle)]">
              {tr(
                "ใช้จับคู่กับฟิลด์ payFrom ตอน import อัตโนมัติ",
                "Used to auto-match the payFrom field during import"
              )}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--app-text-muted)]">
              {tr("บันทึก", "Notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="theme-border w-full rounded-xl border bg-transparent px-4 py-3 text-sm text-[color:var(--app-text)] outline-none transition-all duration-200 focus:border-[#f54e00] focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-4 py-3">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 accent-orange-600"
            />
            <div>
              <p className="text-sm font-medium text-[color:var(--app-text)]">
                {tr("ตั้งเป็นบัญชีหลัก", "Set as primary account")}
              </p>
              <p className="text-xs text-[color:var(--app-text-subtle)]">
                {tr(
                  "ใช้เป็นบัญชีสำรองเมื่อ import ไม่สามารถจับคู่ payFrom ได้",
                  "Used as fallback when import can't match payFrom"
                )}
              </p>
            </div>
          </label>
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
                : tr("สร้างบัญชี", "Create account")}
          </Button>
        </div>
      </div>
    </div>
  );
}
