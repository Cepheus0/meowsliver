"use client";

import Link from "next/link";
import { ArrowRight, Plus, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AccountIcon } from "@/components/accounts/AccountIcon";
import { useFinanceStore } from "@/store/finance-store";
import { useFinanceStoreHydrated } from "@/store/use-finance-store-hydrated";
import { ACCOUNT_TYPE_LABELS } from "@/lib/types";
import { formatBaht } from "@/lib/utils";

export function AccountsOverview() {
  const storeHydrated = useFinanceStoreHydrated();
  const accounts = useFinanceStore((s) => s.accounts);

  if (!storeHydrated) {
    return (
      <Card>
        <div className="h-32 animate-pulse rounded-xl bg-[color:var(--app-surface-soft)]" />
      </Card>
    );
  }

  const active = accounts
    .filter((a) => !a.isArchived)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  const netWorth = active.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalAssets = active
    .filter((a) => a.currentBalance > 0)
    .reduce((sum, a) => sum + a.currentBalance, 0);
  const totalLiabilities = active
    .filter((a) => a.currentBalance < 0)
    .reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);

  if (active.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Wallet size={20} />}
          title="ยังไม่มีบัญชี"
          description="เพิ่มกระเป๋าเงิน บัญชีธนาคาร หรือบัตรเครดิต เพื่อให้เหมียวช่วยจับคู่ payFrom อัตโนมัติตอน import"
          actionHref="/accounts"
          actionLabel="ไปหน้าบัญชี"
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 border-b border-[color:var(--app-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
            Net Worth
          </p>
          <p className="mt-1 text-3xl font-bold text-[color:var(--app-text)]">
            {formatBaht(netWorth)}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--app-text-muted)]">
            <span className="text-emerald-600 dark:text-emerald-400">
              สินทรัพย์ {formatBaht(totalAssets)}
            </span>
            <span className="text-red-600 dark:text-red-400">
              หนี้สิน {formatBaht(totalLiabilities)}
            </span>
            <span>{active.length} บัญชีที่ใช้งาน</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3 py-1.5 text-xs font-medium text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
          >
            จัดการบัญชี
            <ArrowRight size={12} />
          </Link>
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            <Plus size={12} />
            เพิ่มบัญชี
          </Link>
        </div>
      </div>

      <div className="mt-4 -mx-1 flex gap-3 overflow-x-auto pb-1 px-1">
        {active.map((account) => {
          const isNegative = account.currentBalance < 0;
          return (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              className="theme-border group flex min-w-[180px] flex-col gap-3 rounded-2xl border bg-[color:var(--app-surface-soft)] p-4 transition-all hover:-translate-y-0.5 hover:bg-[color:var(--app-surface-strong)] hover:shadow-[var(--app-card-shadow)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${account.color}22` }}
                >
                  <AccountIcon
                    icon={account.icon}
                    type={account.type}
                    size={18}
                    className="text-[color:var(--app-text)]"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[color:var(--app-text)]">
                    {account.name}
                  </p>
                  <p className="text-[11px] text-[color:var(--app-text-muted)]">
                    {ACCOUNT_TYPE_LABELS[account.type]}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-[color:var(--app-text-muted)]">
                  ยอดคงเหลือ
                </p>
                <p
                  className={`mt-0.5 text-lg font-bold ${
                    isNegative
                      ? "text-red-600 dark:text-red-400"
                      : "text-[color:var(--app-text)]"
                  }`}
                >
                  {formatBaht(account.currentBalance)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
