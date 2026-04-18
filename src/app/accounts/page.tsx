"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  ArrowUpDown,
  Plus,
  Star,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AccountFormModal,
  type AccountFormValues,
} from "@/components/accounts/AccountFormModal";
import { AccountIcon } from "@/components/accounts/AccountIcon";
import { useFinanceStore } from "@/store/finance-store";
import { ACCOUNT_TYPE_LABELS, type Account } from "@/lib/types";
import { formatBaht } from "@/lib/utils";

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; account: Account };

export default function AccountsPage() {
  const accounts = useFinanceStore((s) => s.accounts);
  const upsertAccount = useFinanceStore((s) => s.upsertAccount);
  const removeAccount = useFinanceStore((s) => s.removeAccount);

  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { active, archived, totals } = useMemo(() => {
    const active = accounts
      .filter((a) => !a.isArchived)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const archived = accounts
      .filter((a) => a.isArchived)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    const assets = active
      .filter((a) => a.currentBalance > 0)
      .reduce((sum, a) => sum + a.currentBalance, 0);
    const liabilities = active
      .filter((a) => a.currentBalance < 0)
      .reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);
    const net = active.reduce((sum, a) => sum + a.currentBalance, 0);

    return {
      active,
      archived,
      totals: { assets, liabilities, net },
    };
  }, [accounts]);

  const handleSubmit = async (values: AccountFormValues) => {
    setBusy(true);
    setError(null);
    try {
      const isEdit = modal.mode === "edit";
      const url = isEdit
        ? `/api/accounts/${modal.account.id}`
        : "/api/accounts";
      const method = isEdit ? "PATCH" : "POST";

      const payload: Record<string, unknown> = {
        name: values.name,
        type: values.type,
        aliases: values.aliases,
        isDefault: values.isDefault,
        notes: values.notes ?? null,
      };

      if (isEdit) {
        payload.currentBalance = values.initialBalance;
        payload.creditLimit =
          values.type === "credit_card"
            ? (values.creditLimit ?? null)
            : null;
      } else {
        payload.initialBalance = values.initialBalance;
        if (values.type === "credit_card" && values.creditLimit != null) {
          payload.creditLimit = values.creditLimit;
        }
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        account?: Account;
        error?: string;
      };

      if (!response.ok || !data.account) {
        throw new Error(data.error ?? "บันทึกบัญชีไม่สำเร็จ");
      }

      // If we just set a new default, clear the old one in local state
      if (values.isDefault) {
        accounts
          .filter((a) => a.isDefault && a.id !== data.account!.id)
          .forEach((a) =>
            upsertAccount({ ...a, isDefault: false })
          );
      }
      upsertAccount(data.account);
      setModal({ mode: "closed" });
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถบันทึกบัญชีได้"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async (account: Account) => {
    if (!confirm(`เก็บบัญชี "${account.name}" ขึ้นหิ้ง?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("archive failed");
      upsertAccount({ ...account, isArchived: true, isDefault: false });
    } catch (e) {
      console.error(e);
      setError("ไม่สามารถเก็บบัญชีได้");
    } finally {
      setBusy(false);
    }
  };

  const handleUnarchive = async (account: Account) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      });
      const data = (await response.json()) as {
        account?: Account;
        error?: string;
      };
      if (!response.ok || !data.account) {
        throw new Error(data.error ?? "ไม่สามารถนำกลับมาใช้งานได้");
      }
      upsertAccount(data.account);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "ไม่สามารถนำกลับมาใช้งานได้");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--app-text)]">
            บัญชี / Asset Buckets
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[color:var(--app-text-muted)]">
            จัดการกระเป๋าเงิน บัญชีธนาคาร บัตรเครดิต และพอร์ตลงทุน — แยกยอดแต่ละใบให้ชัด
            เวลา import ระบบจะจับคู่ payFrom ให้อัตโนมัติ
          </p>
        </div>
        <Button size="md" onClick={() => setModal({ mode: "create" })}>
          <Plus size={16} />
          เพิ่มบัญชี
        </Button>
      </div>

      {error && (
        <Card className="border-[color:var(--expense-soft)] bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]">
          <p className="text-sm font-medium">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
            Net Worth
          </p>
          <p className="mt-2 text-2xl font-bold text-[color:var(--app-text)]">
            {formatBaht(totals.net)}
          </p>
          <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
            {active.length} บัญชีที่ใช้งาน
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
            สินทรัพย์รวม
          </p>
          <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--income-text)]">
            {formatBaht(totals.assets)}
          </p>
          <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
            รวมเงินสด ออมทรัพย์ การลงทุน
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
            หนี้สินรวม
          </p>
          <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--expense-text)]">
            {formatBaht(totals.liabilities)}
          </p>
          <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
            บัตรเครดิต/เงินกู้ที่คงค้าง
          </p>
        </Card>
      </div>

      {active.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet size={20} />}
            title="ยังไม่มีบัญชี"
            description="เริ่มด้วยการเพิ่มเงินสดหรือบัญชีธนาคารหลักของคุณ แล้วค่อยเพิ่มบัตรเครดิตหรือพอร์ตลงทุนในภายหลัง — กด “เพิ่มบัญชี” ด้านบนขวาเพื่อเริ่มต้น"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={() => setModal({ mode: "edit", account })}
              onArchive={() => handleArchive(account)}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[color:var(--app-text-muted)]">
            <Archive size={16} />
            บัญชีที่เก็บขึ้นหิ้ง ({archived.length})
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {archived.map((account) => (
              <Card
                key={account.id}
                className="opacity-60 transition-opacity hover:opacity-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${account.color}20` }}
                    >
                      <AccountIcon
                        icon={account.icon}
                        type={account.type}
                        size={18}
                        className="text-[color:var(--app-text)]"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-[color:var(--app-text)]">
                        {account.name}
                      </p>
                      <p className="text-xs text-[color:var(--app-text-muted)]">
                        {ACCOUNT_TYPE_LABELS[account.type]} ·{" "}
                        {formatBaht(account.currentBalance)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleUnarchive(account)}
                    disabled={busy}
                  >
                    กู้คืน
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {modal.mode !== "closed" && (
        <AccountFormModal
          key={modal.mode === "edit" ? `edit-${modal.account.id}` : "create"}
          onClose={() => setModal({ mode: "closed" })}
          onSubmit={handleSubmit}
          initial={modal.mode === "edit" ? modal.account : null}
          busy={busy}
        />
      )}
    </div>
  );
}

