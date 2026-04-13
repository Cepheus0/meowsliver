"use client";

import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { useFinanceStoreHydrated } from "@/store/use-finance-store-hydrated";
import { formatBaht } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default function TransactionsPage() {
  const { getTransactions, selectedYear } = useFinanceStore();
  const storeHydrated = useFinanceStoreHydrated();
  const transactions = getTransactions();
  const visibleTransactions = useMemo(
    () => (storeHydrated ? transactions : []),
    [storeHydrated, transactions]
  );

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
  const [currentPage, setCurrentPage] = useState(1);

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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาหมวดหมู่ หมายเหตุ..."
                className="theme-border theme-surface w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm text-[color:var(--app-text)] outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-[color:var(--app-surface-soft)] p-1">
              <Filter size={14} className="ml-2 text-zinc-400" />
              {(["all", "income", "expense"] as const).map((type) => (
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
                  {type === "all" ? "ทั้งหมด" : type === "income" ? "รายรับ" : "รายจ่าย"}
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
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-3 pr-4 font-medium text-[color:var(--app-text-muted)]">
                      วันที่
                    </th>
                    <th className="py-3 pr-4 font-medium text-[color:var(--app-text-muted)]">
                      หมวด
                    </th>
                    <th className="py-3 pr-4 font-medium text-[color:var(--app-text-muted)]">
                      หมายเหตุ
                    </th>
                    <th className="py-3 pr-4 text-right font-medium text-[color:var(--app-text-muted)]">
                      จำนวน
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="whitespace-nowrap py-2.5 pr-4 text-zinc-600 dark:text-zinc-300">
                        {tx.date}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200">
                          {tx.type === "income" ? (
                            <ArrowUpRight size={14} className="text-emerald-500" />
                          ) : (
                            <ArrowDownRight size={14} className="text-red-500" />
                          )}
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-[color:var(--app-text-muted)]">
                        {tx.note || "-"}
                      </td>
                      <td
                        className={`whitespace-nowrap py-2.5 pr-4 text-right font-medium ${
                          tx.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatBaht(tx.amount)}
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}
