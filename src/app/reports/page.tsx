"use client";

import Link from "next/link";
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
import { formatBaht, THAI_MONTHS, EN_MONTHS } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChartViewport } from "@/components/charts/ChartViewport";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getExpenseBreakdownFromTransactions,
  getMonthlyNetWorthTrendFromTransactions,
} from "@/lib/finance-analytics";
import { chartTheme, chartColors } from "@/lib/chart-theme";
import { CalendarDays, FileSpreadsheet, LineChart as LineChartIcon, Receipt } from "lucide-react";
import { useTr, useLanguage } from "@/lib/i18n";

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
  const tr = useTr();
  const language = useLanguage();
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
    ? tr(`ยอดสุทธิสะสมรายเดือน ปี ${selectedYear}`, `Monthly net worth · ${selectedYear}`)
    : tr("ยอดสุทธิสะสมย้อนหลัง", "Net worth over time");
  const netWorthChartDescription = shouldUseMonthlyNetWorthView
    ? tr(
        "ตอนนี้มีข้อมูลเพียงปีเดียว จึงแสดงเส้นสะสมรายเดือนของปีที่เลือกเพื่อให้เห็น momentum ภายในปี",
        "Only one year of data exists, so this shows the monthly net worth within the selected year to surface in-year momentum."
      )
    : tr(
        "เปรียบเทียบยอดสุทธิสะสมข้ามปีจากธุรกรรมที่มีอยู่ในระบบ",
        "Compare net worth across years using the transactions already in the system."
      );

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
      <PageHeader
        eyebrow="REPORTS"
        title={tr("รายงาน", "Reports")}
        description={tr(
          "วิเคราะห์แนวโน้มรายรับ รายจ่าย net worth และ savings rate จากธุรกรรมจริงย้อนหลังในมุมมองที่พร้อมใช้ตัดสินใจ",
          "Analyze income, expenses, net worth and savings rate trends from real transactions in a decision-ready view."
        )}
        meta={[
          {
            icon: <CalendarDays size={14} />,
            label: tr(`ปีที่เลือก ${selectedYear}`, `Selected year ${selectedYear}`),
            tone: "brand",
          },
          {
            icon: <Receipt size={14} />,
            label: hasAnyTransactions
              ? tr(
                  `${importedTransactions.length.toLocaleString()} ธุรกรรมในระบบ`,
                  `${importedTransactions.length.toLocaleString()} transactions on file`
                )
              : tr("ยังไม่มีธุรกรรมสำหรับสร้างรายงาน", "No transactions to build reports from"),
            tone: hasAnyTransactions ? "default" : "neutral",
          },
          {
            icon: <LineChartIcon size={14} />,
            label: hasSelectedYearData
              ? tr(`มีข้อมูลปี ${selectedYear}`, `Has data for ${selectedYear}`)
              : tr(`ยังไม่มีข้อมูลปี ${selectedYear}`, `No data for ${selectedYear}`),
            tone: hasSelectedYearData ? "success" : "neutral",
          },
        ]}
        actions={
          <Link
            href={hasAnyTransactions ? "/transactions" : "/import"}
            className="inline-flex items-center justify-center rounded-xl border border-[color:var(--app-brand)] bg-[color:var(--app-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_var(--app-brand-shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--app-brand-hover)]"
          >
            {hasAnyTransactions
              ? tr("เปิดรายการต้นทาง", "Open source transactions")
              : tr("เริ่มนำเข้าข้อมูล", "Start importing data")}
          </Link>
        }
      />

      {!hasAnyTransactions ? (
        <Card>
          <EmptyState
            icon={<FileSpreadsheet size={20} />}
            title={tr("ยังไม่มีข้อมูลสำหรับสร้างรายงาน", "No data to build reports from")}
            description={tr(
              "เมื่อคุณนำเข้าธุรกรรมจริง ระบบจะสร้างรายงานย้อนหลังให้อัตโนมัติ",
              "Once you import real transactions, the system will build historical reports automatically."
            )}
            actionHref="/import"
            actionLabel={tr("เริ่มนำเข้าข้อมูล", "Start importing data")}
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
                  name={tr("ยอดสุทธิสะสม", "Net worth")}
                  stroke={chartColors.net}
                  strokeWidth={3}
                  dot={{ fill: chartColors.net, r: shouldUseMonthlyNetWorthView ? 2.5 : 4 }}
                />
              </LineChart>
            )}
          </ChartViewport>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{tr(`สัดส่วนรายจ่าย ปี ${selectedYear}`, `Expense breakdown · ${selectedYear}`)}</CardTitle>
          </CardHeader>
          {expenseBreakdown.length === 0 ? (
            <EmptyState
              title={tr(`ยังไม่มีรายจ่ายในปี ${selectedYear}`, `No expenses in ${selectedYear}`)}
              description={tr(
                "ลองเปลี่ยนปีที่ด้านบน หรือเริ่มจากการนำเข้ารายการธุรกรรมจริงในปีที่ต้องการ",
                "Try switching the year at the top, or import real transactions for the year you want."
              )}
              actionHref="/import"
              actionLabel={tr("นำเข้าธุรกรรม", "Import transactions")}
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
                    <span className="ml-auto font-medium text-[color:var(--app-text)]">
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
            <CardTitle>{tr(`รายรับ vs รายจ่าย รายเดือน ปี ${selectedYear}`, `Monthly income vs expense · ${selectedYear}`)}</CardTitle>
          </CardHeader>
          {hasSelectedYearData ? (
            <>
              <p className="-mt-1 mb-2 text-xs text-[color:var(--app-text-muted)]">
                {tr("คลิกที่แท่งเพื่อดูรายละเอียดของเดือนนั้น", "Click a bar to see that month's details")}
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
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 10, fill: chartTheme.axis }} 
                      tickFormatter={(v) => {
                        const idx = THAI_MONTHS.indexOf(v);
                        if (idx >= 0 && language === "en") return EN_MONTHS[idx];
                        return v;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: chartTheme.axis }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) => formatBaht(Number(value))}
                      contentStyle={chartTheme.tooltipStyle}
                      cursor={{ fill: "var(--app-brand-soft)" }}
                    />
                    <Bar
                      dataKey="income"
                      name={tr("รายรับ", "Income")}
                      fill={chartColors.income}
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="expense"
                      name={tr("รายจ่าย", "Expense")}
                      fill={chartColors.expense}
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                  </BarChart>
                )}
              </ChartViewport>
            </>
          ) : (
            <EmptyState
              title={tr(`ยังไม่มีข้อมูลปี ${selectedYear}`, `No data for ${selectedYear}`)}
              description={tr(
                "กราฟรายเดือนจะแสดงเมื่อมีรายการรายรับหรือรายจ่ายในปีที่เลือก",
                "The monthly chart appears once income or expense transactions exist in the selected year."
              )}
            />
          )}
        </Card>

        {/* Savings Rate Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>{tr("อัตราการออม % ย้อนหลัง", "Savings rate % over time")}</CardTitle>
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
                <Bar dataKey="rate" name="Savings Rate" fill={chartColors.metric} radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ChartViewport>
        </Card>
      </div>
      )}
    </div>
  );
}