function AccountCard({
  account,
  onEdit,
  onArchive,
}: {
  account: Account;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const balance = account.currentBalance;
  const isNegative = balance < 0;

  return (
    <Card className="group relative overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-[var(--app-card-shadow)]">
      <Link href={`/accounts/${account.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${account.color}20` }}
            >
              <AccountIcon
                icon={account.icon}
                type={account.type}
                size={22}
                className="text-[color:var(--app-text)]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-base font-semibold text-[color:var(--app-text)]">
                  {account.name}
                </p>
                {account.isDefault && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      color: account.color,
                      backgroundColor: `${account.color}18`,
                    }}
                  >
                    <Star size={10} />
                    หลัก
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[color:var(--app-text-muted)]">
                {ACCOUNT_TYPE_LABELS[account.type]}
              </p>
            </div>
          </div>
          <div
            className="rounded-lg p-1.5 text-[color:var(--app-text-subtle)] opacity-0 transition-opacity group-hover:bg-[color:var(--app-surface-soft)] group-hover:opacity-100"
          >
            <ArrowRight size={16} />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-[color:var(--app-text-muted)]">ยอดคงเหลือ</p>
          <p
            className={`mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold ${
              isNegative
                ? "text-[color:var(--expense-text)]"
                : "text-[color:var(--app-text)]"
            }`}
          >
            {formatBaht(balance)}
          </p>
          {account.type === "credit_card" && account.creditLimit != null && (
            <p className="mt-1 text-xs text-[color:var(--app-text-muted)]">
              วงเงิน {formatBaht(account.creditLimit)} · เหลือ{" "}
              {formatBaht(account.creditLimit + balance)}
            </p>
          )}
        </div>

        {account.aliases.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {account.aliases.slice(0, 4).map((alias) => (
              <span
                key={alias}
                className="rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-2 py-0.5 text-[11px] text-[color:var(--app-text-muted)]"
              >
                {alias}
              </span>
            ))}
            {account.aliases.length > 4 && (
              <span className="text-[11px] text-[color:var(--app-text-subtle)]">
                +{account.aliases.length - 4}
              </span>
            )}
          </div>
        )}
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-[color:var(--app-border)] px-5 py-3">
        <Button size="sm" variant="ghost" onClick={onEdit}>
          แก้ไข
        </Button>
        <div className="flex items-center gap-1">
          <Link
            href={`/accounts/${account.id}`}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
          >
            <ArrowUpDown size={12} />
            ดูรายการ
          </Link>
          <Button size="sm" variant="ghost" onClick={onArchive}>
            <Archive size={12} />
            เก็บ
          </Button>
        </div>
      </div>
    </Card>
  );
}
