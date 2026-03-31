"use client";

import { useFinanceStore } from "@/store/finance-store";
import { formatBaht } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank,
  TrendingUp,
  Percent,
} from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color: string;
}

function StatCard({ label, value, subtext, icon, trend, color }: StatCardProps) {
  return (
    <Card className="flex items-start gap-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}20` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </p>
        <p className="mt-0.5 text-xl font-bold text-zinc-800 dark:text-zinc-100">
          {value}
        </p>
        {subtext && (
          <p className="mt-0.5 flex items-center gap-1 text-xs">
            {trend === "up" && (
              <ArrowUpRight size={12} className="text-emerald-500" />
            )}
            {trend === "down" && (
              <ArrowDownRight size={12} className="text-red-500" />
            )}
            <span
              className={
                trend === "up"
                  ? "text-emerald-500"
                  : trend === "down"
                    ? "text-red-500"
                    : "text-zinc-400"
              }
            >
              {subtext}
            </span>
          </p>
        )}
      </div>
    </Card>
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="รายรับรวม"
        value={formatBaht(totalIncome)}
        subtext={subtext}
        icon={<TrendingUp size={20} />}
        trend={hasYearData ? "up" : "neutral"}
        color="#22c55e"
      />
      <StatCard
        label="รายจ่ายรวม"
        value={formatBaht(totalExpense)}
        subtext={subtext}
        icon={<Wallet size={20} />}
        trend={hasYearData ? "down" : "neutral"}
        color="#ef4444"
      />
      <StatCard
        label="เงินคงเหลือ"
        value={formatBaht(netCashflow)}
        subtext={hasYearData ? (netCashflow >= 0 ? "เหลือเก็บ" : "ขาดดุล") : subtext}
        icon={<PiggyBank size={20} />}
        trend={hasYearData ? (netCashflow >= 0 ? "up" : "down") : "neutral"}
        color="#3b82f6"
      />
      <StatCard
        label="อัตราการออม"
        value={`${savingsRate}%`}
        subtext={hasYearData ? (savingsRate >= 20 ? "ดีมาก!" : "ต้องปรับปรุง") : subtext}
        icon={<Percent size={20} />}
        trend={hasYearData ? (savingsRate >= 20 ? "up" : "down") : "neutral"}
        color="#8b5cf6"
      />
    </div>
  );
}
