"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import { useFinanceStore } from "@/store/finance-store";
import { formatBaht } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ClientOnlyChart } from "@/components/charts/ClientOnlyChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartColumnIncreasing, Table2 } from "lucide-react";

export function CashflowChart() {
  const { getMonthlyCashflow, selectedYear } = useFinanceStore();
  const data = getMonthlyCashflow();
  const hasData = data.some((month) => month.income > 0 || month.expense > 0);

  if (!hasData) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>กระแสเงินสด ปี {selectedYear}</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<ChartColumnIncreasing size={20} />}
          title={`ยังไม่มีรายการในปี ${selectedYear}`}
          description="นำเข้าธุรกรรมจริงก่อน แล้วกราฟรายรับ/รายจ่ายจะคำนวณให้อัตโนมัติ"
          actionHref="/import"
          actionLabel="ไปหน้านำเข้า"
        />
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>กระแสเงินสด ปี {selectedYear}</CardTitle>
      </CardHeader>

      <ClientOnlyChart className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#27272a"
              opacity={0.3}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#a1a1aa" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#a1a1aa" }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => formatBaht(Number(value))}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #27272a",
                backgroundColor: "#18181b",
                color: "#f4f4f5",
                fontSize: "13px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            />
            <Bar
              dataKey="income"
              name="รายรับ"
              fill="#22c55e"
              radius={[6, 6, 0, 0]}
              barSize={20}
            />
            <Bar
              dataKey="expense"
              name="รายจ่าย"
              fill="#ef4444"
              radius={[6, 6, 0, 0]}
              barSize={20}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="สุทธิ"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ fill: "#3b82f6", r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ClientOnlyChart>
    </Card>
  );
}

export function YearlyComparisonTable() {
  const { getYearlySummaries } = useFinanceStore();
  const summaries = getYearlySummaries();
  const recent = summaries.slice(-3).reverse();

  if (recent.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>เปรียบเทียบรายปี</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<Table2 size={20} />}
          title="ยังไม่มีข้อมูลย้อนหลังให้เปรียบเทียบ"
          description="เมื่อมีรายการธุรกรรมจริง ระบบจะสรุปผลรายปีให้โดยอัตโนมัติ"
          actionHref="/import"
          actionLabel="นำเข้าธุรกรรม"
        />
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>เปรียบเทียบรายปีจากธุรกรรม</CardTitle>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-3 pr-4 font-medium text-zinc-500 dark:text-zinc-400">
                รายการ
              </th>
              {recent.map((s) => (
                <th
                  key={s.year}
                  className="py-3 pr-4 text-right font-medium text-zinc-500 dark:text-zinc-400"
                >
                  {s.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr>
              <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-300">
                รายรับรวม
              </td>
              {recent.map((s) => (
                <td
                  key={s.year}
                  className="py-2.5 pr-4 text-right font-medium text-emerald-600 dark:text-emerald-400"
                >
                  {formatBaht(s.totalIncome)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-300">
                รายจ่ายรวม
              </td>
              {recent.map((s) => (
                <td
                  key={s.year}
                  className="py-2.5 pr-4 text-right font-medium text-red-500"
                >
                  {formatBaht(s.totalExpense)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-300">
                เงินคงเหลือ
              </td>
              {recent.map((s) => (
                <td
                  key={s.year}
                  className={`py-2.5 pr-4 text-right font-bold ${
                    s.netCashflow >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500"
                  }`}
                >
                  {formatBaht(s.netCashflow)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-300">
                Savings Rate
              </td>
              {recent.map((s) => (
                <td
                  key={s.year}
                  className="py-2.5 pr-4 text-right font-medium text-blue-500"
                >
                  {s.savingsRate}%
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-300">
                ยอดสุทธิสะสม
              </td>
              {recent.map((s) => (
                <td
                  key={s.year}
                  className="py-2.5 pr-4 text-right font-bold text-zinc-800 dark:text-zinc-100"
                >
                  {formatBaht(s.netWorth)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-300">
                การเปลี่ยนแปลงสะสม
              </td>
              {recent.map((s) => (
                <td
                  key={s.year}
                  className={`py-2.5 pr-4 text-right font-medium ${
                    s.netWorthGrowth >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500"
                  }`}
                >
                  {s.netWorthGrowth >= 0 ? "+" : ""}
                  {s.netWorthGrowth}%
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
