"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useFinanceStore } from "@/store/finance-store";
import { formatBaht } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { ClientOnlyChart } from "@/components/charts/ClientOnlyChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { chartTheme } from "@/lib/chart-theme";

const TABS = [
  { key: "crypto", label: "Crypto", color: "#f59e0b" },
  { key: "ssf", label: "SSF", color: "#06b6d4" },
  { key: "rmf", label: "RMF", color: "#14b8a6" },
  { key: "stocks", label: "หุ้น/ETF", color: "#8b5cf6" },
  { key: "others", label: "อื่นๆ (ThaiESG)", color: "#64748b" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAX_NOTES: Record<TabKey, string> = {
  crypto: "กำไรจาก Crypto ต้องเสียภาษี 15% (หัก ณ ที่จ่าย) หากซื้อขายผ่าน Exchange ที่ได้รับอนุญาต",
  ssf: "SSF ลดหย่อนได้สูงสุด 30% ของเงินได้ (ไม่เกิน 200,000 บาท) ต้องถือ 10 ปี นับจากวันซื้อ",
  rmf: "RMF ลดหย่อนได้ 30% ของเงินได้ (ไม่เกิน 500,000 บาท) ต้องลงทุนต่อเนื่อง 5 ปี + อายุ 55 ปี",
  stocks: "เงินปันผลถูกหักภาษี ณ ที่จ่าย 10% กำไรจากการขายหุ้นในตลาดหลักทรัพย์ได้รับการยกเว้นภาษี",
  others: "ทองคำ: กำไรจากการขายเสียภาษีเป็นเงินได้ P2P: ดอกเบี้ยเสียภาษี 15%",
};

export default function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("crypto");
  const { getInvestments } = useFinanceStore();
  const investments = getInvestments();
  const totalHoldingsCount = Object.values(investments).reduce(
    (count, holdings) => count + holdings.length,
    0
  );
  const holdings = investments[activeTab] || [];
  const tabConfig = TABS.find((t) => t.key === activeTab)!;

  const totalValue = holdings.reduce((s, h) => s + h.totalValue, 0);
  const totalGainLoss = holdings.reduce((s, h) => s + h.gainLoss, 0);
  const totalCost = holdings.reduce((s, h) => s + h.avgCost, 0);
  const totalGainLossPercent =
    totalCost > 0
      ? (totalGainLoss / totalCost) * 100
      : 0;

  // Data for small pie
  const pieData = holdings.map((h) => ({
    name: h.name,
    value: h.totalValue,
  }));

  const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  // Data for performance bar chart
  const barData = holdings.map((h) => ({
    name: h.ticker || h.name.slice(0, 8),
    gainLoss: h.gainLossPercent,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--app-text)]">
          การลงทุน
        </h1>
        <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
          รายละเอียดพอร์ตลงทุนแยกตามประเภท
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-[color:var(--app-surface-soft)] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-[color:var(--app-surface-strong)] text-[color:var(--app-text)] shadow-[var(--app-card-shadow)]"
                : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {totalHoldingsCount === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertCircle size={20} />}
            title="ยังไม่มีข้อมูลพอร์ตการลงทุน"
            description="หากต้องการทดสอบตอนนี้ แนะนำเริ่มจากการนำเข้าธุรกรรมจริงก่อน ส่วนข้อมูลพอร์ตลงทุนสามารถเชื่อมเพิ่มภายหลังได้"
            actionHref="/import"
            actionLabel="ไปหน้านำเข้า"
          />
        </Card>
      ) : (
        <>
      {/* Tab Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Portfolio Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{tabConfig.label} Portfolio</CardTitle>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                totalGainLoss >= 0
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              )}
            >
              {totalGainLoss >= 0 ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              {totalGainLossPercent >= 0 ? "+" : ""}
              {totalGainLossPercent.toFixed(1)}%
            </span>
          </CardHeader>

          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[color:var(--app-text)]">
              {formatBaht(totalValue)}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                totalGainLoss >= 0
                  ? "text-emerald-500"
                  : "text-red-500"
              )}
            >
              {totalGainLoss >= 0 ? "+" : ""}
              {formatBaht(totalGainLoss)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2.5 pr-3 font-medium text-[color:var(--app-text-muted)]">ชื่อ</th>
                  <th className="py-2.5 pr-3 text-right font-medium text-[color:var(--app-text-muted)]">มูลค่า</th>
                  <th className="py-2.5 pr-3 text-right font-medium text-[color:var(--app-text-muted)]">กำไร/ขาดทุน</th>
                  <th className="py-2.5 text-right font-medium text-[color:var(--app-text-muted)]">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {holdings.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-[color:var(--app-text)]">
                        {h.name}
                      </p>
                      {h.ticker && (
                        <p className="text-xs text-zinc-400">{h.ticker}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-medium text-[color:var(--app-text)]">
                      {formatBaht(h.totalValue)}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 pr-3 text-right font-medium",
                        h.gainLoss >= 0
                          ? "text-emerald-500"
                          : "text-red-500"
                      )}
                    >
                      {h.gainLoss >= 0 ? "+" : ""}
                      {formatBaht(h.gainLoss)}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 text-right font-bold",
                        h.gainLossPercent >= 0
                          ? "text-emerald-500"
                          : "text-red-500"
                      )}
                    >
                      {h.gainLossPercent >= 0 ? "+" : ""}
                      {h.gainLossPercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Side: Pie + Bar + Tax Note */}
        <div className="flex flex-col gap-4">
          {/* Small Pie */}
          <Card>
            <CardTitle>สัดส่วน</CardTitle>
            <ClientOnlyChart className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={3}
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatBaht(Number(value))}
                    contentStyle={chartTheme.tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ClientOnlyChart>
          </Card>

          {/* Performance Bar */}
          <Card>
            <CardTitle>ผลตอบแทน %</CardTitle>
            <ClientOnlyChart className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: chartTheme.axis }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 10, fill: chartTheme.axis }}
                    width={60}
                  />
                  <Bar dataKey="gainLoss" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.gainLoss >= 0 ? "#22c55e" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ClientOnlyChart>
          </Card>

          {/* Tax Note */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-500/5">
            <p className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
              <AlertCircle size={16} />
              ข้อมูลภาษี
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-blue-600 dark:text-blue-400/80">
              {TAX_NOTES[activeTab]}
            </p>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
