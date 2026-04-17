"use client";

import Link from "next/link";
import { ArrowRight, Plus, Wallet, TrendingUp, TrendingDown } from "lucide-react";
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
        <div className="h-32 animate-pulse rounded-md bg-[color:var(--app-surface-soft)]" />
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
    <Card className="animate-fade-slide-up anim-delay-0 overflow-hidden">
      {/* ── Net Worth hero ──────────────────────────────── */}
      <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* label */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--app-text-subtle)]">
            NET WORTH
          </p>

          {/* big number */}
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-4xl font-bold tracking-tight text-[color:var(--app-text)]">
            {formatBaht(netWorth)}
          </p>

          {/* assets / liabilities breakdown */}
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--income-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--income-text)]">
              <TrendingUp size={11} />
              สินทรัพย์ {formatBaht(totalAssets)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--expense-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--expense-text)]">
              <TrendingDown size={11} />
              หนี้สิน {formatBaht(totalLiabilities)}
            </span>
            <span className="text-xs text-[color:var(--app-text-subtle)]">
              {active.length} บัญชีที่ใช้งาน
            </span>
          </div>
        </div>

        {/* actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3 py-1.5 text-xs font-medium text-[color:var(--app-text-muted)] transition-colors hover:border-[color:var(--app-border-strong)] hover:text-[color:var(--app-text)]"
          >
            จัดการบัญชี
            <ArrowRight size={12} />
          </Link>
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#f54e00] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#d44400]"
          >
            <Plus size={12} />
            เพิ่มบัญชี
          </Link>
        </div>
      </div>

      {/* ── divider ─────────────────────────────────────── */}
      <div className="border-t border-[color:var(--app-border)]" />

      {/* ── Account cards row ───────────────────────────── */}
      <div className="scroll-fade-right -mx-1 mt-4 flex gap-3 overflow-x-auto pb-2 px-1">
        {active.map((account, idx) => {
          const isNegative = account.currentBalance < 0;
          const accentColor = account.color ?? "#f54e00";
          return (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              style={{ "--card-accent": accentColor } as React.CSSProperties}
              className={`card-hover group relative flex min-w-[176px] flex-col gap-3 rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4 animate-fade-slide-up anim-delay-${Math.min(idx + 1, 5)} overflow-hidden`}
            >
              {/* colored top accent bar */}
              <div
                className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl"
                style={{ backgroundColor: accentColor }}
              />

              {/* icon + name */}
              <div className="flex items-center gap-3 pt-0.5">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${accentColor}20` }}
                >
                  <AccountIcon
                    icon={account.icon}
                    type={account.type}
                    size={17}
                    style={{ color: accentColor }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[color:var(--app-text)]">
                    {account.name}
                  </p>
                  <p className="text-[11px] text-[color:var(--app-text-subtle)]">
                    {ACCOUNT_TYPE_LABELS[account.type]}
                  </p>
                </div>
              </div>

              {/* balance */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                  ยอดคงเหลือ
                </p>
                <p
                  className={`mt-0.5 font-[family-name:var(--font-geist-mono)] text-lg font-bold ${
                    isNegative
                      ? "text-[color:var(--expense-text)]"
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
