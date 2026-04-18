"use client";

import { useMemo, useState } from "react";
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
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wallet,
  Trophy,
  AlertTriangle,
  Coins,
  PiggyBank,
  Landmark,
  Sparkles,
} from "lucide-react";
import { useFinanceStore } from "@/store/finance-store";
import { formatBaht, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ClientOnlyChart } from "@/components/charts/ClientOnlyChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { chartTheme } from "@/lib/chart-theme";
import type { InvestmentHolding } from "@/lib/types";

// Each tab carries its own accent colour + icon so the UI can
// communicate "this section is RMF" visually without another lookup.
const TABS = [
  { key: "crypto", label: "Crypto", color: "#e8a54a", Icon: Coins },
  { key: "ssf", label: "SSF", color: "#5aa9d6", Icon: PiggyBank },
  { key: "rmf", label: "RMF", color: "#2aab80", Icon: Landmark },
  { key: "stocks", label: "หุ้น/ETF", color: "#7c5cd6", Icon: TrendingUp },
  { key: "others", label: "อื่นๆ (ThaiESG)", color: "#8b8278", Icon: Sparkles },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TAX_NOTES: Record<TabKey, string> = {
  crypto: "กำไรจาก Crypto ต้องเสียภาษี 15% (หัก ณ ที่จ่าย) หากซื้อขายผ่าน Exchange ที่ได้รับอนุญาต",
  ssf: "SSF ลดหย่อนได้สูงสุด 30% ของเงินได้ (ไม่เกิน 200,000 บาท) ต้องถือ 10 ปีนับจากวันซื้อ",
  rmf: "RMF ลดหย่อนได้ 30% ของเงินได้ (ไม่เกิน 500,000 บาท) ต้องลงทุนต่อเนื่อง 5 ปี + อายุ 55 ปี",
  stocks: "เงินปันผลถูกหักภาษี ณ ที่จ่าย 10% กำไรจากการขายหุ้นในตลาดหลักทรัพย์ได้รับการยกเว้นภาษี",
  others: "ทองคำ: กำไรจากการขายเสียภาษีเป็นเงินได้ P2P: ดอกเบี้ยเสียภาษี 15%",
};

// Assumed marginal tax rate for the tax-saved estimate. 20% is a
// reasonable mid-bracket number; we surface it in copy so the user
// knows this is a rough projection.
const ASSUMED_MARGINAL_RATE = 0.2;

export default function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("stocks");
  const { getInvestments } = useFinanceStore();
  const investments = getInvestments();

  // Aggregate across all tabs — the hero needs "portfolio-wide" numbers,
  // not just the currently-selected tab.
  const allHoldings = useMemo(
    () =>
      Object.entries(investments).flatMap(([tabKey, holdings]) =>
        holdings.map((h) => ({ ...h, tabKey: tabKey as TabKey }))
      ),
    [investments]
  );

  const totalPortfolio = allHoldings.reduce((s, h) => s + h.totalValue, 0);
  // `avgCost` in this dataset is the aggregate cost basis — summing over
  // holdings gives the total invested amount.
  const totalInvested = allHoldings.reduce((s, h) => s + h.avgCost, 0);
  const totalGainLoss = allHoldings.reduce((s, h) => s + h.gainLoss, 0);
  const portfolioPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  // Best/worst individual holding — these become the "insight" highlight cards.
  const topGainer = useMemo(
    () =>
      allHoldings.length
        ? allHoldings.reduce((best, h) =>
            h.gainLossPercent > best.gainLossPercent ? h : best
          )
        : null,
    [allHoldings]
  );
  const topLoser = useMemo(
    () =>
      allHoldings.length
        ? allHoldings.reduce((worst, h) =>
            h.gainLossPercent < worst.gainLossPercent ? h : worst
          )
        : null,
    [allHoldings]
  );

  // Allocation donut: one slice per tab, sized by total value.
  const allocation = useMemo(
    () =>
      TABS.map((tab) => {
        const holdings = investments[tab.key] ?? [];
        const value = holdings.reduce((s, h) => s + h.totalValue, 0);
        return { ...tab, value };
      }).filter((t) => t.value > 0),
    [investments]
  );

  // Tax savings estimate — only SSF + RMF contribute to deductions in Thai law.
  const taxSavedEstimate = useMemo(() => {
    const ssf = (investments.ssf ?? []).reduce((s, h) => s + h.avgCost, 0);
    const rmf = (investments.rmf ?? []).reduce((s, h) => s + h.avgCost, 0);
    return { ssf, rmf, saved: (ssf + rmf) * ASSUMED_MARGINAL_RATE };
  }, [investments]);

  const totalHoldingsCount = allHoldings.length;
  const holdings = investments[activeTab] ?? [];
  const tabConfig = TABS.find((t) => t.key === activeTab)!;

  const tabTotalValue = holdings.reduce((s, h) => s + h.totalValue, 0);
  const tabTotalGainLoss = holdings.reduce((s, h) => s + h.gainLoss, 0);
  const tabTotalCost = holdings.reduce((s, h) => s + h.avgCost, 0);
  const tabGainLossPercent = tabTotalCost > 0 ? (tabTotalGainLoss / tabTotalCost) * 100 : 0;

  const barData = holdings.map((h) => ({
    name: h.ticker || h.name.slice(0, 8),
    gainLoss: h.gainLossPercent,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--app-text)]">การลงทุน</h1>
        <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
          ภาพรวมพอร์ตลงทุน รวมทุกประเภท — ลดหย่อนภาษี ผลตอบแทน และ top movers
        </p>
      </div>

      {totalHoldingsCount === 0 ? (
        <Card>
          <EmptyState
            icon={<AlertCircle size={20} />}
            title="ยังไม่มีข้อมูลพอร์ตการลงทุน"
            description="เริ่มจากการนำเข้าธุรกรรมจริง ส่วนข้อมูลพอร์ตลงทุนสามารถเชื่อมเพิ่มภายหลังได้"
            actionHref="/import"
            actionLabel="ไปหน้านำเข้า"
          />
        </Card>
      ) : (
        <>
          {/* ── Portfolio hero ─────────────────────────────────────── */}
          <Card className="animate-fade-slide-up anim-delay-0 overflow-hidden">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--app-text-subtle)]">
                  Total portfolio value
                </p>
                <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-4xl font-bold tracking-tight text-[color:var(--app-text)]">
                  {formatBaht(totalPortfolio)}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                      totalGainLoss >= 0
                        ? "bg-[color:var(--income-soft)] text-[color:var(--income-text)]"
                        : "bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]"
                    )}
                  >
                    {totalGainLoss >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {totalGainLoss >= 0 ? "+" : ""}
                    {formatBaht(totalGainLoss)} ({portfolioPercent >= 0 ? "+" : ""}
                    {portfolioPercent.toFixed(2)}%)
                  </span>
                  <span className="text-xs text-[color:var(--app-text-subtle)]">
                    ต้นทุนรวม {formatBaht(totalInvested)} · {allHoldings.length} สินทรัพย์
                  </span>
                </div>
              </div>

              {/* Allocation donut — compact, sits alongside the hero */}
              <div className="flex items-center gap-5">
                <div className="h-[120px] w-[120px] shrink-0">
                  <ClientOnlyChart className="h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocation}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={56}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="label"
                          isAnimationActive={false}
                        >
                          {allocation.map((slice) => (
                            <Cell key={slice.key} fill={slice.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatBaht(Number(value))}
                          contentStyle={chartTheme.tooltipStyle}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ClientOnlyChart>
                </div>
                <ul className="space-y-1 text-xs">
                  {allocation.map((slice) => {
                    const pct = totalPortfolio > 0 ? (slice.value / totalPortfolio) * 100 : 0;
                    return (
                      <li key={slice.key} className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="text-[color:var(--app-text-muted)]">{slice.label}</span>
                        <span className="ml-auto font-[family-name:var(--font-geist-mono)] font-semibold text-[color:var(--app-text)]">
                          {pct.toFixed(0)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </Card>

          {/* ── Insight cards: top gainer / top loser / tax saved ──── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <InsightCard
              label="Top gainer"
              accentColor="#1f8a65"
              icon={<Trophy size={18} />}
              headline={topGainer ? topGainer.name : "—"}
              subheadline={topGainer?.ticker}
              value={topGainer ? `+${topGainer.gainLossPercent.toFixed(2)}%` : "—"}
              valueTone="income"
              footnote={topGainer ? `${formatBaht(topGainer.gainLoss)} unrealized` : undefined}
              delay={1}
            />
            <InsightCard
              label="Top loser"
              accentColor="#cf2d56"
              icon={<AlertTriangle size={18} />}
              headline={topLoser ? topLoser.name : "—"}
              subheadline={topLoser?.ticker}
              value={
                topLoser
                  ? `${topLoser.gainLossPercent >= 0 ? "+" : ""}${topLoser.gainLossPercent.toFixed(2)}%`
                  : "—"
              }
              valueTone={topLoser && topLoser.gainLossPercent >= 0 ? "income" : "expense"}
              footnote={topLoser ? `${formatBaht(topLoser.gainLoss)} unrealized` : undefined}
              delay={2}
            />
            <InsightCard
              label="ประหยัดภาษี (ประมาณการ)"
              accentColor="#f54e00"
              icon={<Wallet size={18} />}
              headline={formatBaht(taxSavedEstimate.saved)}
              value={`${(ASSUMED_MARGINAL_RATE * 100).toFixed(0)}% ฐานภาษี`}
              valueTone="brand"
              footnote={`SSF ${formatBaht(taxSavedEstimate.ssf)} + RMF ${formatBaht(taxSavedEstimate.rmf)}`}
              delay={3}
            />
          </div>

          {/* ── Tab picker with accent pills ───────────────────────── */}
          <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-[color:var(--app-surface-soft)] p-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const count = (investments[tab.key] ?? []).length;
              const TabIcon = tab.Icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "group inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-[color:var(--app-surface-strong)] text-[color:var(--app-text)] shadow-[var(--app-card-shadow)]"
                      : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                  )}
                  style={
                    isActive
                      ? ({ "--tab-accent": tab.color } as React.CSSProperties)
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                      isActive ? "text-white" : "text-[color:var(--app-text-subtle)]"
                    )}
                    style={
                      isActive
                        ? { backgroundColor: tab.color }
                        : { backgroundColor: `${tab.color}22`, color: tab.color }
                    }
                  >
                    <TabIcon size={13} />
                  </span>
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] font-bold",
                        isActive
                          ? "bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)]"
                          : "bg-[color:var(--app-surface)] text-[color:var(--app-text-subtle)]"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Selected tab detail: holdings + perf chart + tax ──── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="relative overflow-hidden lg:col-span-2">
              <div
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{ backgroundColor: tabConfig.color }}
              />
              <CardHeader>
                <CardTitle>
                  <span className="inline-flex items-center gap-2">
                    <tabConfig.Icon size={16} style={{ color: tabConfig.color }} />
                    {tabConfig.label} Portfolio
                  </span>
                </CardTitle>
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                    tabTotalGainLoss >= 0
                      ? "bg-[color:var(--income-soft)] text-[color:var(--income-text)]"
                      : "bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]"
                  )}
                >
                  {tabTotalGainLoss >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {tabGainLossPercent >= 0 ? "+" : ""}
                  {tabGainLossPercent.toFixed(2)}%
                </span>
              </CardHeader>

              <div className="mb-4 flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--app-text)]">
                  {formatBaht(tabTotalValue)}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    tabTotalGainLoss >= 0
                      ? "text-[color:var(--income-text)]"
                      : "text-[color:var(--expense-text)]"
                  )}
                >
                  {tabTotalGainLoss >= 0 ? "+" : ""}
                  {formatBaht(tabTotalGainLoss)}
                </span>
              </div>

              {holdings.length === 0 ? (
                <p className="py-6 text-center text-sm text-[color:var(--app-text-muted)]">
                  ยังไม่มีข้อมูลในหมวด {tabConfig.label}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[color:var(--app-divider)] text-[11px] font-semibold uppercase tracking-wider text-[color:var(--app-text-subtle)]">
                        <th className="py-2.5 pr-3">สินทรัพย์</th>
                        <th className="py-2.5 pr-3 text-right">หน่วย</th>
                        <th className="py-2.5 pr-3 text-right">มูลค่า</th>
                        <th className="py-2.5 pr-3 text-right">กำไร/ขาดทุน</th>
                        <th className="py-2.5 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--app-divider-soft)]">
                      {holdings.map((h) => (
                        <HoldingRow key={h.id} holding={h} tabColor={tabConfig.color} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>ผลตอบแทน %</CardTitle>
                </CardHeader>
                {barData.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[color:var(--app-text-muted)]">
                    ไม่มีข้อมูล
                  </p>
                ) : (
                  <ClientOnlyChart className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 16 }}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={chartTheme.grid}
                          opacity={0.25}
                        />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 10, fill: chartTheme.axis }}
                          tickFormatter={(v) => `${v.toFixed(0)}%`}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 10, fill: chartTheme.axis }}
                          width={64}
                        />
                        <Tooltip
                          formatter={(value) => `${Number(value).toFixed(2)}%`}
                          contentStyle={chartTheme.tooltipStyle}
                          cursor={{ fill: "var(--app-brand-soft)" }}
                        />
                        <Bar dataKey="gainLoss" radius={[0, 4, 4, 0]}>
                          {barData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.gainLoss >= 0 ? "var(--income)" : "var(--expense)"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ClientOnlyChart>
                )}
              </Card>

              {/* Tax note — now styled as a proper info callout with accent */}
              <div className="rounded-2xl border border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-[color:var(--app-brand-text)]">
                  <AlertCircle size={15} />
                  ข้อมูลภาษี — {tabConfig.label}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--app-text-muted)]">
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

