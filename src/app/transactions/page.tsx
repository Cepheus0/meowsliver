"use client";

import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { useFinanceStoreHydrated } from "@/store/use-finance-store-hydrated";
import { refreshFinanceStoreFromServer } from "@/lib/client/finance-sync";
import { formatBaht, formatShortDate } from "@/lib/utils";
import {
  getTransactionAmountPrefix,
  getTransactionTypeLabel,
} from "@/lib/transaction-presentation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Sliders,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionDetailDrawer } from "@/components/transactions/TransactionDetailDrawer";
import { FilterChips } from "@/components/transactions/FilterChips";
import {
  TransactionFormModal,
  type TransactionFormValues,
} from "@/components/transactions/TransactionFormModal";
import {
  applyMonthlyFilters,
  buildBreakdown,
  EMPTY_FILTER_STATE,
  type MonthlyFilterState,
} from "@/lib/monthly-detail-analytics";
import type { Transaction, TransactionType } from "@/lib/types";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default function TransactionsPage() {
  const {
    getTransactions,
    selectedYear,
    setSelectedYear,
    replaceImportedTransactions,
    setAccounts,
    accounts,
  } = useFinanceStore();
  const storeHydrated = useFinanceStoreHydrated();
  const transactions = getTransactions();
  const visibleTransactions = useMemo(
    () => (storeHydrated ? transactions : []),
    [storeHydrated, transactions]
  );

  const [filters, setFilters] = useState<MonthlyFilterState>(EMPTY_FILTER_STATE);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  /**
   * Dimension breakdowns are computed from the *unfiltered* year dataset so the
   * chip counts stay stable as the user selects filters. Otherwise each click
   * shrinks the available chip list, which is disorienting.
   */
  const breakdowns = useMemo(() => {
    if (!storeHydrated || visibleTransactions.length === 0) {
      return { category: [], tag: [], paymentChannel: [], payFrom: [], recipient: [] };
    }
    return {
      category: buildBreakdown(visibleTransactions, "category"),
      tag: buildBreakdown(visibleTransactions, "tag"),
      paymentChannel: buildBreakdown(visibleTransactions, "paymentChannel"),
      payFrom: buildBreakdown(visibleTransactions, "payFrom"),
      recipient: buildBreakdown(visibleTransactions, "recipient"),
    };
  }, [storeHydrated, visibleTransactions]);

  const filtered = useMemo(
    () => applyMonthlyFilters(visibleTransactions, filters),
    [visibleTransactions, filters]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, safeCurrentPage, pageSize]);

  const pageStart = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd =
    filtered.length === 0 ? 0 : Math.min(safeCurrentPage * pageSize, filtered.length);

  // Active filter count powers the "ล้างทั้งหมด" visibility and the badge on the
  // toggle button — so the user sees at-a-glance what's active.
  const activeFilterCount =
    filters.types.size +
    filters.categories.size +
    filters.subcategories.size +
    filters.tags.size +
    filters.paymentChannels.size +
    filters.payFroms.size +
    filters.recipients.size +
    (filters.search ? 1 : 0) +
    (filters.amountMin !== undefined ? 1 : 0) +
    (filters.amountMax !== undefined ? 1 : 0) +
    (filters.dateFrom !== undefined ? 1 : 0);

  const toggleInSet = (key: keyof MonthlyFilterState, value: string) => {
    setFilters((prev) => {
      const current = prev[key];
      if (!(current instanceof Set)) return prev;
      const next = new Set(current as Set<string>);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      setCurrentPage(1);
      return { ...prev, [key]: next };
    });
  };

  const toggleType = (type: TransactionType | "all") => {
    if (type === "all") {
      setFilters((prev) => ({ ...prev, types: new Set() }));
      setCurrentPage(1);
      return;
    }
    setFilters((prev) => {
      const next = new Set(prev.types);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      setCurrentPage(1);
      return { ...prev, types: next };
    });
  };

  const refreshAfterMutation = async (targetYear: number) => {
    await refreshFinanceStoreFromServer({
      replaceImportedTransactions,
      setAccounts,
    });
    if (targetYear !== selectedYear) {
      setSelectedYear(targetYear);
    }
  };

  const handleEditSubmit = async (values: TransactionFormValues) => {
    if (!editingTx) return;

    setMutationBusy(true);
    setMutationError(null);

    try {
      const response = await fetch(`/api/transactions/${editingTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "ไม่สามารถอัปเดตรายการได้");
      }

      await refreshAfterMutation(Number(values.date.slice(0, 4)));
      setSelectedTx(null);
      setEditingTx(null);
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "ไม่สามารถอัปเดตรายการได้"
      );
    } finally {
      setMutationBusy(false);
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!confirm(`ลบรายการ "${transaction.category}" ใช่หรือไม่?`)) return;

    setMutationBusy(true);
    setMutationError(null);

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "ไม่สามารถลบรายการได้");
      }

      await refreshAfterMutation(Number(transaction.date.slice(0, 4)));
      setSelectedTx(null);
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "ไม่สามารถลบรายการได้"
      );
    } finally {
      setMutationBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--app-text)]">
          รายการทั้งหมด
        </h1>
        <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
          ปี {selectedYear} — {storeHydrated ? visibleTransactions.length : "กำลังโหลด..."}
        </p>
      </div>

      {mutationError ? (
        <Card className="border-[color:var(--expense-soft)] bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]">
          <p className="text-sm font-medium">{mutationError}</p>
        </Card>
      ) : null}

      {!storeHydrated ? (
        <Card>
          <EmptyState
            icon={<Search size={20} />}
            title="กำลังเตรียมข้อมูลธุรกรรม"
            description="กำลังโหลดรายการที่บันทึกไว้และตรวจสอบข้อมูลล่าสุดของปีที่เลือก"
          />
        </Card>
      ) : visibleTransactions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search size={20} />}
            title={`ยังไม่มีรายการในปี ${selectedYear}`}
            description="นำเข้าธุรกรรมจริงหรือบันทึกรายการใหม่ก่อน แล้วตารางรายการทั้งหมดจะปรากฏที่หน้านี้"
            actionHref="/import"
            actionLabel="ไปหน้านำเข้า"
          />
        </Card>
      ) : (
        <>
          {/* Primary filter row: search + type segmented control + advanced toggle */}
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--app-text-subtle)]"
                />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, search: e.target.value }));
                    setCurrentPage(1);
                  }}
                  placeholder="ค้นหา หมวด / ผู้รับ / หมายเหตุ..."
                  className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] py-2.5 pl-9 pr-4 text-sm text-[color:var(--app-text)] outline-none transition-colors focus:border-[color:var(--app-brand-text)] focus:ring-2 focus:ring-[color:var(--app-brand-soft-strong)]"
                />
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-[color:var(--app-surface-soft)] p-1">
                <Filter size={14} className="ml-2 text-[color:var(--app-text-subtle)]" />
                {(["all", "income", "expense", "transfer"] as const).map((type) => {
                  const active =
                    type === "all"
                      ? filters.types.size === 0
                      : filters.types.has(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-[color:var(--app-surface-strong)] text-[color:var(--app-text)] shadow-[var(--app-card-shadow)]"
                          : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                      }`}
                    >
                      {type === "all" ? "ทั้งหมด" : getTransactionTypeLabel(type)}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowAdvancedFilters((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  showAdvancedFilters || activeFilterCount > 0
                    ? "border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft-strong)] text-[color:var(--app-brand-text)]"
                    : "border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)] hover:border-[color:var(--app-border-strong)] hover:text-[color:var(--app-text)]"
                }`}
                aria-expanded={showAdvancedFilters}
              >
                <Sliders size={12} />
                ตัวกรอง
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-[color:var(--app-brand-text)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setFilters(EMPTY_FILTER_STATE);
                    setCurrentPage(1);
                  }}
                  className="text-xs font-medium text-[color:var(--app-text-muted)] underline underline-offset-2 hover:text-[color:var(--app-text)]"
                >
                  ล้างทั้งหมด
                </button>
              )}
            </div>

            {/* Advanced dimension filters — collapsible so the page stays scannable */}
            {showAdvancedFilters && (
              <div className="mt-4 space-y-4 border-t border-[color:var(--app-divider-soft)] pt-4">
                <FilterChips
                  label="หมวด"
                  slices={breakdowns.category}
                  selected={filters.categories}
                  onToggle={(v) => toggleInSet("categories", v)}
                />
                <FilterChips
                  label="แท็ก"
                  slices={breakdowns.tag}
                  selected={filters.tags}
                  onToggle={(v) => toggleInSet("tags", v)}
                />
                <FilterChips
                  label="ช่องทางจ่าย"
                  slices={breakdowns.paymentChannel}
                  selected={filters.paymentChannels}
                  onToggle={(v) => toggleInSet("paymentChannels", v)}
                />
                <FilterChips
                  label="จากบัญชี"
                  slices={breakdowns.payFrom}
                  selected={filters.payFroms}
                  onToggle={(v) => toggleInSet("payFroms", v)}
                />
                <FilterChips
                  label="ผู้รับ"
                  slices={breakdowns.recipient}
                  selected={filters.recipients}
                  onToggle={(v) => toggleInSet("recipients", v)}
                />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {filtered.length === visibleTransactions.length
                  ? `รายการทั้งหมด (${visibleTransactions.length})`
                  : `แสดง ${pageStart}-${pageEnd} จาก ${filtered.length} รายการ`}
              </CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--app-divider)]">
                    <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      วันที่
                    </th>
                    <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      ประเภท
                    </th>
                    <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      หมวดหมู่
                    </th>
                    <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      หมายเหตุ
                    </th>
                    <th className="py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      จำนวน
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--app-divider-soft)]">
                  {paginatedTransactions.map((tx) => {
                    const isIncome = tx.type === "income";
                    const isTransfer = tx.type === "transfer";

                    const typePill = isIncome
                      ? { label: "รายรับ", bg: "var(--income-soft)", text: "var(--income-text)", icon: <ArrowUpRight size={11} /> }
                      : isTransfer
                        ? { label: "โอน", bg: "var(--neutral-soft)", text: "var(--neutral)", icon: <ArrowRightLeft size={11} /> }
                        : { label: "รายจ่าย", bg: "var(--expense-soft)", text: "var(--expense-text)", icon: <ArrowDownRight size={11} /> };

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className="cursor-pointer transition-colors hover:bg-[color:var(--app-surface-soft)]"
                      >
                        <td className="whitespace-nowrap py-3 pr-4">
                          <p className="text-sm font-medium text-[color:var(--app-text)]">
                            {formatShortDate(tx.date)}
                          </p>
                          <p className="text-[11px] text-[color:var(--app-text-subtle)]">
                            {tx.time ?? "—"}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ backgroundColor: typePill.bg, color: typePill.text }}
                          >
                            {typePill.icon}
                            {typePill.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[color:var(--app-text)]">
                              {tx.category}
                            </span>
                            {tx.tag && (
                              <span className="rounded-full bg-[color:var(--app-surface-soft)] px-1.5 py-0.5 text-[10px] text-[color:var(--app-text-muted)]">
                                {tx.tag}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="max-w-[220px] py-3 pr-4">
                          <span className="block truncate text-[color:var(--app-text-muted)]">
                            {tx.recipient ?? tx.note ?? "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3 text-right">
                          <span
                            className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold"
                            style={{ color: typePill.text }}
                          >
                            {getTransactionAmountPrefix(tx.type)}
                            {formatBaht(tx.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <p className="py-6 text-center text-sm text-[color:var(--app-text-muted)]">
                  ไม่พบรายการที่ตรงกับตัวกรองที่เลือก
                </p>
              )}
            </div>

            {filtered.length > 0 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-[color:var(--app-divider-soft)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[color:var(--app-text-muted)]">
                    รายการต่อหน้า
                  </span>
                  <div className="flex items-center gap-1 rounded-xl bg-[color:var(--app-surface-soft)] p-1">
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setPageSize(size);
                          setCurrentPage(1);
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          pageSize === size
                            ? "bg-[color:var(--app-surface-strong)] text-[color:var(--app-text)] shadow-[var(--app-card-shadow)]"
                            : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <p className="text-sm text-[color:var(--app-text-muted)]">
                    หน้า {safeCurrentPage} จาก {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={safeCurrentPage === 1}
                      className="theme-border theme-surface-soft inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium text-[color:var(--app-text)] transition-colors hover:bg-[color:var(--app-surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                      ก่อนหน้า
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      disabled={safeCurrentPage === totalPages}
                      className="theme-border theme-surface-soft inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium text-[color:var(--app-text)] transition-colors hover:bg-[color:var(--app-surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ถัดไป
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <TransactionDetailDrawer
        transaction={selectedTx}
        scopeTransactions={filtered}
        scopeLabel="ในมุมมองที่กำลังกรอง"
        onEdit={(transaction) => setEditingTx(transaction)}
        onDelete={handleDelete}
        mutationBusy={mutationBusy}
        onClose={() => setSelectedTx(null)}
      />

      {editingTx ? (
        <TransactionFormModal
          initial={editingTx}
          accounts={accounts}
          busy={mutationBusy}
          onClose={() => {
            if (!mutationBusy) setEditingTx(null);
          }}
          onSubmit={handleEditSubmit}
        />
      ) : null}
    </div>
  );
}
