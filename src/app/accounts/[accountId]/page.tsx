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
  PencilLine,
  RotateCcw,
  Star,
  Trash2,
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
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
  type AccountReconciliation,
} from "@/lib/types";
import { formatBaht } from "@/lib/utils";

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

const reconciliationStatusMeta: Record<
  AccountReconciliation["status"],
  {
    label: string;
    className: string;
    description: string;
  }
> = {
  aligned: {
    label: "ยอดตรงกับรายการที่เชื่อมแล้ว",
    className:
      "bg-[color:var(--income-soft)] text-[color:var(--income-text)]",
    description:
      "ยอดคงเหลือที่บันทึกไว้ตรงกับยอดที่ derive จากธุรกรรมที่เชื่อมกับบัญชีนี้",
  },
  needs_attention: {
    label: "ยอดต่างจากรายการที่เชื่อมแล้ว",
    className:
      "bg-[color:var(--neutral-soft)] text-[color:var(--neutral)]",
    description:
      "ยอดคงเหลือในบัญชีนี้ยังไม่ตรงกับธุรกรรมที่เชื่อมอยู่ อาจเกิดจาก opening balance หรือการปรับยอดด้วยมือ",
  },
  no_linked_transactions: {
    label: "ยังไม่มีรายการที่เชื่อมไว้",
    className:
      "bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)]",
    description:
      "ตอนนี้ระบบยังอธิบายยอดด้วย transaction ledger ไม่ได้ เพราะยังไม่มีรายการที่ผูกกับบัญชีนี้",
  },
};

function formatAccountDate(date?: string) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(`${date}T00:00:00`));
}

function formatBalanceDifference(value: number) {
  if (Math.abs(value) < 0.01) {
    return "ไม่มีส่วนต่าง";
  }

  return `${value > 0 ? "+" : "-"}${formatBaht(Math.abs(value))}`;
}

