"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import { useFinanceStore } from "@/store/finance-store";
import { formatBaht } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChartViewport } from "@/components/charts/ChartViewport";
import { EmptyState } from "@/components/ui/EmptyState";
import { chartTheme } from "@/lib/chart-theme";
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

      <ChartViewport className="h-72">
        {({ width, height }) => (
          <ComposedChart
            width={width}
            height={height}
            data={data}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartTheme.grid}
              opacity={0.3}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: chartTheme.axis }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: chartTheme.axis }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => formatBaht(Number(value))}
              contentStyle={chartTheme.tooltipStyle}
            />
            <Legend wrapperStyle={{ ...chartTheme.legendStyle, paddingTop: "8px" }} />
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
        )}
      </ChartViewport>
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
            <tr className="border-b border-[color:var(--app-divider)]">
              <th className="py-3 pr-4 font-medium text-[color:var(--app-text-muted)]">
                รายการ
              </th>
              {recent.map((s) => (
                <th
                  key={s.year}
                  className="py-3 pr-4 text-right font-medium text-[color:var(--app-text-muted)]"
                >
                  {s.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--app-divider-soft)]">
            <tr>
              <td className="py-2.5 pr-4 text-[color:var(--app-text-muted)]">
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
              <td className="py-2.5 pr-4 text-[color:var(--app-text-muted)]">
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
              <td className="py-2.5 pr-4 text-[color:var(--app-text-muted)]">
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
              <td className="py-2.5 pr-4 text-[color:var(--app-text-muted)]">
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
              <td className="py-2.5 pr-4 text-[color:var(--app-text-muted)]">
                ยอดสุทธิสะสม
              </td>
              {recent.map((s) => (
                <td
                  key={s.year}
                  className="py-2.5 pr-4 text-right font-bold text-[color:var(--app-text)]"
                >
                  {formatBaht(s.netWorth)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 pr-4 text-[color:var(--app-text-muted)]">
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
