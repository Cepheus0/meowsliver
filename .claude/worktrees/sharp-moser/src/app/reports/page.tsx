"use client";

import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useFinanceStore } from "@/store/finance-store";
import { formatBaht, THAI_MONTHS } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChartViewport } from "@/components/charts/ChartViewport";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getExpenseBreakdownFromTransactions,
  getMonthlyNetWorthTrendFromTransactions,
} from "@/lib/finance-analytics";
import { chartTheme } from "@/lib/chart-theme";
import { FileSpreadsheet } from "lucide-react";

function formatCurrencyAxis(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }

  return `${Math.round(value)}`;
}

export default function ReportsPage() {
  const router = useRouter();
  const { getYearlySummaries, getMonthlyCashflow, getTransactions, selectedYear, importedTransactions } =
    useFinanceStore();
  const summaries = getYearlySummaries();
  const monthly = getMonthlyCashflow();
  const selectedYearTransactions = getTransactions();

  // Net Worth over years
  const yearlyNetWorthData = summaries.map((s) => ({
    label: String(s.year),
    netWorth: s.netWorth,
  }));
  const monthlyNetWorthData = getMonthlyNetWorthTrendFromTransactions(
    importedTransactions,
    selectedYear
  ).map((point) => ({
    label: point.month,
    netWorth: point.netWorth,
  }));
  const shouldUseMonthlyNetWorthView =
    summaries.length <= 1 && monthlyNetWorthData.some((point) => point.netWorth !== 0);
  const netWorthChartData = shouldUseMonthlyNetWorthView
    ? monthlyNetWorthData
    : yearlyNetWorthData;
  const netWorthChartTitle = shouldUseMonthlyNetWorthView
    ? `ยอดสุทธิสะสมรายเดือน ปี ${selectedYear}`
    : "ยอดสุทธิสะสมย้อนหลัง";
  const netWorthChartDescription = shouldUseMonthlyNetWorthView
    ? "ตอนนี้มีข้อมูลเพียงปีเดียว จึงแสดงเส้นสะสมรายเดือนของปีที่เลือกเพื่อให้เห็น momentum ภายในปี"
    : "เปรียบเทียบยอดสุทธิสะสมข้ามปีจากธุรกรรมที่มีอยู่ในระบบ";

  const expenseBreakdown = getExpenseBreakdownFromTransactions(
    importedTransactions,
    selectedYear
  );

  const savingsData = summaries.map((s) => ({
    year: String(s.year),
    rate: s.savingsRate,
  }));

  const hasAnyTransactions = importedTransactions.length > 0;
  const hasSelectedYearData = selectedYearTransactions.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--app-text)]">
          รายงาน
        </h1>
        <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
          วิเคราะห์ภาพรวมการเงินย้อนหลัง
        </p>
      </div>

      {!hasAnyTransactions ? (
        <Card>
          <EmptyState
            icon={<FileSpreadsheet size={20} />}
            title="ยังไม่มีข้อมูลสำหรับสร้างรายงาน"
            description="เมื่อคุณนำเข้าธุรกรรมจริง ระบบจะสร้างรายงานย้อนหลังให้อัตโนมัติ"
            actionHref="/import"
            actionLabel="เริ่มนำเข้าข้อมูล"
          />
        </Card>
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Net Worth Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>{netWorthChartTitle}</CardTitle>
          </CardHeader>
          <p className="-mt-1 mb-3 text-xs text-[color:var(--app-text-muted)]">
            {netWorthChartDescription}
          </p>
          <ChartViewport className="h-64">
            {({ width, height }) => (
              <LineChart
                width={width}
                height={height}
                data={netWorthChartData}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} opacity={0.3} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: chartTheme.axis }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: chartTheme.axis }}
                  tickFormatter={formatCurrencyAxis}
                />
                <Tooltip
                  formatter={(value) => formatBaht(Number(value))}
                  contentStyle={chartTheme.tooltipStyle}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  name="ยอดสุทธิสะสม"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ fill: "#22c55e", r: shouldUseMonthlyNetWorthView ? 2.5 : 4 }}
                />
              </LineChart>
            )}
          </ChartViewport>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>สัดส่วนรายจ่าย ปี {selectedYear}</CardTitle>
          </CardHeader>
          {expenseBreakdown.length === 0 ? (
            <EmptyState
              title={`ยังไม่มีรายจ่ายในปี ${selectedYear}`}
              description="ลองเปลี่ยนปีที่ด้านบน หรือเริ่มจากการนำเข้ารายการธุรกรรมจริงในปีที่ต้องการ"
              actionHref="/import"
              actionLabel="นำเข้าธุรกรรม"
            />
          ) : (
            <>
            <ChartViewport className="h-64">
                {({ width, height }) => (
                  <PieChart width={width} height={height}>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatBaht(Number(value))}
                      contentStyle={chartTheme.tooltipStyle}
                    />
                  </PieChart>
                )}
              </ChartViewport>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {expenseBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[color:var(--app-text-muted)]">
                      {item.name}
                    </span>
                    <span className="ml-auto font-medium text-zinc-700 dark:text-zinc-200">
                      {formatBaht(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Monthly Expense vs Income */}
        <Card>
          <CardHeader>
            <CardTitle>รายรับ vs รายจ่าย รายเดือน ปี {selectedYear}</CardTitle>
          </CardHeader>
          {hasSelectedYearData ? (
            <>
              <p className="-mt-1 mb-2 text-xs text-[color:var(--app-text-muted)]">
                คลิกที่แท่งเพื่อดูรายละเอียดของเดือนนั้น
              </p>
              <ChartViewport className="h-64">
                {({ width, height }) => (
                  <BarChart
                    width={width}
                    height={height}
                    data={monthly}
                    onClick={(state) => {
                      const monthLabel = state?.activeLabel as string | undefined;
                      if (!monthLabel) return;
                      const monthIndex = THAI_MONTHS.indexOf(
                        monthLabel as (typeof THAI_MONTHS)[number]
                      );
                      if (monthIndex < 0) return;
                      router.push(`/reports/${selectedYear}/${monthIndex + 1}`);
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: chartTheme.axis }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: chartTheme.axis }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) => formatBaht(Number(value))}
                      contentStyle={chartTheme.tooltipStyle}
                      cursor={{ fill: "rgba(34,197,94,0.08)" }}
                    />
                    <Bar
                      dataKey="income"
                      name="รายรับ"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="expense"
                      name="รายจ่าย"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                  </BarChart>
                )}
              </ChartViewport>
            </>
          ) : (
            <EmptyState
              title={`ยังไม่มีข้อมูลปี ${selectedYear}`}
              description="กราฟรายเดือนจะแสดงเมื่อมีรายการรายรับหรือรายจ่ายในปีที่เลือก"
            />
          )}
        </Card>

        {/* Savings Rate Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>อัตราการออม % ย้อนหลัง</CardTitle>
          </CardHeader>
          <ChartViewport className="h-64">
            {({ width, height }) => (
              <BarChart width={width} height={height} data={savingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} opacity={0.3} />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: chartTheme.axis }} />
                <YAxis tick={{ fontSize: 10, fill: chartTheme.axis }} unit="%" />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                  contentStyle={chartTheme.tooltipStyle}
                />
                <Bar dataKey="rate" name="Savings Rate" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ChartViewport>
        </Card>
      </div>
      )}
    </div>
  );
}
