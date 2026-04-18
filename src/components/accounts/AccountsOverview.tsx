"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AccountIcon } from "@/components/accounts/AccountIcon";
import { useFinanceStore } from "@/store/finance-store";
import { useFinanceStoreHydrated } from "@/store/use-finance-store-hydrated";
import { ACCOUNT_TYPE_LABELS, type Account } from "@/lib/types";
import { formatBaht } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/**
 * Given the raw active accounts and a persisted order array (ids), return
 * accounts sorted so that entries in `order` come first in the saved sequence,
 * and any new/unsorted accounts fall at the end in their natural order.
 */
function applyOrder(active: Account[], order: number[]): Account[] {
  if (order.length === 0) return active;
  const byId = new Map(active.map((a) => [a.id, a] as const));
  const result: Account[] = [];
  const seen = new Set<number>();
  for (const id of order) {
    const acc = byId.get(id);
    if (acc) {
      result.push(acc);
      seen.add(id);
    }
  }
  for (const a of active) {
    if (!seen.has(a.id)) result.push(a);
  }
  return result;
}

export function AccountsOverview() {
  const t = useT();
  const storeHydrated = useFinanceStoreHydrated();
  const accounts = useFinanceStore((s) => s.accounts);
  const accountOrder = useFinanceStore((s) => s.accountOrder);
  const setAccountOrder = useFinanceStore((s) => s.setAccountOrder);
  const accountsExpanded = useFinanceStore((s) => s.accountsExpanded);
  const toggleAccountsExpanded = useFinanceStore((s) => s.toggleAccountsExpanded);

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  const active = useMemo(() => {
    const filtered = accounts
      .filter((a) => !a.isArchived)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    return applyOrder(filtered, accountOrder);
  }, [accounts, accountOrder]);

  if (!storeHydrated) {
    return (
      <Card>
        <div className="h-32 animate-pulse rounded-md bg-[color:var(--app-surface-soft)]" />
      </Card>
    );
  }

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
          title={t("accounts.empty.title")}
          description={t("accounts.empty.desc")}
          actionHref="/accounts"
          actionLabel={t("accounts.goToAccounts")}
        />
      </Card>
    );
  }

  function handleDragStart(e: React.DragEvent<HTMLElement>, id: number) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    // Needed in Firefox to initiate the drag
    try {
      e.dataTransfer.setData("text/plain", String(id));
    } catch {
      /* noop */
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLElement>, id: number) {
    if (draggingId == null || draggingId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  }

  function handleDrop(e: React.DragEvent<HTMLElement>, targetId: number) {
    e.preventDefault();
    if (draggingId == null || draggingId === targetId) {
      setDraggingId(null);
      setOverId(null);
      return;
    }
    const ids = active.map((a) => a.id);
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, draggingId);
    setAccountOrder(next);
    setDraggingId(null);
    setOverId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setOverId(null);
  }

  const showExpandButton = active.length > 4;

  return (
    <Card className="animate-fade-slide-up anim-delay-0 overflow-hidden">
      {/* Net Worth hero */}
      <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--app-text-subtle)]">
            {t("summary.netWorth")}
          </p>
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-4xl font-bold tracking-tight text-[color:var(--app-text)]">
            {formatBaht(netWorth)}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--income-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--income-text)]">
              <TrendingUp size={11} />
              {t("summary.assets")} {formatBaht(totalAssets)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--expense-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--expense-text)]">
              <TrendingDown size={11} />
              {t("summary.liabilities")} {formatBaht(totalLiabilities)}
            </span>
            <span className="text-xs text-[color:var(--app-text-subtle)]">
              {active.length} {t("summary.activeAccounts")}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3 py-1.5 text-xs font-medium text-[color:var(--app-text-muted)] transition-colors hover:border-[color:var(--app-border-strong)] hover:text-[color:var(--app-text)]"
          >
            {t("accounts.manage")}
            <ArrowRight size={12} />
          </Link>
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--app-brand-text)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
          >
            <Plus size={12} />
            {t("accounts.add")}
          </Link>
        </div>
      </div>

      <div className="border-t border-[color:var(--app-border)]" />

      {/* Drag hint */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-[color:var(--app-text-subtle)]">
        <span className="inline-flex items-center gap-1.5">
          <GripVertical size={11} />
          {t("accounts.dragHint")}
        </span>
      </div>

      {/* Account cards */}
      {accountsExpanded ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {active.map((account, idx) => (
            <AccountTile
              key={account.id}
              account={account}
              idx={idx}
              isDragging={draggingId === account.id}
              isOver={overId === account.id}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      ) : (
        <div className="scroll-fade-right -mx-1 mt-3 flex gap-3 overflow-x-auto pb-2 px-1">
          {active.map((account, idx) => (
            <AccountTile
              key={account.id}
              account={account}
              idx={idx}
              horizontal
              isDragging={draggingId === account.id}
              isOver={overId === account.id}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}

      {/* Expand / collapse button BELOW the cards */}
      {showExpandButton && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={toggleAccountsExpanded}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-4 py-1.5 text-xs font-semibold text-[color:var(--app-text-muted)] transition-colors hover:border-[color:var(--app-border-strong)] hover:text-[color:var(--app-text)]"
            aria-expanded={accountsExpanded}
          >
            {accountsExpanded ? (
              <>
                <ChevronUp size={12} />
                {t("accounts.collapse")}
              </>
            ) : (
              <>
                <ChevronDown size={12} />
                {t("accounts.showAll")} ({active.length})
              </>
            )}
          </button>
        </div>
      )}
    </Card>
  );
}

interface AccountTileProps {
  account: Account;
  idx: number;
  horizontal?: boolean;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: (e: React.DragEvent<HTMLElement>, id: number) => void;
  onDragOver: (e: React.DragEvent<HTMLElement>, id: number) => void;
  onDrop: (e: React.DragEvent<HTMLElement>, id: number) => void;
  onDragEnd: () => void;
}

function AccountTile({
  account,
  idx,
  horizontal,
  isDragging,
  isOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: AccountTileProps) {
  const t = useT();
  const isNegative = account.currentBalance < 0;
  const accentColor = account.color ?? "#f54e00";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, account.id)}
      onDragOver={(e) => onDragOver(e, account.id)}
      onDrop={(e) => onDrop(e, account.id)}
      onDragEnd={onDragEnd}
      className={`group relative ${horizontal ? "min-w-[200px] shrink-0" : ""} ${
        isDragging ? "opacity-40" : ""
      } ${isOver ? "ring-2 ring-[color:var(--app-brand-text)] ring-offset-2 ring-offset-[color:var(--app-surface)]" : ""} animate-fade-slide-up anim-delay-${Math.min(idx + 1, 5)}`}
    >
      <Link
        href={`/accounts/${account.id}`}
        className="card-hover relative flex flex-col gap-3 overflow-hidden rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4"
      >
        {/* colored top accent bar */}
        <div
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl"
          style={{ backgroundColor: accentColor }}
        />

        {/* drag handle visual hint */}
        <span
          className="pointer-events-none absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-60"
          aria-hidden
        >
          <GripVertical size={12} className="text-[color:var(--app-text-subtle)]" />
        </span>

        <div className="flex items-center gap-3 pt-0.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <div style={{ color: accentColor }}>
              <AccountIcon
                icon={account.icon}
                type={account.type}
                size={17}
              />
            </div>
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

        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--app-text-subtle)]">
            {t("accounts.balance")}
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
    </div>
  );
}
