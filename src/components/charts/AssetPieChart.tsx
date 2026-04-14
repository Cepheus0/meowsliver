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
import { chartTheme } from "@/lib/chart-theme";

export function AssetPieChart() {
  const { getAssets, getLiabilities, getNetWorth, getTotalAssets, getTotalLiabilities } = useFinanceStore();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const assets = getAssets();
  const liabilities = getLiabilities();
  const netWorth = getNetWorth();
  const totalAssets = getTotalAssets();
  const totalLiabilities = getTotalLiabilities();

  // Combine assets and liabilities for the pie
  const pieData = [
    ...assets.map((a) => ({
      label: a.label,
      value: a.amount,
      color: a.color,
    })),
    ...liabilities
      .filter((l) => l.amount > 0)
      .map((l) => ({
        label: l.label,
        value: l.amount,
        color: l.color,
      })),
  ];

  if (pieData.length === 0) {
    return (
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle>สินทรัพย์และหนี้สิน</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<Landmark size={20} />}
          title="ยังไม่มีข้อมูลสินทรัพย์หรือหนี้สิน"
          description="ส่วนนี้จะแสดงเมื่อมีการเชื่อมข้อมูลสินทรัพย์และหนี้สินจริงในภายหลัง"
        />
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Net Worth 100% - สินทรัพย์สุทธิ</CardTitle>
      </CardHeader>

      {/* Net Worth big number */}
      <div className="mb-4 text-center">
        <p className="text-3xl font-extrabold text-[color:var(--app-text)]">
          {formatBaht(netWorth)}
        </p>
        <p className="mt-1 text-xs text-[color:var(--app-text-muted)]">
          สินทรัพย์ {formatBaht(totalAssets)} — หนี้สิน{" "}
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
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={
                    hoveredItem === null || hoveredItem === entry.label
                      ? 1
                      : 0.4
                  }
                  stroke={
                    hoveredItem === entry.label ? entry.color : "transparent"
                  }
                  strokeWidth={hoveredItem === entry.label ? 3 : 0}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatBaht(Number(value))}
              contentStyle={chartTheme.tooltipStyle}
            />
          </PieChart>
        )}
      </ChartViewport>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {pieData.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 text-xs"
            onMouseEnter={() => setHoveredItem(item.label)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate text-zinc-600 dark:text-zinc-400">
              {item.label}
            </span>
            <span className="ml-auto whitespace-nowrap font-medium text-zinc-800 dark:text-zinc-200">
              {formatBaht(item.value)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
