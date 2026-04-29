"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Hash,
  PencilLine,
  RotateCcw,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
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
  type AccountReconciliation,
} from "@/lib/types";
import { formatBaht } from "@/lib/utils";
import { useTr, useLanguage, useAccountTypeLabels } from "@/lib/i18n";

interface AccountDetailResponse {
  account: Account;
  reconciliation: AccountReconciliation;
  recentTransactions: Array<{
    id: number;
    date: string;
    time: string | null;
    amount: number;
    type: "income" | "expense" | "transfer";
    category: string;
    note: string | null;
  }>;
  transactionCount: number;
}

function buildReconciliationStatusMeta(
  tr: (th: string, en: string) => string
): Record<
  AccountReconciliation["status"],
  {
    label: string;
    className: string;
    description: string;
  }
> {
  return {
    aligned: {
      label: tr(
        "linked rows ตรงกับ snapshot",
        "Linked rows match snapshot"
      ),
      className:
        "bg-[color:var(--income-soft)] text-[color:var(--income-text)]",
      description: tr(
        "stored balance snapshot ตรงกับยอดที่ derive จากรายการที่ตั้งใจผูกกับบัญชีนี้",
        "The stored balance snapshot matches the value derived from rows intentionally linked to this account."
      ),
    },
    needs_attention: {
      label: tr(
        "legacy linked rows ต่างจาก snapshot",
        "Legacy linked rows differ from snapshot"
      ),
      className: "bg-[color:var(--neutral-soft)] text-[color:var(--neutral)]",
      description: tr(
        "บัญชีนี้ยังมีรายการ legacy ที่ผูกไว้และทำให้ยอด linked rows ต่างจาก stored snapshot ควร cleanup หรือ unlink ก่อนใช้ reconciliation",
        "This account still has legacy linked rows that differ from the stored snapshot. Clean up or unlink them before using reconciliation."
      ),
    },
    no_linked_transactions: {
      label: tr("ใช้ยอดบัญชีเป็น snapshot", "Balance snapshot only"),
      className:
        "bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)]",
      description: tr(
        "รายการนำเข้าจากเหมียวจดไม่ได้ผูกกับบัญชีโดยอัตโนมัติ เพราะข้อมูลบัญชีต้นทางอาจคลาดเคลื่อน ระบบจึงใช้ยอดบัญชีนี้เป็น snapshot แยกจาก cashflow",
        "Meowjot imports are not automatically linked to accounts because source-account data may be inaccurate. This account balance is treated as a snapshot separate from cashflow."
      ),
    },
  };
}

function formatAccountDate(date?: string, language: "th" | "en" = "th") {
  if (!date) return "—";

  const locale = language === "en" ? "en-US" : "th-TH";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(`${date}T00:00:00`));
}

function formatBalanceDifference(
  value: number,
  tr: (th: string, en: string) => string
) {
  if (Math.abs(value) < 0.01) {
    return tr("ไม่มีส่วนต่าง", "No difference");
  }

  return `${value > 0 ? "+" : "-"}${formatBaht(Math.abs(value))}`;
}

