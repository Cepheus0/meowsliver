"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { useFinanceStore } from "@/store/finance-store";
import { formatBaht } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Landmark } from "lucide-react";
import { ChartViewport } from "@/components/charts/ChartViewport";
import { EmptyState } from "@/components/ui/EmptyState";
import { chartTheme, chartColors } from "@/lib/chart-theme";
import { useTr } from "@/lib/i18n";

const ASSET_CATEGORY_LABELS_EN: Record<string, string> = {
  cash: "Cash",
  bank_savings: "Savings",
  bank_fixed: "Fixed Deposit",
  stocks: "Thai / Foreign Stocks",
  etf: "Mutual Funds / ETF",
  crypto: "Cryptocurrency",
  ssf: "SSF Fund",
  rmf: "RMF Fund",
  gold: "Gold",
  other_investment: "Other Investments",
  investment: "Investments",
  other: "Other Assets",
};

const LIABILITY_CATEGORY_LABELS_EN: Record<string, string> = {
  credit_card: "Credit Card",
  personal_loan: "Personal Loan",
  car_loan: "Auto Loan",
  mortgage: "Mortgage",
  other_debt: "Other Debts",
  other: "Other Debts",
};

export function AssetPieChart() {
  const { getAssets, getLiabilities, getNetWorth, getTotalAssets, getTotalLiabilities } = useFinanceStore();
  const tr = useTr();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const assets = getAssets();
  const liabilities = getLiabilities();
  const netWorth = getNetWorth();
  const totalAssets = getTotalAssets();
  const totalLiabilities = getTotalLiabilities();

  // Combine assets and liabilities for the pie
  const pieData = [
    ...assets.map((a) => ({
      label: tr(a.label, ASSET_CATEGORY_LABELS_EN[a.category] ?? a.label),
      value: a.amount,
      color: a.color,
    })),
    ...liabilities
      .filter((l) => l.amount > 0)
      .map((l) => ({
        label: tr(l.label, LIABILITY_CATEGORY_LABELS_EN[l.category] ?? l.label),
        value: l.amount,
        color: l.color,
      })),
  ];

  if (pieData.length === 0) {
    return (
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle>{tr("สินทรัพย์และหนี้สิน", "Assets & Liabilities")}</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<Landmark size={20} />}
          title={tr("ยังไม่มีข้อมูลสินทรัพย์หรือหนี้สิน", "No asset or liability data yet")}
          description={tr(
            "ส่วนนี้จะแสดงเมื่อมีการเชื่อมข้อมูลสินทรัพย์และหนี้สินจริงในภายหลัง",
            "This section will appear once real asset and liability data is connected."
          )}
        />
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Net Worth 100% - {tr("สินทรัพย์สุทธิ", "Net Assets")}</CardTitle>
      </CardHeader>

      {/* Net Worth big number */}
      <div className="mb-4 text-center">
        <p className="text-3xl font-extrabold text-[color:var(--app-text)]">
          {formatBaht(netWorth)}
        </p>
        <p className="mt-1 text-xs text-[color:var(--app-text-muted)]">
          {tr("สินทรัพย์", "Assets")} {formatBaht(totalAssets)} — {tr("หนี้สิน", "Liabilities")}{" "}
          {formatBaht(totalLiabilities)}
        </p>
      </div>

      {/* Pie Chart */}
      <ChartViewport className="h-80">
        {({ width, height }) => (
          <PieChart width={width} height={height}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              nameKey="label"
              isAnimationActive={false}
              onMouseEnter={(_, index) =>
                setHoveredItem(pieData[index]?.label ?? null)
              }
              onMouseLeave={() => setHoveredItem(null)}
            >
              {pieData.map((entry, index) => {
                const fill = chartColors.categories[index % chartColors.categories.length];
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fill}
                    opacity={
                      hoveredItem === null || hoveredItem === entry.label
                        ? 1
                        : 0.35
                    }
                    stroke="transparent"
                    strokeWidth={0}
                  />
                );
              })}
            </Pie>
            <Tooltip
              formatter={(value) => formatBaht(Number(value))}
              contentStyle={chartTheme.tooltipStyle}
            />
          </PieChart>
        )}
      </ChartViewport>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {pieData.map((item, index) => {
          const dotColor = chartColors.categories[index % chartColors.categories.length];
          return (
            <div
              key={item.label}
              className="flex items-center gap-2 text-xs"
              onMouseEnter={() => setHoveredItem(item.label)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: dotColor }}
              />
              <span className="truncate text-[color:var(--app-text-muted)]">
                {item.label}
              </span>
              <span className="ml-auto whitespace-nowrap font-[family-name:var(--font-geist-mono)] font-medium text-[color:var(--app-text)]">
                {formatBaht(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
