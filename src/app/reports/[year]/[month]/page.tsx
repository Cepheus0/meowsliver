"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Search,
  Sliders,
} from "lucide-react";
import { useTr, useLanguage } from "@/lib/i18n";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChartViewport } from "@/components/charts/ChartViewport";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/transactions/FilterChips";
import { TransactionDetailDrawer } from "@/components/transactions/TransactionDetailDrawer";
import { chartTheme } from "@/lib/chart-theme";
import {
  applyMonthlyFilters,
  buildBreakdown,
  buildSubBreakdownByValue,
  computeTotals,
  EMPTY_FILTER_STATE,
  getMonthlyDetailFromTransactions,
  rollupDaily,
  type DimensionSlice,
  type Granularity,
  type MonthlyFilterState,
  type MonthlyTotals,
} from "@/lib/monthly-detail-analytics";
import {
  getTransactionAmountPrefix,
  getTransactionTypeLabel,
} from "@/lib/transaction-presentation";
import { useFinanceStore } from "@/store/finance-store";
import { useFinanceStoreHydrated } from "@/store/use-finance-store-hydrated";
import { formatBaht, formatShortDate, getMonthLabel } from "@/lib/utils";
import type { Transaction, TransactionType } from "@/lib/types";

// Warm editorial palette matching the rest of the app. Keeps the pie
// readable on the cream background and stays coherent with finance
// semantic colours (income-green first, expense-red second).
const PIE_COLORS = [
  "#cf2d56", // expense red
  "#c08532", // neutral brown/gold
  "#7c5cd6", // purple
  "#d14a7e", // pink
  "#3b82f6", // blue
  "#1f8a65", // income green
  "#8b8278", // warm grey
];