export default function AccountDetailPage() {
  const params = useParams<{ accountId: string }>();
  const router = useRouter();
  const accountId = Number(params?.accountId);
  const tr = useTr();
  const language = useLanguage();
  const accountTypeLabels = useAccountTypeLabels();
  const reconciliationStatusMeta = buildReconciliationStatusMeta(tr);

  const upsertAccount = useFinanceStore((s) => s.upsertAccount);
  const accounts = useFinanceStore((s) => s.accounts);
  const selectedYear = useFinanceStore((s) => s.selectedYear);

  const [detail, setDetail] = useState<AccountDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadDetail = useMemo(
    () => async () => {
      if (!Number.isInteger(accountId) || accountId <= 0) {
        setError(tr("ไม่พบบัญชีนี้", "Account not found"));
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`/api/accounts/${accountId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to load account");
        }
        const data = (await response.json()) as AccountDetailResponse;
        setDetail(data);
        upsertAccount(data.account);
        setError(null);
      } catch (loadError) {
        console.error(loadError);
        setError(tr("ไม่สามารถโหลดบัญชีได้", "Could not load account"));
      } finally {
        setIsLoading(false);
      }
    },
    [accountId, upsertAccount, tr]
  );

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleEditSubmit = async (values: AccountFormValues) => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/accounts/${detail.account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          type: values.type,
          currentBalance: values.initialBalance,
          creditLimit:
            values.type === "credit_card" ? (values.creditLimit ?? null) : null,
          notes: values.notes ?? null,
          aliases: values.aliases,
          isDefault: values.isDefault,
        }),
      });
      const data = (await response.json()) as {
        account?: Account;
        error?: string;
      };
      if (!response.ok || !data.account) {
        throw new Error(
          data.error ?? tr("แก้ไขบัญชีไม่สำเร็จ", "Failed to update account")
        );
      }
      // Clear other defaults locally if promoted
      if (values.isDefault) {
        accounts
          .filter((a) => a.isDefault && a.id !== data.account!.id)
          .forEach((a) => upsertAccount({ ...a, isDefault: false }));
      }
      upsertAccount(data.account);
      setEditing(false);
      await loadDetail();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : tr("ไม่สามารถแก้ไขบัญชีได้", "Could not update account")
      );
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!detail) return;
    if (
      !confirm(
        tr(
          `เก็บบัญชี "${detail.account.name}" ขึ้นหิ้ง?`,
          `Archive account "${detail.account.name}"?`
        )
      )
    )
      return;
    setBusy(true);
    try {
      const response = await fetch(`/api/accounts/${detail.account.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("archive failed");
      upsertAccount({
        ...detail.account,
        isArchived: true,
        isDefault: false,
      });
      router.push("/accounts");
    } catch (e) {
      console.error(e);
      setError(tr("ไม่สามารถเก็บบัญชีได้", "Could not archive account"));
    } finally {
      setBusy(false);
    }
  };

  const handleUnarchive = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/accounts/${detail.account.id}`, {
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
          data.error ?? tr("ไม่สามารถนำกลับมาใช้งานได้", "Could not restore account")
        );
      }
      upsertAccount(data.account);
      await loadDetail();
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error
          ? e.message
          : tr("ไม่สามารถนำกลับมาใช้งานได้", "Could not restore account")
      );
    } finally {
      setBusy(false);
    }
  };

  const handleReconcile = async () => {
    if (!detail) return;
    if (!detail.reconciliation.canReconcile) {
      setError(
        tr(
          "บัญชีนี้เป็น snapshot และยังไม่มีรายการที่ตั้งใจผูกไว้สำหรับ reconciliation",
          "This account is a snapshot and has no intentionally linked rows for reconciliation"
        )
      );
      return;
    }

    const shouldProceed =
      detail.reconciliation.status === "aligned" ||
      confirm(
        tr(
          `ระบบจะปรับยอดคงเหลือจาก ${formatBaht(
            detail.reconciliation.storedBalance
          )} เป็น ${formatBaht(
            detail.reconciliation.transactionDerivedBalance
          )} ตาม legacy linked rows ควรทำเฉพาะหลัง cleanup/unlink แล้ว ต้องการดำเนินการต่อหรือไม่?`,
          `The balance will be adjusted from ${formatBaht(
            detail.reconciliation.storedBalance
          )} to ${formatBaht(
            detail.reconciliation.transactionDerivedBalance
          )} based on legacy linked rows. Only continue after cleanup/unlink review. Continue?`
        )
      );

    if (!shouldProceed) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/accounts/${detail.account.id}/reconcile`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        detail?: AccountDetailResponse;
        error?: string;
      };
      if (!response.ok || !data.detail) {
        throw new Error(
          data.error ?? tr("ไม่สามารถ reconcile บัญชีได้", "Could not reconcile account")
        );
      }
      setDetail(data.detail);
      upsertAccount(data.detail.account);
    } catch (reconcileError) {
      console.error(reconcileError);
      setError(
        reconcileError instanceof Error
          ? reconcileError.message
          : tr("ไม่สามารถ reconcile บัญชีได้", "Could not reconcile account")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
        >
          <ArrowLeft size={16} />
          {tr("กลับไปหน้าบัญชี", "Back to accounts")}
        </Link>
      </div>

      {error && (
        <Card className="border-[color:var(--expense-soft)] bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]">
          <p className="text-sm font-medium">{error}</p>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-[color:var(--app-surface-soft)]" />
          <div className="h-72 animate-pulse rounded-2xl bg-[color:var(--app-surface-soft)]" />
        </div>
      ) : !detail ? (
        <Card>
          <EmptyState
            icon={<Wallet size={20} />}
            title={tr("ไม่พบบัญชี", "Account not found")}
            description={tr(
              "บัญชีอาจถูกลบหรือ URL ไม่ถูกต้อง",
              "The account may have been deleted or the URL is incorrect."
            )}
            actionHref="/accounts"
            actionLabel={tr("กลับไปหน้าบัญชี", "Back to accounts")}
          />
        </Card>
      ) : (
        <>
          <PageHeader
            eyebrow={accountTypeLabels[detail.account.type]}
            title={detail.account.name}
            description={
              detail.account.notes ??
              tr(
                "ตรวจยอดคงเหลือ snapshot, วงเงิน และรายการที่ตั้งใจผูกกับบัญชีนี้ โดยไม่ถือว่า import จากเหมียวจดต้อง reconcile อัตโนมัติ",
                "Inspect balance snapshot, credit room, and intentionally linked rows without assuming Meowjot imports must auto-reconcile."
              )
            }
            meta={[
              {
                icon: <Wallet size={14} />,
                label: formatBaht(detail.account.currentBalance),
                tone: detail.account.currentBalance >= 0 ? "success" : "danger",
              },
              {
                icon: <Hash size={14} />,
                label: tr(
                  `${detail.transactionCount.toLocaleString("th-TH")} รายการที่เชื่อม`,
                  `${detail.transactionCount.toLocaleString("en-US")} linked rows`
                ),
              },
              ...(detail.account.isDefault
                ? [
                    {
                      icon: <Star size={14} />,
                      label: tr("บัญชีหลัก", "Default account"),
                      tone: "brand" as const,
                    },
                  ]
                : []),
              ...(detail.account.isArchived
                ? [
                    {
                      icon: <Archive size={14} />,
                      label: tr("เก็บขึ้นหิ้ง", "Archived"),
                      tone: "neutral" as const,
                    },
                  ]
                : []),
            ]}
            actions={
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <PencilLine size={14} />
                  {tr("แก้ไข", "Edit")}
                </Button>
                {detail.account.isArchived ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleUnarchive}
                    disabled={busy}
                  >
                    <RotateCcw size={14} />
                    {tr("กู้คืน", "Restore")}
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleArchive}
                    disabled={busy}
                  >
                    <Trash2 size={14} />
                    {tr("เก็บขึ้นหิ้ง", "Archive")}
                  </Button>
                )}
              </>
            }
          />

          <Card>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-[color:var(--app-text)]">
                    Balance Explainability
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${reconciliationStatusMeta[detail.reconciliation.status].className}`}
                  >
                    {detail.reconciliation.status === "aligned" ? (
                      <CheckCircle2 size={12} />
                    ) : detail.reconciliation.status ===
                      "needs_attention" ? (
                      <AlertTriangle size={12} />
                    ) : (
                      <Wallet size={12} />
                    )}
                    {reconciliationStatusMeta[detail.reconciliation.status].label}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-[color:var(--app-text-muted)]">
                  {reconciliationStatusMeta[detail.reconciliation.status].description}
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleReconcile}
                disabled={busy || !detail.reconciliation.canReconcile}
              >
                    <RotateCcw size={14} />
                    {detail.reconciliation.status === "aligned"
                  ? tr("รีเช็ก snapshot จาก linked rows", "Recheck snapshot from linked rows")
                  : tr(
                      "ปรับ snapshot ตาม linked rows",
                      "Adjust snapshot from linked rows"
                    )}
              </Button>
            </div>

            {detail.reconciliation.status === "no_linked_transactions" ? (
              <div className="mt-5 rounded-2xl border border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] p-4">
                <p className="text-sm font-semibold text-[color:var(--app-text)]">
                  {tr("สถานะ snapshot ที่ไม่ต้อง auto-link", "Snapshot state without auto-linking")}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--app-text-muted)]">
                  {tr(
                    "ยอดนี้เป็น account balance snapshot แยกจาก cashflow รายการนำเข้าจากเหมียวจดจะไม่ผูกบัญชีอัตโนมัติ เว้นแต่คุณเพิ่ม alias ที่มั่นใจจริง ๆ",
                    "This balance is an account snapshot separate from cashflow. Meowjot imports stay unlinked unless you add aliases you trust."
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                    <PencilLine size={14} />
                    {tr("แก้ alias / snapshot", "Edit alias / snapshot")}
                  </Button>
                  <Link
                    href={`/transactions?year=${selectedYear}&search=${encodeURIComponent(detail.account.name)}`}
                    className="inline-flex items-center justify-center rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-3 py-2 text-xs font-semibold text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                  >
                    {tr("ค้นหารายการเพื่อ attribution", "Search attribution rows")}
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  Stored balance
                </p>
                <p className="mt-1 text-xl font-semibold text-[color:var(--app-text)]">
                  {formatBaht(detail.reconciliation.storedBalance)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  Transaction-derived
                </p>
                <p className="mt-1 text-xl font-semibold text-[color:var(--app-text)]">
                  {formatBaht(detail.reconciliation.transactionDerivedBalance)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  Difference
                </p>
                <p
                  className={`mt-1 font-[family-name:var(--font-geist-mono)] text-xl font-semibold ${
                    Math.abs(detail.reconciliation.balanceDifference) < 0.01
                      ? "text-[color:var(--income-text)]"
                      : "text-[color:var(--neutral)]"
                  }`}
                >
                  {formatBalanceDifference(detail.reconciliation.balanceDifference, tr)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-[color:var(--app-border)] pt-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  Linked income
                </p>
                <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-base font-semibold text-[color:var(--income-text)]">
                  {formatBaht(detail.reconciliation.linkedIncome)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  Linked expense
                </p>
                <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-base font-semibold text-[color:var(--expense-text)]">
                  {formatBaht(detail.reconciliation.linkedExpense)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  Transfer rows
                </p>
                <p className="mt-1 text-base font-semibold text-[color:var(--app-text)]">
                  {detail.reconciliation.linkedTransferCount.toLocaleString("th-TH")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  Last linked txn
                </p>
                <p className="mt-1 text-base font-semibold text-[color:var(--app-text)]">
                  {formatAccountDate(detail.reconciliation.lastLinkedTransactionDate, language)}
                </p>
              </div>
            </div>

            {detail.reconciliation.linkedTransferCount > 0 && (
              <p className="mt-4 text-sm text-[color:var(--app-text-muted)]">
                {tr(
                  "หมายเหตุ: ตอนนี้ transfer rows ยังไม่นับรวมในยอด transaction-derived เพื่อหลีกเลี่ยงการนับซ้ำข้ามบัญชี",
                  "Note: transfer rows are not yet included in the transaction-derived balance to avoid double-counting across accounts."
                )}
              </p>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-[color:var(--app-divider-soft)] pb-4">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-[22px]"
                  style={{ backgroundColor: `${detail.account.color}22` }}
                >
                  <AccountIcon
                    icon={detail.account.icon}
                    type={detail.account.type}
                    size={24}
                    className="text-[color:var(--app-text)]"
                  />
                </div>
                <div>
                  <CardTitle>{tr("ภาพรวมบัญชี", "Account snapshot")}</CardTitle>
                  <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
                    {accountTypeLabels[detail.account.type]}
                  </p>
                </div>
              </div>
            </CardHeader>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  {tr("ยอดคงเหลือ", "Current balance")}
                </p>
                <p
                  className={`mt-1 break-words font-[family-name:var(--font-geist-mono)] text-3xl font-bold leading-tight md:text-4xl lg:text-3xl xl:text-4xl ${
                    detail.account.currentBalance < 0
                      ? "text-[color:var(--expense-text)]"
                      : "text-[color:var(--app-text)]"
                  }`}
                >
                  {formatBaht(detail.account.currentBalance)}
                </p>
              </div>
              {detail.account.type === "credit_card" &&
                detail.account.creditLimit != null && (
                  <>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                        {tr("วงเงิน", "Credit limit")}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-[color:var(--app-text)]">
                        {formatBaht(detail.account.creditLimit)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                        {tr("เหลือใช้", "Available")}
                      </p>
                      <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-xl font-semibold text-[color:var(--income-text)]">
                        {formatBaht(
                          detail.account.creditLimit +
                            detail.account.currentBalance
                        )}
                      </p>
                    </div>
                  </>
                )}
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  {tr("จำนวนรายการ", "Transaction count")}
                </p>
                <p className="mt-1 text-xl font-semibold text-[color:var(--app-text)]">
                  {detail.transactionCount.toLocaleString("th-TH")}
                </p>
              </div>
            </div>

            {detail.account.aliases.length > 0 && (
              <div className="mt-5 border-t border-[color:var(--app-border)] pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  {tr("Aliases สำหรับจับคู่ payFrom", "Aliases for payFrom matching")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.account.aliases.map((alias) => (
                    <span
                      key={alias}
                      className="rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-2.5 py-1 text-xs text-[color:var(--app-text-muted)]"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[color:var(--app-text)]">
                {tr("รายการล่าสุด", "Recent transactions")}
              </h3>
              <Link
                href={`/transactions?account=${detail.account.id}&year=${selectedYear}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
              >
                {tr("ดูทั้งหมด", "View all")}
                <ArrowUpRight size={12} />
              </Link>
            </div>

            {detail.recentTransactions.length === 0 ? (
              <EmptyState
                icon={<Wallet size={20} />}
                title={tr("ยังไม่มีรายการในบัญชีนี้", "No transactions on this account yet")}
                description={tr(
                  "เมื่อ import หรือเพิ่มรายการด้วย payFrom ที่จับคู่กับบัญชีนี้ได้ รายการจะขึ้นที่นี่",
                  "When you import or add transactions with a payFrom that matches this account, they'll show up here."
                )}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      <th className="pb-2 pr-3 font-medium">{tr("วันที่", "Date")}</th>
                      <th className="pb-2 pr-3 font-medium">{tr("หมวด", "Category")}</th>
                      <th className="pb-2 pr-3 font-medium">{tr("หมายเหตุ", "Note")}</th>
                      <th className="pb-2 text-right font-medium">{tr("จำนวน", "Amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--app-border)]">
                    {detail.recentTransactions.map((txn) => {
                      const sign =
                        txn.type === "income"
                          ? "+"
                          : txn.type === "expense"
                            ? "−"
                            : "";
                      const color =
                        txn.type === "income"
                          ? "text-[color:var(--income-text)]"
                          : txn.type === "expense"
                            ? "text-[color:var(--expense-text)]"
                            : "text-[color:var(--app-text-muted)]";
                      return (
                        <tr key={txn.id} className="align-top">
                          <td className="py-2 pr-3 text-[color:var(--app-text-muted)]">
                            {txn.date}
                            {txn.time ? (
                              <span className="ml-1 text-[color:var(--app-text-subtle)]">
                                {txn.time}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-3 text-[color:var(--app-text)]">
                            {txn.category}
                          </td>
                          <td className="py-2 pr-3 text-[color:var(--app-text-muted)]">
                            {txn.note ?? "—"}
                          </td>
                          <td
                            className={`py-2 text-right font-semibold ${color}`}
                          >
                            {sign}
                            {formatBaht(Math.abs(txn.amount))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {editing && (
            <AccountFormModal
              key={`edit-${detail.account.id}-${detail.account.updatedAt}`}
              onClose={() => setEditing(false)}
              onSubmit={handleEditSubmit}
              initial={detail.account}
              busy={busy}
            />
          )}
        </>
      )}
    </div>
  );
}
