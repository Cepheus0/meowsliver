"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  ChevronRight,
  PencilLine,
  Plus,
  Star,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  AccountFormModal,
  type AccountFormValues,
} from "@/components/accounts/AccountFormModal";
import { AccountIcon } from "@/components/accounts/AccountIcon";
import { useFinanceStore } from "@/store/finance-store";
import {
  type Account,
  type AccountType,
  type Transaction,
} from "@/lib/types";
import {
  formatBaht,
  formatBahtCompact,
  formatShortDate,
} from "@/lib/utils";
import { getAccountBalanceHistory } from "@/lib/account-history";
import { useAccountTypeLabels, useLanguage, useTr } from "@/lib/i18n";

type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; account: Account };

// Display order for the grouped list — matches the v2 mockup spec
// (assets first, liabilities last so the eye lands on net worth).
const TYPE_ORDER: AccountType[] = [
  "bank_savings",
  "cash",
  "bank_fixed",
  "credit_card",
  "investment",
  "crypto",
  "other",
];

export default function AccountsPage() {
  const accounts = useFinanceStore((s) => s.accounts);
  const transactions = useFinanceStore((s) => s.importedTransactions);
  const upsertAccount = useFinanceStore((s) => s.upsertAccount);
  const tr = useTr();
  const typeLabels = useAccountTypeLabels();

  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // selectedId === null means "use default", which the memo resolves below
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pendingArchive, setPendingArchive] = useState<Account | null>(null);

  const { active, archived, totals, grouped } = useMemo(() => {
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

    // Group by AccountType, preserving sortOrder within each group
    const grouped = TYPE_ORDER.map((type) => ({
      type,
      label: typeLabels[type],
      items: active.filter((a) => a.type === type),
    })).filter((g) => g.items.length > 0);

    return {
      active,
      archived,
      totals: { assets, liabilities, net },
      grouped,
    };
  }, [accounts, typeLabels]);

  // Resolved selection: explicit pick > default account > first active
  const selectedAccount = useMemo(() => {
    if (selectedId != null) {
      return active.find((a) => a.id === selectedId) ?? null;
    }
    return active.find((a) => a.isDefault) ?? active[0] ?? null;
  }, [active, selectedId]);

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
          values.type === "credit_card" ? (values.creditLimit ?? null) : null;
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
        throw new Error(
          data.error ?? tr("บันทึกบัญชีไม่สำเร็จ", "Failed to save account")
        );
      }

      if (values.isDefault) {
        accounts
          .filter((a) => a.isDefault && a.id !== data.account!.id)
          .forEach((a) => upsertAccount({ ...a, isDefault: false }));
      }
      upsertAccount(data.account);
      setModal({ mode: "closed" });
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : tr("ไม่สามารถบันทึกบัญชีได้", "Could not save account")
      );
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!pendingArchive) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/accounts/${pendingArchive.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        account?: Account;
        error?: string;
      };
      if (!response.ok || !data.account) {
        throw new Error(
          data.error ?? tr("ไม่สามารถเก็บบัญชีได้", "Could not archive account")
        );
      }
      upsertAccount(data.account);
      setSelectedId(null);
      setPendingArchive(null);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error
          ? e.message
          : tr("ไม่สามารถเก็บบัญชีได้", "Could not archive account")
      );
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
        throw new Error(
          data.error ?? tr("ไม่สามารถนำกลับมาใช้งานได้", "Could not restore")
        );
      }
      upsertAccount(data.account);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error
          ? e.message
          : tr("ไม่สามารถนำกลับมาใช้งานได้", "Could not restore")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr("ACCOUNTS · บัญชี", "ACCOUNTS")}
        title={
          <>
            {tr("บัญชีทั้งหมด", "All accounts")}
            <span className="text-[color:var(--app-brand-text)]">.</span>
          </>
        }
        description={tr(
          "จัดการบัญชีหลัก เงินสด บัตรเครดิต และพอร์ตย่อยในมุมมองเดียว พร้อมเลือกบัญชีเพื่อดูยอดและ activity ได้ทันที",
          "Manage primary accounts, cash, credit cards, and investment pockets in one workspace, then inspect balance and activity instantly."
        )}
        meta={[
          {
            icon: <Wallet size={14} />,
            label: tr(`${active.length} บัญชีใช้งาน`, `${active.length} active accounts`),
            tone: "brand",
          },
          {
            icon: <Archive size={14} />,
            label: tr(`${archived.length} บัญชีที่เก็บไว้`, `${archived.length} archived accounts`),
            tone: archived.length > 0 ? "neutral" : "default",
          },
          {
            label: tr(`สุทธิ ${formatBahtCompact(totals.net)}`, `Net ${formatBahtCompact(totals.net)}`),
            tone: totals.net >= 0 ? "success" : "danger",
          },
        ]}
        actions={
          <Button size="md" onClick={() => setModal({ mode: "create" })}>
            <Plus size={16} />
            {tr("เพิ่มบัญชี", "Add account")}
          </Button>
        }
      />

      {error && (
        <Card className="border-[color:var(--expense-soft)] bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]">
          <p className="text-sm font-medium">{error}</p>
        </Card>
      )}

      {active.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet size={20} />}
            title={tr("ยังไม่มีบัญชี", "No accounts yet")}
            description={tr(
              "เริ่มด้วยการเพิ่มเงินสดหรือบัญชีธนาคารหลักของคุณ แล้วค่อยเพิ่มบัตรเครดิตหรือพอร์ตลงทุนในภายหลัง",
              "Start by adding cash or your main bank account, then add credit cards or investment portfolios later."
            )}
          />
        </Card>
      ) : (
        // Master-detail: list (left) | hero panel + chart + activity (right)
        // On mobile both stack; on lg+ we get the v2 split layout.
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
          <div className="space-y-4">
            <NetPositionCard
              net={totals.net}
              assets={totals.assets}
              liabilities={totals.liabilities}
            />
            <AccountList
              grouped={grouped}
              selectedId={selectedAccount?.id ?? null}
              onSelect={(id) => setSelectedId(id)}
            />
          </div>
          <div className="space-y-4">
            {selectedAccount ? (
              <AccountDetailPanel
                account={selectedAccount}
                transactions={transactions}
                onEdit={() => setModal({ mode: "edit", account: selectedAccount })}
                onArchive={() => setPendingArchive(selectedAccount)}
              />
            ) : (
              <Card>
                <EmptyState
                  icon={<Wallet size={20} />}
                  title={tr("เลือกบัญชี", "Pick an account")}
                  description={tr(
                    "เลือกบัญชีจากรายการด้านซ้ายเพื่อดูยอดและประวัติการเคลื่อนไหว",
                    "Select an account from the list on the left to see its balance and activity."
                  )}
                />
              </Card>
            )}
          </div>
        </div>
      )}

      {archived.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[color:var(--app-text-muted)]">
            <Archive size={16} />
            {tr(
              `บัญชีที่เก็บขึ้นหิ้ง (${archived.length})`,
              `Archived accounts (${archived.length})`
            )}
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
                        {typeLabels[account.type]} ·{" "}
                        {formatBaht(account.currentBalance)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleUnarchive(account)}
                      disabled={busy}
                    >
                      <ArchiveRestore size={14} />
                      {tr("กู้คืน", "Restore")}
                    </Button>
                  </div>
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

      <ConfirmDialog
        open={pendingArchive !== null}
        busy={busy}
        tone="warning"
        title={tr("เก็บบัญชีนี้ขึ้นหิ้ง?", "Archive this account?")}
        description={
          pendingArchive
            ? tr(
                `"${pendingArchive.name}" จะถูกย้ายไปหมวดบัญชีที่เก็บไว้ คุณสามารถกู้คืนได้ภายหลัง`,
                `"${pendingArchive.name}" will move to archived accounts. You can restore it later.`
              )
            : undefined
        }
        confirmLabel={tr("เก็บขึ้นหิ้ง", "Archive")}
        onCancel={() => setPendingArchive(null)}
        onConfirm={handleArchive}
      />
    </div>
  );
}

