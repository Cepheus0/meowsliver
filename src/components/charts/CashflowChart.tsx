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
import { useRouter } from "next/navigation";
import { useFinanceStore } from "@/store/finance-store";
import { formatBaht } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChartViewport } from "@/components/charts/ChartViewport";
import { EmptyState } from "@/components/ui/EmptyState";
import { chartTheme, chartColors } from "@/lib/chart-theme";
import { ChartColumnIncreasing, Table2 } from "lucide-react";
import { useTr } from "@/lib/i18n";

export function CashflowChart() {
  const { getMonthlyCashflow, selectedYear } = useFinanceStore();
  const router = useRouter();
  const tr = useTr();
  const data = getMonthlyCashflow();
  const hasData = data.some((month) => month.income > 0 || month.expense > 0);

  const handleBarClick = (barData: any) => {
    const monthIndex = barData?.monthIndex;
    if (monthIndex != null) {
      router.push(`/reports/${selectedYear}/${monthIndex + 1}`);
    }
  };

  if (!hasData) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>{tr(`กระแสเงินสด ปี ${selectedYear}`, `Cashflow · ${selectedYear}`)}</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<ChartColumnIncreasing size={20} />}
          title={tr(`ยังไม่มีรายการในปี ${selectedYear}`, `No transactions in ${selectedYear}`)}
          description={tr("นำเข้าธุรกรรมจริงก่อน แล้วกราฟรายรับ/รายจ่ายจะคำนวณให้อัตโนมัติ", "Import real transactions first, and the income/expense chart will calculate automatically.")}
          actionHref="/import"
          actionLabel={tr("ไปหน้านำเข้า", "Go to import")}
        />
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>{tr(`กระแสเงินสด ปี ${selectedYear}`, `Cashflow · ${selectedYear}`)}</CardTitle>
        <span className="text-xs text-[color:var(--app-text-subtle)]">
          {tr("คลิกที่บาร์เพื่อดูรายละเอียดรายเดือน", "Click a bar to see monthly details")}
        </span>
      </CardHeader>

      <ChartViewport className="h-72">
        {({ width, height }) => (
          <ComposedChart
            width={width}
            height={height}
            data={data}
            barCategoryGap="20%"
            barGap={3}
            margin={{ top: 8, right: 16, left: 4, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartTheme.grid}
              opacity={0.4}
              vertical={false}
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
              width={36}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(value) => formatBaht(Number(value))}
              contentStyle={chartTheme.tooltipStyle}
              cursor={{ fill: "var(--app-surface-soft)", opacity: 0.6 }}
            />
            <Legend wrapperStyle={{ ...chartTheme.legendStyle, paddingTop: "8px" }} />
            <Bar
              dataKey="income"
              name={tr("รายรับ", "Income")}
              fill={chartColors.income}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              cursor="pointer"
              onClick={handleBarClick}
            />
            <Bar
              dataKey="expense"
              name={tr("รายจ่าย", "Expense")}
              fill={chartColors.expense}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              cursor="pointer"
              onClick={handleBarClick}
            />
            <Line
              type="monotone"
              dataKey="net"
              name={tr("สุทธิ", "Net")}
              stroke={chartColors.net}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 3, fill: chartColors.net }}
            />
          </ComposedChart>
        )}
      </ChartViewport>
    </Card>
  );
}

export function YearlyComparisonTable() {
  const { getYearlySummaries } = useFinanceStore();
  const tr = useTr();
  const summaries = getYearlySummaries();
  const recent = summaries.slice(-3).reverse();

  if (recent.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>{tr("เปรียบเทียบรายปี", "Yearly Comparison")}</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<Table2 size={20} />}
          title={tr("ยังไม่มีข้อมูลย้อนหลังให้เปรียบเทียบ", "No historical data to compare")}
          description={tr("เมื่อมีรายการธุรกรรมจริง ระบบจะสรุปผลรายปีให้โดยอัตโนมัติ", "When there are real transactions, the system will automatically summarize yearly results.")}
          actionHref="/import"
          actionLabel={tr("นำเข้าธุรกรรม", "Import transactions")}
        />
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>{tr("เปรียบเทียบรายปีจากธุรกรรม", "Yearly comparison from transactions")}</CardTitle>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--app-divider)]">
              <th className="py-3 pr-4 font-medium text-[color:var(--app-text-muted)]">
                {tr("รายการ", "Item")}
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
                {tr("รายรับรวม", "Total Income")}
              </td>
              {recent.map((s) => (
                <td
                  key={s.year}
                  className="py-2.5 pr-4 font-[family-name:var(--font-geist-mono)] text-right font-medium text-[color:var(--income-text)]"
                >
                  {formatBaht(s.totalIncome)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 pr-4 text-[color:var(--app-text-muted)]">
                {tr("รายจ่ายรวม", "Total Expense")}
              </td>
              {recent.map((s) => (
                <td
                  key={s.year}
                  className="py-2.5 pr-4 font-[family-name:var(--font-geist-mono)] text-right font-medium text-[color:var(--expense-text)]"
                >
                  {formatBaht(s.totalExpense)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 pr-4 text-[color:var(--app-text-muted)]">
                {tr("เงินคงเหลือ", "Net Cashflow")}
              </td>
              {recent.map((s) => (
                <td
                  key={s.year}
                  className={`py-2.5 pr-4 font-[family-name:var(--font-geist-mono)] text-right font-bold ${
                    s.netCashflow >= 0
                      ? "text-[color:var(--income-text)]"
                      : "text-[color:var(--expense-text)]"
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
                  className="py-2.5 pr-4 font-[family-name:var(--font-geist-mono)] text-right font-medium text-[color:var(--app-brand-text)]"
                >
                  {s.savingsRate}%
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2.5 pr-4 text-[color:var(--app-text-muted)]">
                {tr("ยอดสุทธิสะสม", "Accumulated Net Worth")}
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
                {tr("การเปลี่ยนแปลงสะสม", "Accumulated Change")}
              </td>
              {recent.map((s) => (
                <td
                  key={s.year}
                  className={`py-2.5 pr-4 font-[family-name:var(--font-geist-mono)] text-right font-medium ${
                    s.netWorthGrowth >= 0
                      ? "text-[color:var(--income-text)]"
                      : "text-[color:var(--expense-text)]"
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