export default function AccountDetailPage() {
  const params = useParams<{ accountId: string }>();
  const router = useRouter();
  const accountId = Number(params?.accountId);

  const upsertAccount = useFinanceStore((s) => s.upsertAccount);
  const accounts = useFinanceStore((s) => s.accounts);

  const [detail, setDetail] = useState<AccountDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadDetail = useMemo(
    () => async () => {
      if (!Number.isInteger(accountId) || accountId <= 0) {
        setError("ไม่พบบัญชีนี้");
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
        setError("ไม่สามารถโหลดบัญชีได้");
      } finally {
        setIsLoading(false);
      }
    },
    [accountId, upsertAccount]
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
        throw new Error(data.error ?? "แก้ไขบัญชีไม่สำเร็จ");
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
          : "ไม่สามารถแก้ไขบัญชีได้"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!detail) return;
    if (!confirm(`เก็บบัญชี "${detail.account.name}" ขึ้นหิ้ง?`)) return;
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
      setError("ไม่สามารถเก็บบัญชีได้");
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
        throw new Error(data.error ?? "ไม่สามารถนำกลับมาใช้งานได้");
      }
      upsertAccount(data.account);
      await loadDetail();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "ไม่สามารถนำกลับมาใช้งานได้");
    } finally {
      setBusy(false);
    }
  };

  const handleReconcile = async () => {
    if (!detail) return;
    if (!detail.reconciliation.canReconcile) {
      setError("บัญชีนี้ยังไม่มีรายการที่เชื่อมไว้ให้ reconcile");
      return;
    }

    const shouldProceed =
      detail.reconciliation.status === "aligned" ||
      confirm(
        `ระบบจะปรับยอดคงเหลือจาก ${formatBaht(
          detail.reconciliation.storedBalance
        )} เป็น ${formatBaht(
          detail.reconciliation.transactionDerivedBalance
        )} ตามรายการที่เชื่อมแล้ว ต้องการดำเนินการต่อหรือไม่?`
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
        throw new Error(data.error ?? "ไม่สามารถ reconcile บัญชีได้");
      }
      setDetail(data.detail);
      upsertAccount(data.detail.account);
    } catch (reconcileError) {
      console.error(reconcileError);
      setError(
        reconcileError instanceof Error
          ? reconcileError.message
          : "ไม่สามารถ reconcile บัญชีได้"
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
          กลับไปหน้าบัญชี
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
            title="ไม่พบบัญชี"
            description="บัญชีอาจถูกลบหรือ URL ไม่ถูกต้อง"
            actionHref="/accounts"
            actionLabel="กลับไปหน้าบัญชี"
          />
        </Card>
      ) : (
        <>
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
                  ? "รีเช็กยอดจากรายการ"
                  : "ปรับยอดตามรายการที่เชื่อมแล้ว"}
              </Button>
            </div>

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
                  {formatBalanceDifference(detail.reconciliation.balanceDifference)}
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
                  {formatAccountDate(detail.reconciliation.lastLinkedTransactionDate)}
                </p>
              </div>
            </div>

            {detail.reconciliation.linkedTransferCount > 0 && (
              <p className="mt-4 text-sm text-[color:var(--app-text-muted)]">
                หมายเหตุ: ตอนนี้ transfer rows ยังไม่นับรวมในยอด transaction-derived
                เพื่อหลีกเลี่ยงการนับซ้ำข้ามบัญชี
              </p>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-3xl"
                  style={{ backgroundColor: `${detail.account.color}22` }}
                >
                  <AccountIcon
                    icon={detail.account.icon}
                    type={detail.account.type}
                    size={28}
                    className="text-[color:var(--app-text)]"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-[color:var(--app-text)]">
                      {detail.account.name}
                    </h1>
                    {detail.account.isDefault && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          color: detail.account.color,
                          backgroundColor: `${detail.account.color}18`,
                        }}
                      >
                        <Star size={12} />
                        บัญชีหลัก
                      </span>
                    )}
                    {detail.account.isArchived && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--app-surface-soft)] px-2 py-0.5 text-xs font-semibold text-[color:var(--app-text-muted)]">
                        <Archive size={12} />
                        เก็บขึ้นหิ้ง
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
                    {ACCOUNT_TYPE_LABELS[detail.account.type]}
                  </p>
                  {detail.account.notes && (
                    <p className="mt-2 max-w-xl text-sm text-[color:var(--app-text-muted)]">
                      {detail.account.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <PencilLine size={14} />
                  แก้ไข
                </Button>
                {detail.account.isArchived ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleUnarchive}
                    disabled={busy}
                  >
                    <RotateCcw size={14} />
                    กู้คืน
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleArchive}
                    disabled={busy}
                  >
                    <Trash2 size={14} />
                    เก็บขึ้นหิ้ง
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  ยอดคงเหลือ
                </p>
                <p
                  className={`mt-1 font-[family-name:var(--font-geist-mono)] text-3xl font-bold ${
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
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                        วงเงิน
                      </p>
                      <p className="mt-1 text-xl font-semibold text-[color:var(--app-text)]">
                        {formatBaht(detail.account.creditLimit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                        เหลือใช้
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
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  จำนวนรายการ
                </p>
                <p className="mt-1 text-xl font-semibold text-[color:var(--app-text)]">
                  {detail.transactionCount.toLocaleString("th-TH")}
                </p>
              </div>
            </div>

            {detail.account.aliases.length > 0 && (
              <div className="mt-5 border-t border-[color:var(--app-border)] pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
                  Aliases สำหรับจับคู่ payFrom
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
                รายการล่าสุด
              </h3>
              <Link
                href={`/transactions?account=${detail.account.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
              >
                ดูทั้งหมด
                <ArrowUpRight size={12} />
              </Link>
            </div>

            {detail.recentTransactions.length === 0 ? (
              <EmptyState
                icon={<Wallet size={20} />}
                title="ยังไม่มีรายการในบัญชีนี้"
                description="เมื่อ import หรือเพิ่มรายการด้วย payFrom ที่จับคู่กับบัญชีนี้ได้ รายการจะขึ้นที่นี่"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      <th className="pb-2 pr-3 font-medium">วันที่</th>
                      <th className="pb-2 pr-3 font-medium">หมวด</th>
                      <th className="pb-2 pr-3 font-medium">หมายเหตุ</th>
                      <th className="pb-2 text-right font-medium">จำนวน</th>
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