/* =========================================================================
 * Net position summary card — 3 sections (net | assets | liabilities)
 * ========================================================================= */

function NetPositionCard({
  net,
  assets,
  liabilities,
}: {
  net: number;
  assets: number;
  liabilities: number;
}) {
  return (
    <Card className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
        Net Position
      </p>
      <p className="font-[family-name:var(--font-geist-mono)] text-3xl font-bold text-[color:var(--app-text)]">
        {formatBaht(net)}
      </p>
      <div className="grid grid-cols-2 gap-3 border-t border-[color:var(--app-divider)] pt-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--income-text)]">
            Assets
          </p>
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--app-text)]">
            {formatBahtCompact(assets)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--expense-text)]">
            Liabilities
          </p>
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--app-text)]">
            {formatBahtCompact(liabilities)}
          </p>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
 * Grouped account list (master pane)
 * ========================================================================= */

function AccountList({
  grouped,
  selectedId,
  onSelect,
}: {
  grouped: { type: AccountType; label: string; items: Account[] }[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.type} className="space-y-1.5">
          <p className="px-1 text-xs font-medium text-[color:var(--app-text-subtle)]">
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.items.map((account) => (
              <AccountListItem
                key={account.id}
                account={account}
                isSelected={account.id === selectedId}
                onClick={() => onSelect(account.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AccountListItem({
  account,
  isSelected,
  onClick,
}: {
  account: Account;
  isSelected: boolean;
  onClick: () => void;
}) {
  const balance = account.currentBalance;
  const isNegative = balance < 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
        isSelected
          ? "border-[color:var(--app-text)] bg-[color:var(--app-surface)] shadow-[var(--app-card-shadow)]"
          : "border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)]/60 hover:border-[color:var(--app-border-strong)] hover:bg-[color:var(--app-surface)]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${account.color}20` }}
        >
          <AccountIcon
            icon={account.icon}
            type={account.type}
            size={16}
            className="text-[color:var(--app-text)]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-[color:var(--app-text)]">
              {account.name}
            </p>
            {account.isDefault && (
              <Star
                size={10}
                className="shrink-0 fill-current text-[color:var(--app-brand-text)]"
              />
            )}
          </div>
          <p
            className={`mt-0.5 font-[family-name:var(--font-geist-mono)] text-xs ${
              isNegative
                ? "text-[color:var(--expense-text)]"
                : "text-[color:var(--income-text)]"
            }`}
          >
            {balance >= 0 ? "+" : ""}
            {formatBaht(balance)}
          </p>
        </div>
      </div>
    </button>
  );
}

/* =========================================================================
 * Detail pane: hero balance + 24-month sparkline + recent activity
 * ========================================================================= */

function AccountDetailPanel({
  account,
  transactions,
  onEdit,
  onArchive,
}: {
  account: Account;
  transactions: Transaction[];
  onEdit: () => void;
  onArchive: () => void;
}) {
  const tr = useTr();
  const language = useLanguage();
  const typeLabels = useAccountTypeLabels();
  const isNegative = account.currentBalance < 0;
  const accentColor = account.color;

  // Compute history + recent activity in one pass per selection
  const history = useMemo(
    () => getAccountBalanceHistory(account, transactions, 24),
    [account, transactions]
  );

  const recent = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (tx.accountId === account.id) return true;
        const payFrom = tx.payFrom?.trim().toLowerCase();
        if (!payFrom) return false;
        if (payFrom === account.name.trim().toLowerCase()) return true;
        return account.aliases.some(
          (a) => a.trim().toLowerCase() === payFrom
        );
      })
      .slice()
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.time ?? "").localeCompare(a.time ?? "");
      })
      .slice(0, 15);
  }, [account, transactions]);

  return (
    <>
      {/* Hero balance — full color tint, large mono number */}
      <div
        className="relative overflow-hidden rounded-lg border p-6 shadow-[var(--app-card-shadow)]"
        style={{
          background: isNegative
            ? "color-mix(in srgb, var(--expense) 85%, black 15%)"
            : `color-mix(in srgb, ${accentColor} 90%, black 10%)`,
          borderColor: "transparent",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              {typeLabels[account.type]}
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              {account.name}
            </h2>
            {account.isDefault && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                <Star size={10} className="fill-current" />
                {tr("บัญชีหลัก", "Primary")}
              </span>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <AccountIcon
              icon={account.icon}
              type={account.type}
              size={22}
              className="text-white"
            />
          </div>
        </div>
        <div className="mt-6">
          <p className="text-xs uppercase tracking-wide text-white/70">
            Balance
          </p>
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-4xl font-bold text-white">
            {account.currentBalance >= 0 ? "+" : ""}
            {formatBaht(account.currentBalance)}
          </p>
          {account.type === "credit_card" && account.creditLimit != null && (
            <p className="mt-2 text-xs text-white/80">
              {tr("วงเงิน", "Limit")} {formatBaht(account.creditLimit)} ·{" "}
              {tr("เหลือ", "Available")}{" "}
              {formatBaht(account.creditLimit + account.currentBalance)}
            </p>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/accounts/${account.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25"
          >
            <ArrowRight size={12} />
            {tr("ดูรายละเอียด", "View details")}
          </Link>
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25"
          >
            <PencilLine size={12} />
            {tr("แก้ไข", "Edit")}
          </button>
          <button
            onClick={onArchive}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500/70"
            title={tr("เก็บบัญชีนี้ขึ้นหิ้ง", "Archive this account")}
          >
            <Archive size={12} />
            {tr("เก็บ", "Archive")}
          </button>
        </div>
      </div>

      {/* Balance history sparkline */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
              Balance History
            </p>
            <p className="mt-0.5 text-sm italic text-[color:var(--app-text-muted)]">
              {tr("24 เดือนที่ผ่านมา", "Last 24 months")}
            </p>
          </div>
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={history}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`fill-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="monthKey" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                cursor={{ stroke: "var(--app-border-strong)", strokeWidth: 1 }}
                contentStyle={{
                  background: "var(--app-surface)",
                  border: "1px solid var(--app-border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--app-text)",
                }}
                formatter={(value) => [
                  formatBaht(Number(value)),
                  tr("ยอด", "Balance"),
                ]}
                labelFormatter={(label) => String(label)}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={accentColor}
                strokeWidth={2}
                fill={`url(#fill-${account.id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent activity (15 latest) */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
              Recent Activity
            </p>
            <p className="mt-0.5 text-sm italic text-[color:var(--app-text-muted)]">
              {tr("รายการล่าสุด", "Latest entries")}
            </p>
          </div>
          <p className="text-xs text-[color:var(--app-text-subtle)]">
            {tr(`${recent.length} รายการ`, `${recent.length} entries`)}
          </p>
        </div>

        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-[color:var(--app-text-muted)]">
            {tr(
              "ยังไม่มีรายการที่เชื่อมกับบัญชีนี้",
              "No transactions linked to this account yet"
            )}
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--app-divider)]">
            {recent.map((tx) => (
              <li key={tx.id} className="flex items-center gap-3 py-2.5">
                <div className="w-12 shrink-0 text-xs text-[color:var(--app-text-subtle)]">
                  {formatShortDate(tx.date, language)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[color:var(--app-text)]">
                    {tx.note || tx.recipient || tx.category}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[color:var(--app-text-subtle)]">
                    {tx.category}
                    {tx.subcategory ? ` · ${tx.subcategory}` : ""}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-[family-name:var(--font-geist-mono)] text-sm font-semibold ${
                    tx.type === "income"
                      ? "text-[color:var(--income-text)]"
                      : tx.type === "expense"
                        ? "text-[color:var(--expense-text)]"
                        : "text-[color:var(--app-text-muted)]"
                  }`}
                >
                  {tx.type === "income" ? "+" : tx.type === "expense" ? "−" : ""}
                  {formatBaht(tx.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}

        {recent.length > 0 && (
          <div className="mt-3 flex justify-end border-t border-[color:var(--app-divider)] pt-3">
            <Link
              href={`/accounts/${account.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
            >
              {tr("ดูทั้งหมดในหน้าบัญชีนี้", "See all on this account")}
              <ChevronRight size={12} />
            </Link>
          </div>
        )}
      </Card>
    </>
  );
}