interface InsightCardProps {
  label: string;
  accentColor: string;
  icon: React.ReactNode;
  headline: string;
  subheadline?: string;
  value: string;
  valueTone: "income" | "expense" | "brand";
  footnote?: string;
  delay: number;
}

function InsightCard({
  label,
  accentColor,
  icon,
  headline,
  subheadline,
  value,
  valueTone,
  footnote,
  delay,
}: InsightCardProps) {
  const toneColor =
    valueTone === "income"
      ? "var(--income-text)"
      : valueTone === "expense"
        ? "var(--expense-text)"
        : "var(--app-brand-text)";
  return (
    <div
      className={`card-hover animate-fade-slide-up anim-delay-${delay} relative overflow-hidden rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-card-shadow)]`}
    >
      <div
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex items-start gap-3 pl-2">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--app-text-subtle)]">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-[color:var(--app-text)]">
            {headline}
          </p>
          {subheadline && (
            <p className="text-[11px] text-[color:var(--app-text-subtle)]">{subheadline}</p>
          )}
          <p
            className="mt-2 font-[family-name:var(--font-geist-mono)] text-xl font-bold leading-none"
            style={{ color: toneColor }}
          >
            {value}
          </p>
          {footnote && (
            <p className="mt-1.5 text-[11px] text-[color:var(--app-text-subtle)]">{footnote}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HoldingRow({
  holding,
  tabColor,
}: {
  holding: InvestmentHolding;
  tabColor: string;
}) {
  const positive = holding.gainLoss >= 0;
  return (
    <tr className="transition-colors hover:bg-[color:var(--app-surface-soft)]">
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
            style={{ backgroundColor: `${tabColor}22`, color: tabColor }}
          >
            {(holding.ticker ?? holding.name).slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-[color:var(--app-text)]">{holding.name}</p>
            {holding.ticker && (
              <p className="truncate text-[11px] text-[color:var(--app-text-subtle)]">
                {holding.ticker}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-right font-[family-name:var(--font-geist-mono)] text-[13px] text-[color:var(--app-text-muted)]">
        {holding.units.toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-3 text-right font-[family-name:var(--font-geist-mono)] font-medium text-[color:var(--app-text)]">
        {formatBaht(holding.totalValue)}
      </td>
      <td
        className="whitespace-nowrap py-2.5 pr-3 text-right font-[family-name:var(--font-geist-mono)] font-medium"
        style={{ color: positive ? "var(--income-text)" : "var(--expense-text)" }}
      >
        {positive ? "+" : ""}
        {formatBaht(holding.gainLoss)}
      </td>
      <td
        className="whitespace-nowrap py-2.5 text-right font-bold"
        style={{ color: positive ? "var(--income-text)" : "var(--expense-text)" }}
      >
        {positive ? "+" : ""}
        {holding.gainLossPercent.toFixed(2)}%
      </td>
    </tr>
  );
}
