"use client";

import { useFinanceStore } from "@/store/finance-store";
import { formatBaht } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  TrendingUp,
  ShoppingCart,
  Percent,
} from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  accentColor: string;
  delay: number;
}

function StatCard({ label, value, subtext, icon, trend, accentColor, delay }: StatCardProps) {
  return (
    <div
      className={`card-hover animate-fade-slide-up anim-delay-${delay} relative overflow-hidden rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 shadow-[var(--app-card-shadow)]`}
    >
      {/* left accent bar */}
      <div
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-start gap-4 pl-2">
        {/* icon */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}18` }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>

        {/* text */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--app-text-subtle)]">
            {label}
          </p>
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold leading-none text-[color:var(--app-text)]">
            {value}
          </p>
          {subtext && (
            <p className="mt-1.5 flex items-center gap-1 text-xs">
              {trend === "up" && (
                <ArrowUpRight size={12} className="text-[color:var(--income-text)]" />
              )}
              {trend === "down" && (
                <ArrowDownRight size={12} className="text-[color:var(--expense-text)]" />
              )}
              <span
                className={
                  trend === "up"
                    ? "text-[color:var(--income-text)]"
                    : trend === "down"
                      ? "text-[color:var(--expense-text)]"
                      : "text-[color:var(--app-text-subtle)]"
                }
              >
                {subtext}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SummaryCards() {
  const { getMonthlyCashflow, importedTransactions, selectedYear } = useFinanceStore();
  const cashflow = getMonthlyCashflow();

  const totalIncome = cashflow.reduce((s, m) => s + m.income, 0);
  const totalExpense = cashflow.reduce((s, m) => s + m.expense, 0);
  const netCashflow = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0
      ? Math.round((netCashflow / totalIncome) * 1000) / 10
      : 0;
  const hasAnyTransactions = importedTransactions.length > 0;
  const hasYearData = cashflow.some((month) => month.income > 0 || month.expense > 0);
  const subtext = !hasAnyTransactions
    ? "ยังไม่มีข้อมูลที่นำเข้า"
    : hasYearData
      ? `สรุปจากรายการปี ${selectedYear}`
      : `ยังไม่มีรายการในปี ${selectedYear}`;

  const netColor = netCashflow >= 0 ? "var(--income)" : "var(--expense)";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="รายรับรวม"
        value={formatBaht(totalIncome)}
        subtext={subtext}
        icon={<TrendingUp size={22} />}
        trend={hasYearData ? "up" : "neutral"}
        accentColor="#1f8a65"
        delay={0}
      />
      <StatCard
        label="รายจ่ายรวม"
        value={formatBaht(totalExpense)}
        subtext={subtext}
        icon={<ShoppingCart size={22} />}
        trend={hasYearData ? "down" : "neutral"}
        accentColor="#cf2d56"
        delay={1}
      />
      <StatCard
        label="เงินคงเหลือ"
        value={formatBaht(netCashflow)}
        subtext={hasYearData ? (netCashflow >= 0 ? "เหลือเก็บ" : "ขาดดุล") : subtext}
        icon={<PiggyBank size={22} />}
        trend={hasYearData ? (netCashflow >= 0 ? "up" : "down") : "neutral"}
        accentColor={netCashflow >= 0 ? "#1f8a65" : "#cf2d56"}
        delay={2}
      />
      <StatCard
        label="อัตราการออม"
        value={`${savingsRate}%`}
        subtext={hasYearData ? (savingsRate >= 20 ? "เป้าหมายผ่าน ✓" : "ต้องปรับปรุง") : subtext}
        icon={<Percent size={22} />}
        trend={hasYearData ? (savingsRate >= 20 ? "up" : "down") : "neutral"}
        accentColor="#f54e00"
        delay={3}
      />
    </div>
  );
}