export default function MonthlyReportPage() {
  const router = useRouter();
  const tr = useTr();
  const language = useLanguage();
  const params = useParams<{ year: string; month: string }>();
  const year = Number.parseInt(params.year ?? "", 10);
  const monthIndex = Number.parseInt(params.month ?? "", 10) - 1;
  const validParams =
    Number.isFinite(year) && monthIndex >= 0 && monthIndex <= 11;

  const { importedTransactions } = useFinanceStore();
  const storeHydrated = useFinanceStoreHydrated();

  const detail = useMemo(() => {
    if (!validParams) return null;
    return getMonthlyDetailFromTransactions(
      storeHydrated ? importedTransactions : [],
      year,
      monthIndex
    );
  }, [importedTransactions, storeHydrated, validParams, year, monthIndex]);

  const [filters, setFilters] = useState<MonthlyFilterState>(EMPTY_FILTER_STATE);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [granularity, setGranularity] = useState<Granularity>("day");

  const filtered = useMemo(() => {
    if (!detail) return [];
    return applyMonthlyFilters(detail.transactions, filters);
  }, [detail, filters]);

  // Subset of transactions inside the clicked chart range (date filter only,
  // ignoring chip/search filters). Used by the drill-down panel so it always
  // describes "what's in this slice of time" regardless of other filters.
  const rangeSubset = useMemo(() => {
    if (!detail || !filters.dateFrom || !filters.dateTo) return null;
    return detail.transactions.filter(
      (tx) => tx.date >= filters.dateFrom! && tx.date <= filters.dateTo!
    );
  }, [detail, filters.dateFrom, filters.dateTo]);

  const rangeTotals = useMemo(
    () => (rangeSubset ? computeTotals(rangeSubset) : null),
    [rangeSubset]
  );
  const rangeCategoryBreakdown = useMemo(
    () => (rangeSubset ? buildBreakdown(rangeSubset, "category") : []),
    [rangeSubset]
  );
  const rangeTagBreakdown = useMemo(
    () => (rangeSubset ? buildBreakdown(rangeSubset, "tag") : []),
    [rangeSubset]
  );

  // category → tag sub-breakdown. Powers the "hover a category slice to see
  // which tags live inside" tooltip. Computed once per dataset so the tooltip
  // doesn't re-scan transactions on every mouse move.
  const monthCategoryTagMap = useMemo(
    () =>
      detail
        ? buildSubBreakdownByValue(detail.transactions, "category", "tag")
        : new Map<string, DimensionSlice[]>(),
    [detail]
  );
  const rangeCategoryTagMap = useMemo(
    () =>
      rangeSubset
        ? buildSubBreakdownByValue(rangeSubset, "category", "tag")
        : new Map<string, DimensionSlice[]>(),
    [rangeSubset]
  );

  if (!validParams) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card>
          <EmptyState
            title={tr("พารามิเตอร์ไม่ถูกต้อง", "Invalid parameters")}
            description={tr("URL ต้องอยู่ในรูปแบบ /reports/2026/2 (ปี/เลขเดือน 1-12)", "URL must be in the format /reports/2026/2 (Year/Month 1-12)")}
          />
        </Card>
      </div>
    );
  }

  if (!detail) return null;

  const { totals, daily, breakdowns } = detail;
  const monthTitle = getMonthLabel(monthIndex, language, "full");
  const hasData = totals.count > 0;

  const toggleInSet = (key: keyof MonthlyFilterState, value: string) => {
    setFilters((prev) => {
      const current = prev[key];
      if (!(current instanceof Set)) return prev;
      const next = new Set(current as Set<string>);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [key]: next };
    });
  };

  const toggleType = (type: TransactionType) => {
    setFilters((prev) => {
      const next = new Set(prev.types);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { ...prev, types: next };
    });
  };

  const chartData = rollupDaily(daily, monthTitle, granularity);

  const handleBarClick = (state: { activeLabel?: unknown }) => {
    const label = state?.activeLabel;
    if (typeof label !== "string") return;
    const bucket = chartData.find((row) => row.label === label);
    if (!bucket) return;
    // If user clicks the *same* range that's already active, clear it. Lets
    // them un-filter by clicking the highlighted bar again — symmetry beats
    // an extra "clear" button.
    if (filters.dateFrom === bucket.dateFrom && filters.dateTo === bucket.dateTo) {
      setFilters((prev) => ({
        ...prev,
        dateFrom: undefined,
        dateTo: undefined,
        dateRangeLabel: undefined,
      }));
      return;
    }
    setFilters((prev) => ({
      ...prev,
      dateFrom: bucket.dateFrom,
      dateTo: bucket.dateTo,
      dateRangeLabel: bucket.rangeLabel,
    }));
  };

  const categoryPie = breakdowns.category
    .filter((slice) => slice.amount > 0)
    .slice(0, 7)
    .map((slice, idx) => ({
      name: slice.label,
      value: slice.amount,
      color: PIE_COLORS[idx % PIE_COLORS.length],
      // Attach per-category tag breakdown so the custom tooltip can show
      // "within this category, tags break down like this" without prop-drilling
      // the whole map into the Tooltip render fn.
      subSlices: slice.value ? monthCategoryTagMap.get(slice.value) ?? [] : [],
    }));

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

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <BackLink />
        <PageHeader
          eyebrow="MONTHLY REPORT"
          title={`${monthTitle} ${year}`}
          description={
            hasData
              ? tr("ดูโครงสร้างรายรับ รายจ่าย ช่วงเวลา และรายการที่ขับเคลื่อนผลของเดือนนี้แบบ drill-down", "View breakdown of income, expenses, timeline, and transactions driving this month's results via drill-down")
              : tr("เดือนนี้ยังไม่มีรายการ จึงยังไม่สามารถคำนวณ breakdown หรือ pattern ภายในเดือนได้", "No transactions this month, so breakdown or patterns cannot be calculated yet")
          }
          meta={[
            {
              icon: <Search size={14} />,
              label: hasData ? tr(`${totals.count} รายการ`, `${totals.count} transactions`) : tr("ยังไม่มีรายการ", "No transactions"),
              tone: hasData ? "brand" : "neutral",
            },
            {
              icon: <ArrowUpRight size={14} />,
              label: hasData ? tr(`สุทธิ ${formatBaht(totals.net)}`, `Net ${formatBaht(totals.net)}`) : tr("รอข้อมูลธุรกรรม", "Awaiting transaction data"),
              tone: hasData ? (totals.net >= 0 ? "success" : "danger") : "neutral",
            },
          ]}
          actions={<MonthSwitcher year={year} monthIndex={monthIndex} router={router} />}
        />
      </div>

      {!hasData ? (
        <Card>
          <EmptyState
            title={tr(`ยังไม่มีข้อมูล ${monthTitle} ${year}`, `No data for ${monthTitle} ${year}`)}
            description={tr("ลองเลือกเดือนอื่นจากปุ่มด้านบน หรือไปหน้านำเข้าเพื่อเพิ่มข้อมูลของเดือนนี้", "Try selecting another month from the top button, or go to the import page to add data for this month")}
            actionHref="/import"
            actionLabel={tr("ไปหน้านำเข้า", "Go to import")}
          />
        </Card>
      ) : (
        <>
          <SummaryCards totals={totals} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{tr("รายรับ vs รายจ่าย", "Income vs Expense")}</CardTitle>
                <div className="flex items-center gap-1 rounded-xl bg-[color:var(--app-surface-soft)] p-1">
                  {(
                    [
                      { value: "day", label: tr("รายวัน", "Daily") },
                      { value: "week", label: tr("รายอาทิตย์", "Weekly") },
                      { value: "month", label: tr("รายเดือน", "Monthly") },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setGranularity(opt.value)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        granularity === opt.value
                          ? "bg-[color:var(--app-surface-strong)] text-[color:var(--app-text)] shadow-[var(--app-card-shadow)]"
                          : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <p className="-mt-1 mb-2 text-xs text-[color:var(--app-text-muted)]">
                {tr("คลิกที่แท่งเพื่อกรองตารางด้านล่างให้เหลือเฉพาะช่วงนั้น (คลิกซ้ำเพื่อล้าง)", "Click a bar to filter the table below to that period (click again to clear)")}
              </p>
              <ChartViewport className="h-64">
                {({ width, height }) => (
                  <BarChart
                    width={width}
                    height={height}
                    data={chartData}
                    onClick={handleBarClick}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartTheme.grid}
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: chartTheme.axis }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: chartTheme.axis }}
                      tickFormatter={(value) =>
                        value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
                      }
                    />
                    <Tooltip
                      formatter={(value) => formatBaht(Number(value))}
                      contentStyle={chartTheme.tooltipStyle}
                      cursor={{ fill: "var(--app-brand-soft)" }}
                    />
                    <Bar
                      dataKey="income"
                      name={tr("รายรับ", "Income")}
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    >
                      {chartData.map((entry) => {
                        const active =
                          filters.dateFrom === entry.dateFrom &&
                          filters.dateTo === entry.dateTo;
                        return (
                          <Cell
                            key={`income-${entry.label}`}
                            fill={active ? "var(--income-text)" : "var(--income)"}
                            opacity={
                              filters.dateFrom && !active ? 0.35 : 1
                            }
                          />
                        );
                      })}
                    </Bar>
                    <Bar
                      dataKey="expense"
                      name={tr("รายจ่าย", "Expense")}
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    >
                      {chartData.map((entry) => {
                        const active =
                          filters.dateFrom === entry.dateFrom &&
                          filters.dateTo === entry.dateTo;
                        return (
                          <Cell
                            key={`expense-${entry.label}`}
                            fill={active ? "var(--expense-text)" : "var(--expense)"}
                            opacity={
                              filters.dateFrom && !active ? 0.35 : 1
                            }
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                )}
              </ChartViewport>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tr("สัดส่วนรายจ่ายตามหมวด", "Expense Breakdown by Category")}</CardTitle>
              </CardHeader>
              {categoryPie.length === 0 ? (
                <EmptyState
                  title={tr("ไม่มีรายจ่าย", "No expenses")}
                  description={tr("เดือนนี้มีแต่รายรับหรือย้ายเงิน", "Only income or transfers this month")}
                />
              ) : (
                <>
                  <ChartViewport className="h-48">
                    {({ width, height }) => (
                      <PieChart width={width} height={height}>
                        <Pie
                          data={categoryPie}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                          nameKey="name"
                          paddingAngle={2}
                          isAnimationActive={false}
                        >
                          {categoryPie.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CategoryTagTooltip />} />
                      </PieChart>
                    )}
                  </ChartViewport>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {categoryPie.map((entry) => (
                      <li key={entry.name} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-[color:var(--app-text-muted)]">
                          {entry.name}
                        </span>
                        <span className="ml-auto font-medium text-[color:var(--app-text)]">
                          {formatBaht(entry.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>

          {rangeSubset && rangeTotals && filters.dateRangeLabel && (
            <RangeDetailSection
              label={filters.dateRangeLabel}
              totals={rangeTotals}
              categoryBreakdown={rangeCategoryBreakdown}
              tagBreakdown={rangeTagBreakdown}
              categoryTagMap={rangeCategoryTagMap}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-2">
                  <Sliders size={14} />
                  {tr("ตัวกรอง", "Filters")} {activeFilterCount > 0 && `(${activeFilterCount})`}
                </span>
              </CardTitle>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters(EMPTY_FILTER_STATE)}
                  className="text-xs text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                >
                  {tr("ล้างทั้งหมด", "Clear all")}
                </button>
              )}
            </CardHeader>

            <div className="space-y-4">
              {filters.dateRangeLabel && (
                <div className="flex items-center gap-2 rounded-xl border border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] px-3 py-2 text-xs">
                  <span className="text-[color:var(--app-brand-text)]">
                    {tr("กรองจากกราฟ:", "Filtered from chart:")} <strong>{filters.dateRangeLabel}</strong>
                  </span>
                  <button
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        dateFrom: undefined,
                        dateTo: undefined,
                        dateRangeLabel: undefined,
                      }))
                    }
                    className="ml-auto text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                  >
                    {tr("ล้างช่วงวันที่", "Clear date range")}
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] flex-1">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--app-text-subtle)]"
                  />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, search: e.target.value }))
                    }
                    placeholder={tr("ค้นหา หมวด/ผู้รับ/หมายเหตุ...", "Search category/recipient/note...")}
                    className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] py-2 pl-9 pr-3 text-sm text-[color:var(--app-text)] outline-none transition-colors focus:border-[color:var(--app-brand-text)] focus:ring-2 focus:ring-[color:var(--app-brand-soft-strong)]"
                  />
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-[color:var(--app-surface-soft)] p-1">
                  {(["income", "expense", "transfer"] as const).map((type) => {
                    const active = filters.types.has(type);
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
                        {getTransactionTypeLabel(type)}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                label={tr("ช่องทางจ่าย", "Payment Channel")}
                slices={breakdowns.paymentChannel}
                selected={filters.paymentChannels}
                onToggle={(v) => toggleInSet("paymentChannels", v)}
              />
              <FilterChips
                label={tr("จากบัญชี", "Account")}
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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {filtered.length === totals.count
                  ? tr(`รายการทั้งหมด (${totals.count})`, `All transactions (${totals.count})`)
                  : tr(`แสดง ${filtered.length} จาก ${totals.count} รายการ`, `Showing ${filtered.length} of ${totals.count} transactions`)}
              </CardTitle>
            </CardHeader>

            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-[color:var(--app-text-muted)]">
                {tr("ไม่พบรายการที่ตรงกับตัวกรองที่เลือก", "No transactions match the selected filters")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--app-divider-soft)] text-[11px] font-semibold uppercase tracking-wider text-[color:var(--app-text-subtle)]">
                      <th className="py-2.5 pr-3">{tr("วันที่", "Date")}</th>
                      <th className="py-2.5 pr-3">{tr("ประเภท", "Type")}</th>
                      <th className="py-2.5 pr-3">{tr("หมวด", "Category")}</th>
                      <th className="py-2.5 pr-3">{tr("ผู้รับ / หมายเหตุ", "Recipient / Note")}</th>
                      <th className="py-2.5 pr-3 text-right">{tr("จำนวน", "Amount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--app-divider-soft)]">
                    {filtered.map((tx) => {
                        const typeStyle =
                          tx.type === "income"
                            ? { bg: "var(--income-soft)", fg: "var(--income-text)", Icon: ArrowUpRight, label: tr("รายรับ", "Income") }
                            : tx.type === "transfer"
                              ? { bg: "var(--neutral-soft)", fg: "var(--neutral)", Icon: ArrowRightLeft, label: tr("โอน", "Transfer") }
                              : { bg: "var(--expense-soft)", fg: "var(--expense-text)", Icon: ArrowDownRight, label: tr("รายจ่าย", "Expense") };
                        const Icon = typeStyle.Icon;
                      return (
                        <tr
                          key={tx.id}
                          onClick={() => setSelectedTx(tx)}
                          className="cursor-pointer transition-colors hover:bg-[color:var(--app-surface-soft)]"
                        >
                          <td className="whitespace-nowrap py-2.5 pr-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-[color:var(--app-text)]">
                                {formatShortDate(tx.date, language)}
                              </span>
                              <span className="text-[10px] text-[color:var(--app-text-subtle)]">
                                {tx.time ?? "-"}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-3">
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{ backgroundColor: typeStyle.bg, color: typeStyle.fg }}
                            >
                              <Icon size={11} />
                              {typeStyle.label}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3">
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
                          <td className="py-2.5 pr-3 text-[color:var(--app-text-muted)]">
                            {tx.recipient ?? tx.note ?? "-"}
                          </td>
                          <td
                            className="whitespace-nowrap py-2.5 pr-3 text-right font-[family-name:var(--font-geist-mono)] font-semibold"
                            style={{ color: typeStyle.fg }}
                          >
                            {getTransactionAmountPrefix(tx.type)}
                            {formatBaht(tx.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <TransactionDetailDrawer
        transaction={selectedTx}
        scopeTransactions={detail.transactions}
        scopeLabel={tr(`เดือน ${monthTitle}`, `${monthTitle} month`)}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
}

function BackLink() {
  const tr = useTr();
  return (
    <Link
      href="/reports"
      className="inline-flex items-center gap-1.5 text-xs text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
    >
      <ArrowLeft size={14} />
      {tr("กลับหน้ารายงาน", "Back to reports")}
    </Link>
  );
}

function MonthSwitcher({
  year,
  monthIndex,
  router,
}: {
  year: number;
  monthIndex: number;
  router: ReturnType<typeof useRouter>;
}) {
  const language = useLanguage();
  const tr = useTr();
  const goto = (delta: number) => {
    let nextMonth = monthIndex + delta;
    let nextYear = year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    router.push(`/reports/${nextYear}/${nextMonth + 1}`);
  };

  return (
    <div className="flex items-center gap-1 rounded-xl bg-[color:var(--app-surface-soft)] p-1 text-sm">
      <button
        onClick={() => goto(-1)}
        className="rounded-lg px-3 py-1.5 text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
        aria-label={tr("เดือนก่อนหน้า", "Previous month")}
      >
        ←
      </button>
      <span className="px-3 text-sm font-medium text-[color:var(--app-text)]">
        {getMonthLabel(monthIndex, language, "full")} {year}
      </span>
      <button
        onClick={() => goto(1)}
        className="rounded-lg px-3 py-1.5 text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
        aria-label={tr("เดือนถัดไป", "Next month")}
      >
        →
      </button>
    </div>
  );
}

function SummaryCards({
  totals,
}: {
  totals: MonthlyTotals;
}) {
  const tr = useTr();
  const cells = [
    {
      label: tr("รายรับ", "Income"),
      amount: totals.income,
      count: totals.incomeCount,
      color: "var(--income-text)",
      accent: "var(--income)",
    },
    {
      label: tr("รายจ่าย", "Expense"),
      amount: totals.expense,
      count: totals.expenseCount,
      color: "var(--expense-text)",
      accent: "var(--expense)",
    },
    {
      label: tr("ย้ายเงิน", "Transfer"),
      amount: totals.transfer,
      count: totals.transferCount,
      color: "var(--neutral)",
      accent: "var(--neutral)",
    },
    {
      label: tr("สุทธิ", "Net"),
      amount: totals.net,
      count: totals.count,
      color: totals.net >= 0 ? "var(--income-text)" : "var(--expense-text)",
      accent: totals.net >= 0 ? "var(--income)" : "var(--expense)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="card-hover relative overflow-hidden rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4 shadow-[var(--app-card-shadow)]"
        >
          <div
            className="absolute inset-y-0 left-0 w-[3px]"
            style={{ backgroundColor: cell.accent }}
          />
          <p className="pl-1.5 text-[10px] font-semibold uppercase tracking-widest text-[color:var(--app-text-subtle)]">
            {cell.label}
          </p>
          <p
            className="mt-1 pl-1.5 font-[family-name:var(--font-geist-mono)] text-xl font-bold leading-none"
            style={{ color: cell.color }}
          >
            {formatBaht(cell.amount)}
          </p>
          <p className="mt-1.5 pl-1.5 text-[11px] text-[color:var(--app-text-subtle)]">
            {cell.count} {tr("รายการ", "transactions")}
          </p>
        </div>
      ))}
    </div>
  );
}

// Tag breakdowns are usually sparse — most rows have no tag, so the
// "ไม่ระบุ" slice dwarfs everything. We hide that slice to keep the pie
// readable; user can still see total tag-less spend in the legend later.
//
// `subBreakdownMap` is optional: when provided, each slice's `subSlices`
// carries the nested breakdown keyed by slice.value. Used by the category pie
// so hovering shows "tags inside this category".
function dimensionsForPie(
  slices: DimensionSlice[],
  subBreakdownMap?: Map<string, DimensionSlice[]>
) {
  return slices
    .filter((slice) => slice.value !== undefined && slice.amount > 0)
    .slice(0, 7)
    .map((slice, idx) => ({
      name: slice.label,
      value: slice.amount,
      color: PIE_COLORS[idx % PIE_COLORS.length],
      subSlices: slice.value ? subBreakdownMap?.get(slice.value) ?? [] : [],
    }));
}

function RangeDetailSection({
  label,
  totals,
  categoryBreakdown,
  tagBreakdown,
  categoryTagMap,
}: {
  label: string;
  totals: MonthlyTotals;
  categoryBreakdown: DimensionSlice[];
  tagBreakdown: DimensionSlice[];
  categoryTagMap: Map<string, DimensionSlice[]>;
}) {
  const tr = useTr();
  const categoryPie = dimensionsForPie(categoryBreakdown, categoryTagMap);
  const tagPie = dimensionsForPie(tagBreakdown);
  const noTaggedExpense = tagPie.length === 0;

  return (
    <section className="space-y-4 rounded-2xl border border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-[color:var(--app-text)]">
          {tr("สรุปของช่วง", "Summary of period")} <span className="text-[color:var(--app-brand-text)]">{label}</span>
        </h2>
        <p className="text-xs text-[color:var(--app-text-muted)]">
          {tr("ตัวเลขนี้คิดจากธุรกรรมทั้งหมดในช่วงที่เลือกเท่านั้น (ไม่ขึ้นกับ filter อื่น)", "These numbers are calculated from all transactions in the selected period (independent of other filters)")}
        </p>
      </div>

      <SummaryCards totals={totals} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RangePieCard
          title={tr("สัดส่วนรายจ่ายตามหมวด", "Expense Breakdown by Category")}
          slices={categoryPie}
          emptyMessage={tr("ช่วงนี้ไม่มีรายจ่าย", "No expenses in this period")}
          useNestedTooltip
        />
        <RangePieCard
          title={tr("สัดส่วนรายจ่ายตาม tag", "Expense Breakdown by Tag")}
          slices={tagPie}
          emptyMessage={
            noTaggedExpense
              ? tr("ช่วงนี้ไม่มีรายจ่ายที่ระบุ tag", "No tagged expenses in this period")
              : tr("ช่วงนี้ไม่มีรายจ่าย", "No expenses in this period")
          }
        />
      </div>
    </section>
  );
}

// Custom tooltip for the category pie. When user hovers a slice we surface
// the category's *tag* breakdown so they can see, e.g., "฿6,173 ใน 'บริจาค' —
// 2,500 tag 'ทริป', 1,200 tag 'โอน', 2,473 ไม่ระบุ" without leaving the pie.
//
// Recharts calls this with `active` + `payload`; `payload[0].payload` is the
// full data row we passed to <Pie data={...}>, including the custom subSlices.
interface CategoryTagPayload {
  name: string;
  value: number;
  color: string;
  subSlices: DimensionSlice[];
}

function CategoryTagTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: CategoryTagPayload }>;
}) {
  const tr = useTr();
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  // Show top-N tags so the tooltip stays compact even in categories with a
  // long tail; the rest get rolled into "อื่นๆ". 5 is enough to catch the
  // real story without shoving the tooltip off-screen on mobile.
  const MAX_ROWS = 5;
  const head = row.subSlices.slice(0, MAX_ROWS);
  const tail = row.subSlices.slice(MAX_ROWS);
  const tailAmount = tail.reduce((sum, slice) => sum + slice.amount, 0);

  return (
    <div
      className="theme-border theme-surface rounded-xl border p-3 shadow-lg"
      style={{ minWidth: 220 }}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--app-text)]">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: row.color }}
        />
        {row.name}
      </div>
      <p className="mt-0.5 text-xs text-[color:var(--app-text-muted)]">
        {formatBaht(row.value)}
      </p>

      {row.subSlices.length === 0 ? (
        <p className="mt-2 text-xs italic text-[color:var(--app-text-subtle)]">
          {tr("ไม่มีข้อมูล tag", "No tag data")}
        </p>
      ) : (
        <ul className="mt-2 space-y-1 border-t border-[color:var(--app-divider-soft)] pt-2 text-xs">
          {head.map((slice) => (
            <li
              key={slice.label}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate text-[color:var(--app-text-muted)]">
                {slice.label}
              </span>
              <span className="flex shrink-0 items-baseline gap-1.5">
                <span className="font-medium text-[color:var(--app-text)]">
                  {formatBaht(slice.amount)}
                </span>
                <span className="text-[10px] text-[color:var(--app-text-subtle)]">
                  {(slice.share * 100).toFixed(slice.share >= 0.1 ? 0 : 1)}%
                </span>
              </span>
            </li>
          ))}
          {tail.length > 0 && (
            <li className="flex items-center justify-between gap-3 text-[color:var(--app-text-subtle)]">
              <span>{tr("อื่นๆ", "Other")} ({tail.length})</span>
              <span className="font-medium">{formatBaht(tailAmount)}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function RangePieCard({
  title,
  slices,
  emptyMessage,
  useNestedTooltip = false,
}: {
  title: string;
  slices: ReturnType<typeof dimensionsForPie>;
  emptyMessage: string;
  /** When true, use the category→tag tooltip that lists tag breakdown inside
   *  the hovered slice. Only meaningful for the category pie. */
  useNestedTooltip?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {slices.length === 0 ? (
        <p className="py-6 text-center text-xs text-[color:var(--app-text-muted)]">
          {emptyMessage}
        </p>
      ) : (
        <>
          <ChartViewport className="h-44">
            {({ width, height }) => (
              <PieChart width={width} height={height}>
                <Pie
                  data={slices}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={72}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {slices.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                {useNestedTooltip ? (
                  <Tooltip content={<CategoryTagTooltip />} />
                ) : (
                  <Tooltip
                    formatter={(value) => formatBaht(Number(value))}
                    contentStyle={chartTheme.tooltipStyle}
                  />
                )}
              </PieChart>
            )}
          </ChartViewport>
          <ul className="mt-2 space-y-1 text-xs">
            {slices.map((entry) => (
              <li key={entry.name} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate text-[color:var(--app-text-muted)]">
                  {entry.name}
                </span>
                <span className="ml-auto font-medium text-[color:var(--app-text)]">
                  {formatBaht(entry.value)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
