"use client";

import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { useFinanceStoreHydrated } from "@/store/use-finance-store-hydrated";
import { refreshFinanceStoreFromServer } from "@/lib/client/finance-sync";
import { formatBaht } from "@/lib/utils";
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
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { TransactionDetailDrawer } from "@/components/transactions/TransactionDetailDrawer";
import {
  TransactionFormModal,
  type TransactionFormValues,
} from "@/components/transactions/TransactionFormModal";
import type { Transaction } from "@/lib/types";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/** Convert "2026-04-15" → "15 เม.ย." */
const THAI_MONTHS = [
  "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
function formatShortDate(dateStr: string): string {
  const parts = dateStr.split("-");
  const month = parseInt(parts[1] ?? "0", 10);
  const day   = parseInt(parts[2] ?? "0", 10);
  return `${day} ${THAI_MONTHS[month] ?? ""}`;
}

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

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense" | "transfer">(
    "all"
  );
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return visibleTransactions.filter((tx) => {
      const matchesType = filterType === "all" || tx.type === filterType;
      const matchesSearch =
        !search ||
        tx.category.toLowerCase().includes(search.toLowerCase()) ||
        tx.note?.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [visibleTransactions, search, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, safeCurrentPage, pageSize]);

  const pageStart = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd =
    filtered.length === 0 ? 0 : Math.min(safeCurrentPage * pageSize, filtered.length);

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
        headers: {
          "Content-Type": "application/json",
        },
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
    if (!confirm(`ลบรายการ "${transaction.category}" ใช่หรือไม่?`)) {
      return;
    }

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
        <Card className="border-red-200 bg-red-50/60 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--app-text-subtle)]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาหมวดหมู่ หมายเหตุ..."
                className="theme-border theme-surface w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm text-[color:var(--app-text)] outline-none focus:border-[#f54e00]"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-[color:var(--app-surface-soft)] p-1">
              <Filter size={14} className="ml-2 text-[color:var(--app-text-subtle)]" />
              {(["all", "income", "expense", "transfer"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(type);
                    setCurrentPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filterType === type
                      ? "bg-[color:var(--app-surface-strong)] text-[color:var(--app-text)] shadow-[var(--app-card-shadow)]"
                      : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                  }`}
                >
                  {type === "all" ? "ทั้งหมด" : getTransactionTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                แสดง {pageStart}-{pageEnd} จาก {filtered.length} รายการ
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
                    const isIncome   = tx.type === "income";
                    const isTransfer = tx.type === "transfer";

                    const typePill = isIncome
                      ? { label: "รายรับ",   bg: "var(--income-soft)",   text: "var(--income-text)",   icon: <ArrowUpRight size={11} /> }
                      : isTransfer
                      ? { label: "โอน",      bg: "var(--neutral-soft)",  text: "var(--neutral)",       icon: <ArrowRightLeft size={11} /> }
                      : { label: "รายจ่าย",  bg: "var(--expense-soft)",  text: "var(--expense-text)",  icon: <ArrowDownRight size={11} /> };

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className="cursor-pointer transition-colors hover:bg-[color:var(--app-surface-soft)]"
                      >
                        {/* date + time stacked */}
                        <td className="whitespace-nowrap py-3 pr-4">
                          <p className="text-sm font-medium text-[color:var(--app-text)]">
                            {formatShortDate(tx.date)}
                          </p>
                          <p className="text-[11px] text-[color:var(--app-text-subtle)]">
                            {tx.time ?? "—"}
                          </p>
                        </td>

                        {/* type pill */}
                        <td className="py-3 pr-4">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              backgroundColor: typePill.bg,
                              color: typePill.text,
                            }}
                          >
                            {typePill.icon}
                            {typePill.label}
                          </span>
                        </td>

                        {/* category */}
                        <td className="py-3 pr-4">
                          <span className="font-medium text-[color:var(--app-text)]">
                            {tx.category}
                          </span>
                        </td>

                        {/* note */}
                        <td className="max-w-[220px] py-3 pr-4">
                          <span className="block truncate text-[color:var(--app-text-muted)]">
                            {tx.note || "—"}
                          </span>
                        </td>

                        {/* amount */}
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
                  ไม่พบรายการที่ตรงกับคำค้นหาหรือประเภทที่เลือก
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

            {filtered.length > pageSize && (
              <p className="pt-3 text-center text-xs text-[color:var(--app-text-subtle)]">
                กำลังแสดงรายการที่ {pageStart}-{pageEnd} จากทั้งหมด {filtered.length} รายการ
              </p>
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
            if (!mutationBusy) {
              setEditingTx(null);
            }
          }}
          onSubmit={handleEditSubmit}
        />
      ) : null}
    </div>
  );
}
