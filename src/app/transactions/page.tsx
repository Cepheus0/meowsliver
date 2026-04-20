"use client";

import Link from "next/link";
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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  CalendarDays,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Trash2,
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
import { useTr, useLanguage } from "@/lib/i18n";

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
  const tr = useTr();
  const language = useLanguage();
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
  const [pendingDeleteTx, setPendingDeleteTx] = useState<Transaction | null>(null);

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
        throw new Error(
          data.error ?? tr("ไม่สามารถอัปเดตรายการได้", "Could not update transaction")
        );
      }

      await refreshAfterMutation(Number(values.date.slice(0, 4)));
      setSelectedTx(null);
      setEditingTx(null);
    } catch (error) {
      setMutationError(
        error instanceof Error
          ? error.message
          : tr("ไม่สามารถอัปเดตรายการได้", "Could not update transaction")
      );
    } finally {
      setMutationBusy(false);
    }
  };

  const handleDelete = (transaction: Transaction) => {
    setPendingDeleteTx(transaction);
  };

  const confirmDeleteTx = async () => {
    if (!pendingDeleteTx) return;
    const transaction = pendingDeleteTx;
    setMutationBusy(true);
    setMutationError(null);

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          data.error ?? tr("ไม่สามารถลบรายการได้", "Could not delete transaction")
        );
      }

      await refreshAfterMutation(Number(transaction.date.slice(0, 4)));
      setSelectedTx(null);
      setPendingDeleteTx(null);
    } catch (error) {
      setMutationError(
        error instanceof Error
          ? error.message
          : tr("ไม่สามารถลบรายการได้", "Could not delete transaction")
      );
    } finally {
      setMutationBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr("TRANSACTIONS · รายการ", "TRANSACTIONS")}
        title={tr("รายการทั้งหมด", "All transactions")}
        description={tr(
          "ค้นหา กรอง และเปิดดูแต่ละรายการอย่างรวดเร็วในปีที่เลือก โดยคงโฟลว์แก้ไขและตรวจสอบแหล่งที่มาไว้ในหน้าเดียว",
          "Search, filter, and inspect each transaction quickly within the selected year while keeping edit and provenance workflows in one place."
        )}
        meta={[
          {
            icon: <CalendarDays size={14} />,
            label: `${tr("ปี", "Year")} ${selectedYear}`,
            tone: "brand",
          },
          {
            icon: <Search size={14} />,
            label: storeHydrated
              ? tr(
                  `${visibleTransactions.length.toLocaleString()} รายการในปีนี้`,
                  `${visibleTransactions.length.toLocaleString()} rows this year`
                )
              : tr("กำลังโหลดธุรกรรม", "Loading transactions"),
            tone: storeHydrated ? "default" : "neutral",
          },
          ...(activeFilterCount > 0
            ? [
                {
                  icon: <Sliders size={14} />,
                  label: tr(
                    `${activeFilterCount} ตัวกรองทำงานอยู่`,
                    `${activeFilterCount} filters active`
                  ),
                  tone: "neutral" as const,
                },
              ]
            : []),
        ]}
        actions={
          <>
            <Link
              href="/reports"
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2.5 text-sm font-medium text-[color:var(--app-text)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--app-border-strong)]"
            >
              {tr("ดูรายงาน", "Open reports")}
            </Link>
            <Link
              href="/import"
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--app-brand)] bg-[color:var(--app-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_var(--app-brand-shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--app-brand-hover)]"
            >
              {tr("นำเข้าข้อมูลเพิ่ม", "Import more data")}
            </Link>
          </>
        }
      />

      {mutationError ? (
        <Card className="border-[color:var(--expense-soft)] bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]">
          <p className="text-sm font-medium">{mutationError}</p>
        </Card>
      ) : null}

      {!storeHydrated ? (
        <Card>
          <EmptyState
            icon={<Search size={20} />}
            title={tr("กำลังเตรียมข้อมูลธุรกรรม", "Preparing transaction data")}
            description={tr(
              "กำลังโหลดรายการที่บันทึกไว้และตรวจสอบข้อมูลล่าสุดของปีที่เลือก",
              "Loading saved transactions and checking the latest data for the selected year."
            )}
          />
        </Card>
      ) : visibleTransactions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search size={20} />}
            title={tr(
              `ยังไม่มีรายการในปี ${selectedYear}`,
              `No transactions in ${selectedYear} yet`
            )}
            description={tr(
              "นำเข้าธุรกรรมจริงหรือบันทึกรายการใหม่ก่อน แล้วตารางรายการทั้งหมดจะปรากฏที่หน้านี้",
              "Import real transactions or add a new entry first, then the full transaction table will appear here."
            )}
            actionHref="/import"
            actionLabel={tr("ไปหน้านำเข้า", "Go to import")}
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
                  placeholder={tr(
                    "ค้นหา หมวด / ผู้รับ / หมายเหตุ...",
                    "Search category / recipient / note..."
                  )}
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
                      {type === "all"
                        ? tr("ทั้งหมด", "All")
                        : getTransactionTypeLabel(type, language)}
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
                {tr("ตัวกรอง", "Filters")}
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
                  {tr("ล้างทั้งหมด", "Clear all")}
                </button>
              )}
            </div>

            {/* Advanced dimension filters — collapsible so the page stays scannable */}
            {showAdvancedFilters && (
              <div className="mt-4 space-y-4 border-t border-[color:var(--app-divider-soft)] pt-4">
                <FilterChips
                  label={tr("หมวด", "Category")}
                  slices={breakdowns.category}
                  selected={filters.categories}
                  onToggle={(v) => toggleInSet("categories", v)}
                />
                <FilterChips
                  label={tr("แท็ก", "Tag")}
                  slices={breakdowns.tag}
                  selected={filters.tags}
                  onToggle={(v) => toggleInSet("tags", v)}
                />
                <FilterChips
                  label={tr("ช่องทางจ่าย", "Payment channel")}
                  slices={breakdowns.paymentChannel}
                  selected={filters.paymentChannels}
                  onToggle={(v) => toggleInSet("paymentChannels", v)}
                />
                <FilterChips
                  label={tr("จากบัญชี", "From account")}
                  slices={breakdowns.payFrom}
                  selected={filters.payFroms}
                  onToggle={(v) => toggleInSet("payFroms", v)}
                />
                <FilterChips
                  label={tr("ผู้รับ", "Recipient")}
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
                  ? tr(
                      `รายการทั้งหมด (${visibleTransactions.length})`,
                      `All transactions (${visibleTransactions.length})`
                    )
                  : tr(
                      `แสดง ${pageStart}-${pageEnd} จาก ${filtered.length} รายการ`,
                      `Showing ${pageStart}-${pageEnd} of ${filtered.length}`
                    )}
              </CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--app-divider)]">
                    <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      {tr("วันที่", "Date")}
                    </th>
                    <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      {tr("ประเภท", "Type")}
                    </th>
                    <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      {tr("หมวดหมู่", "Category")}
                    </th>
                    <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      {tr("หมายเหตุ", "Note")}
                    </th>
                    <th className="py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[color:var(--app-text-subtle)]">
                      {tr("จำนวน", "Amount")}
                    </th>
                    <th className="w-10 py-3" aria-label={tr("การกระทำ", "Actions")} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--app-divider-soft)]">
                  {paginatedTransactions.map((tx) => {
                    const isIncome = tx.type === "income";
                    const isTransfer = tx.type === "transfer";

                    const typePill = isIncome
                      ? { label: tr("รายรับ", "Income"), bg: "var(--income-soft)", text: "var(--income-text)", icon: <ArrowUpRight size={11} /> }
                      : isTransfer
                        ? { label: tr("โอน", "Transfer"), bg: "var(--neutral-soft)", text: "var(--neutral)", icon: <ArrowRightLeft size={11} /> }
                        : { label: tr("รายจ่าย", "Expense"), bg: "var(--expense-soft)", text: "var(--expense-text)", icon: <ArrowDownRight size={11} /> };

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className="group cursor-pointer transition-colors hover:bg-[color:var(--app-surface-soft)]"
                      >
                        <td className="whitespace-nowrap py-3 pr-4">
                          <p className="text-sm font-medium text-[color:var(--app-text)]">
                            {formatShortDate(tx.date, language)}
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
                        <td className="py-3 pl-2 pr-1 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(tx);
                            }}
                            aria-label={tr("ลบรายการ", "Delete transaction")}
                            title={tr("ลบรายการ", "Delete transaction")}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--app-text-muted)] opacity-0 transition-all hover:bg-[color:var(--expense-soft)] hover:text-[color:var(--expense-text)] group-hover:opacity-100 focus:opacity-100"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <p className="py-6 text-center text-sm text-[color:var(--app-text-muted)]">
                  {tr(
                    "ไม่พบรายการที่ตรงกับตัวกรองที่เลือก",
                    "No transactions match the selected filters"
                  )}
                </p>
              )}
            </div>

            {filtered.length > 0 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-[color:var(--app-divider-soft)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[color:var(--app-text-muted)]">
                    {tr("รายการต่อหน้า", "Per page")}
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
                    {tr(
                      `หน้า ${safeCurrentPage} จาก ${totalPages}`,
                      `Page ${safeCurrentPage} of ${totalPages}`
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={safeCurrentPage === 1}
                      className="theme-border theme-surface-soft inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium text-[color:var(--app-text)] transition-colors hover:bg-[color:var(--app-surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                      {tr("ก่อนหน้า", "Previous")}
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      disabled={safeCurrentPage === totalPages}
                      className="theme-border theme-surface-soft inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium text-[color:var(--app-text)] transition-colors hover:bg-[color:var(--app-surface-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {tr("ถัดไป", "Next")}
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
        scopeLabel={tr("ในมุมมองที่กำลังกรอง", "in current filtered view")}
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

      <ConfirmDialog
        open={pendingDeleteTx !== null}
        busy={mutationBusy}
        tone="danger"
        title={tr("ลบรายการนี้?", "Delete this transaction?")}
        description={
          pendingDeleteTx
            ? tr(
                `"${pendingDeleteTx.category}" (${formatBaht(pendingDeleteTx.amount)}) จะถูกลบถาวร`,
                `"${pendingDeleteTx.category}" (${formatBaht(pendingDeleteTx.amount)}) will be permanently removed.`
              )
            : undefined
        }
        confirmLabel={tr("ลบ", "Delete")}
        onCancel={() => {
          if (!mutationBusy) setPendingDeleteTx(null);
        }}
        onConfirm={confirmDeleteTx}
      />
    </div>
  );
}
