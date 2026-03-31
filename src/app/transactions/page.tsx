"use client";

import { useState, useMemo } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { formatBaht } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Search, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TransactionsPage() {
  const { getTransactions, selectedYear } = useFinanceStore();
  const transactions = getTransactions();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType = filterType === "all" || tx.type === filterType;
      const matchesSearch =
        !search ||
        tx.category.toLowerCase().includes(search.toLowerCase()) ||
        tx.note?.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [transactions, search, filterType]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
          รายการทั้งหมด
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          ปี {selectedYear} — {transactions.length} รายการ
        </p>
      </div>

      {transactions.length === 0 ? (
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
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาหมวดหมู่ หมายเหตุ..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
              <Filter size={14} className="ml-2 text-zinc-400" />
              {(["all", "income", "expense"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filterType === type
                      ? "bg-white text-zinc-800 shadow dark:bg-zinc-700 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {type === "all" ? "ทั้งหมด" : type === "income" ? "รายรับ" : "รายจ่าย"}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                แสดง {filtered.length} จาก {transactions.length} รายการ
              </CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-3 pr-4 font-medium text-zinc-500 dark:text-zinc-400">วันที่</th>
                    <th className="py-3 pr-4 font-medium text-zinc-500 dark:text-zinc-400">หมวด</th>
                    <th className="py-3 pr-4 font-medium text-zinc-500 dark:text-zinc-400">หมายเหตุ</th>
                    <th className="py-3 pr-4 text-right font-medium text-zinc-500 dark:text-zinc-400">จำนวน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filtered.slice(0, 50).map((tx) => (
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
                      <td className="py-2.5 pr-4 text-zinc-500 dark:text-zinc-400">
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
              {filtered.length > 50 && (
                <p className="py-3 text-center text-xs text-zinc-400">
                  แสดง 50 รายการแรก จากทั้งหมด {filtered.length} รายการ
                </p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
