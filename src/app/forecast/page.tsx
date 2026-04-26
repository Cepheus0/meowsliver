"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, ChartNoAxesCombined, ShieldCheck, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartViewport } from "@/components/charts/ChartViewport";
import { chartTheme } from "@/lib/chart-theme";
import { useFinanceStore } from "@/store/finance-store";
import { useLanguage, useTr } from "@/lib/i18n";
import {
  buildCashflowForecast,
  type ForecastHorizon,
} from "@/lib/ai-tools-analytics";
import { formatBaht, formatBahtCompact, getMonthLabel } from "@/lib/utils";

const HORIZONS: ForecastHorizon[] = [30, 60, 90];

function formatForecastDate(date: string, language: "th" | "en") {
  const [, month, day] = date.split("-").map((part) => Number.parseInt(part, 10));
  return `${day} ${getMonthLabel((month || 1) - 1, language)}`;
}

export default function ForecastPage() {
  const tr = useTr();
  const language = useLanguage();
  const transactions = useFinanceStore((state) => state.importedTransactions);
  const accounts = useFinanceStore((state) => state.accounts);
  const selectedYear = useFinanceStore((state) => state.selectedYear);
  const [horizon, setHorizon] = useState<ForecastHorizon>(90);

  const forecast = useMemo(
    () =>
      buildCashflowForecast({
        transactions,
        accounts,
        year: selectedYear,
        horizonDays: horizon,
      }),
    [accounts, horizon, selectedYear, transactions]
  );
  const hasData = accounts.some((account) => !account.isArchived);
  const chartData = forecast.points.map((point) => ({
    ...point,
    dateLabel: formatForecastDate(point.date, language),
  }));
  const trendPositive = forecast.projectedDelta >= 0;

  if (!hasData) {
    return (
      <Card>
        <EmptyState
          icon={<ChartNoAxesCombined size={20} />}
          title={tr("ยังไม่มีบัญชีสำหรับพยากรณ์", "No accounts available for forecast")}
          description={tr(
            "เพิ่มบัญชีและนำเข้ารายการจริงก่อน แล้วระบบจะคำนวณ cashflow forecast ให้จากข้อมูลย้อนหลัง",
            "Add accounts and import real transactions first, then the forecast will use your historical cashflow."
          )}
          actionHref="/accounts"
          actionLabel={tr("ไปหน้าบัญชี", "Go to accounts")}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border-b border-[color:var(--app-divider)] pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--app-text-subtle)]">
              {tr("AI FORECAST · พยากรณ์กระแสเงิน", "AI FORECAST · Cashflow projection")}
            </p>
            <h1 className="mt-3 text-5xl font-semibold italic tracking-[-0.06em] text-[color:var(--app-text)] md:text-6xl">
              {tr("Cashflow Forecast.", "Cashflow Forecast.")}
            </h1>
          </div>
          <div className="inline-flex w-fit rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-1">
            {HORIZONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setHorizon(item)}
                className={`rounded-xl px-4 py-2 font-[family-name:var(--font-geist-mono)] text-sm font-semibold transition-all ${
                  horizon === item
                    ? "bg-[color:var(--app-surface-strong)] text-[color:var(--app-text)] shadow-[var(--app-card-shadow)]"
                    : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                }`}
              >
                {item} {tr("วัน", "d")}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-subtle)]">
            {tr("ยอดเงินตอนนี้", "Current balance")}
          </p>
          <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-3xl font-semibold text-[color:var(--app-text)]">
            {formatBaht(forecast.currentBalance)}
          </p>
          <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
            {tr("รวมทุกบัญชีที่ใช้งาน", "Across active accounts")}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--income-text)]">
            {tr(`คาดว่าจะเป็นใน ${horizon} วัน`, `Projected in ${horizon} days`)}
          </p>
          <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-3xl font-semibold text-[color:var(--income-text)]">
            {formatBaht(forecast.projectedBalance)}
          </p>
          <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
            {tr("จาก net เฉลี่ยย้อนหลัง", "From historical average net")}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-subtle)]">
            {tr("ยอดต่ำสุดที่คาด", "Projected low")}
          </p>
          <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-3xl font-semibold text-[color:var(--app-text)]">
            {formatBaht(forecast.lowestBalance)}
          </p>
          <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
            {formatForecastDate(forecast.lowestDate, language)}
          </p>
        </Card>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-subtle)]">
            {tr("NET ต่อเดือน (AVG)", "Net / month avg")}
          </p>
          <p
            className="mt-3 font-[family-name:var(--font-geist-mono)] text-3xl font-semibold"
            style={{
              color: trendPositive ? "var(--income-text)" : "var(--expense-text)",
            }}
          >
            {trendPositive ? "+" : "-"}
            {formatBahtCompact(Math.abs(forecast.averageMonthlyNet))}
          </p>
          <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
            {tr(`จากข้อมูลปี ${selectedYear}`, `From ${selectedYear} data`)}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--app-text-subtle)]">
              {tr("Balance trajectory", "Balance trajectory")}
            </p>
            <h2 className="mt-2 text-3xl font-semibold italic tracking-[-0.04em] text-[color:var(--app-text)]">
              {tr(`ยอดเงินใน ${horizon} วันข้างหน้า`, `Balance over the next ${horizon} days`)}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-[color:var(--app-text-muted)]">
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-6 rounded-full bg-[color:var(--app-brand)]" />
              Forecast
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-6 rounded-full bg-[color:var(--expense-text)]" />
              Danger {formatBahtCompact(forecast.dangerFloor)}
            </span>
          </div>
        </div>

        <ChartViewport className="h-[380px]">
          {({ width, height }) => (
            <AreaChart
              width={width}
              height={height}
              data={chartData}
              margin={{ top: 20, right: 18, left: 4, bottom: 8 }}
            >
              <defs>
                <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--app-brand)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--app-brand)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} opacity={0.32} vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: chartTheme.axis }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chartTheme.axis }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} axisLine={false} tickLine={false} width={46} domain={["auto", "auto"]} />
              <Tooltip formatter={(value) => formatBaht(Number(value))} contentStyle={chartTheme.tooltipStyle} />
              <ReferenceLine y={forecast.dangerFloor} stroke="var(--expense-text)" strokeDasharray="5 5" />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="var(--app-brand)"
                strokeWidth={2}
                fill="url(#forecastFill)"
                dot={{ r: 2, fill: "var(--app-brand)" }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </AreaChart>
          )}
        </ChartViewport>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--app-text-subtle)]">
            {tr("AI Insights · ข้อสังเกต", "AI Insights")}
          </p>
          <div className="mt-5 space-y-5">
            <div className="flex gap-3">
              <ShieldCheck className="mt-1 text-[color:var(--income-text)]" size={22} />
              <div>
                <p className="font-semibold text-[color:var(--app-text)]">
                  {forecast.lowestBalance > forecast.dangerFloor
                    ? tr(`ยอดเงินปลอดภัยตลอด ${horizon} วัน`, `Balance stays safe for ${horizon} days`)
                    : tr("ยอดเงินแตะ danger zone", "Balance touches the danger zone")}
                </p>
                <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
                  {tr(
                    `ยอดต่ำสุดที่คาดคือ ${formatBaht(forecast.lowestBalance)}`,
                    `Projected low is ${formatBaht(forecast.lowestBalance)}`
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <TrendingUp className="mt-1 text-[color:var(--app-brand-text)]" size={22} />
              <div>
                <p className="font-semibold text-[color:var(--app-text)]">
                  {tr(
                    `${trendPositive ? "เงินโตขึ้น" : "เงินลดลง"} ${formatBahtCompact(Math.abs(forecast.projectedDelta))} ใน ${horizon} วัน`,
                    `${trendPositive ? "Balance rises" : "Balance falls"} by ${formatBahtCompact(Math.abs(forecast.projectedDelta))} in ${horizon} days`
                  )}
                </p>
                <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
                  {tr(
                    `รายรับเฉลี่ย ${formatBahtCompact(forecast.averageMonthlyIncome)} / รายจ่ายเฉลี่ย ${formatBahtCompact(forecast.averageMonthlyExpense)} ต่อเดือน`,
                    `Average income ${formatBahtCompact(forecast.averageMonthlyIncome)} / expense ${formatBahtCompact(forecast.averageMonthlyExpense)} per month`
                  )}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--app-text-subtle)]">
            {tr("เหมียวบอกว่า", "Meowsliver says")}
          </p>
          <div className="mt-5 rounded-[24px] border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-5">
            <p className="text-sm leading-7 text-[color:var(--app-text-muted)]">
              {tr(
                `จากข้อมูลจริงในปี ${selectedYear} รายรับเฉลี่ย ${formatBahtCompact(forecast.averageMonthlyIncome)} ต่อเดือน และรายจ่ายเฉลี่ย ${formatBahtCompact(forecast.averageMonthlyExpense)} ต่อเดือน ถ้ารูปแบบนี้คงอยู่ อีก ${horizon} วันยอดจะอยู่ราว ${formatBaht(forecast.projectedBalance)}`,
                `Based on real ${selectedYear} data, average income is ${formatBahtCompact(forecast.averageMonthlyIncome)} per month and average expense is ${formatBahtCompact(forecast.averageMonthlyExpense)}. If the pattern holds, the balance should be around ${formatBaht(forecast.projectedBalance)} in ${horizon} days.`
              )}
            </p>
            <Link
              href="/smart-alerts"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--app-brand-text)]"
            >
              {tr("ดู Smart Alerts", "Open Smart Alerts")}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
