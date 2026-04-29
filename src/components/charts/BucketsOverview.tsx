"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PiggyBank, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatBaht, formatBahtCompact } from "@/lib/utils";
import type { SavingsGoalsPortfolio } from "@/lib/types";
import { useTr } from "@/lib/i18n";
import { SAVINGS_GOAL_PRESETS } from "@/lib/savings-goals";

export function BucketsOverview() {
  const tr = useTr();
  const [portfolio, setPortfolio] = useState<SavingsGoalsPortfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadPortfolio() {
      try {
        const response = await fetch("/api/savings-goals", { cache: "no-store" });
        if (!response.ok) {
          if (!isCancelled) {
            setError("load_failed");
          }
          return;
        }

        const data = (await response.json()) as SavingsGoalsPortfolio;
        if (!isCancelled) {
          setPortfolio(data);
          setError(null);
        }
      } catch {
        if (!isCancelled) {
          setError("load_failed");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPortfolio();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Goals Portfolio</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-lg bg-[color:var(--app-surface-soft)]"
            />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Goals Portfolio</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<Sparkles size={20} />}
          title={tr("โหลดข้อมูลกระปุกไม่สำเร็จ", "Failed to load savings goals")}
          description={tr(
            "ไม่สามารถโหลดข้อมูลกระปุกเป้าหมายได้",
            "Could not load savings goals data."
          )}
          actionHref="/buckets"
          actionLabel={tr("เปิดหน้า Savings", "Open Savings")}
        />
      </Card>
    );
  }

  if (!portfolio || portfolio.goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Goals Portfolio</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<PiggyBank size={20} />}
          title={tr("ยังไม่มีเป้าหมายการออม", "No savings goals yet")}
          description={tr(
            "เริ่มสร้างเป้าหมายหลายก้อน เช่น แต่งงาน เกษียณ หรือเงินดาวน์บ้าน แล้ว dashboard จะสรุป progress ให้ทันที",
            "Create multiple goals like a wedding, retirement, or house down payment, and the dashboard will track your progress automatically."
          )}
          actionHref="/buckets"
          actionLabel={tr("สร้างเป้าหมายแรก", "Create your first goal")}
        />
      </Card>
    );
  }

  const featuredGoals = portfolio.goals.slice(0, 3);
  const featuredGoalCount = portfolio.goals.length;
  const cardGridClassName =
    featuredGoals.length === 1
      ? "grid grid-cols-1 gap-4"
      : "grid gap-4 md:grid-cols-2 xl:grid-cols-4";

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--app-text-subtle)]">
            {tr("Goals · เป้าหมายการออม", "Goals · savings targets")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[color:var(--app-text)] md:text-4xl">
            {tr("เป้าหมายการออม", "Savings goals")}
          </h2>
          <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
            {featuredGoalCount.toLocaleString()} {tr("เป้าหมายใช้งานอยู่", "active goals")} ·{" "}
            {tr("สะสมแล้ว", "Saved")} {formatBaht(portfolio.overview.totalSaved)} /{" "}
            {formatBaht(portfolio.overview.totalTarget)}
          </p>
        </div>

        <Link
          href="/buckets"
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2 text-sm font-semibold text-[color:var(--app-text)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--app-border-strong)]"
        >
          {tr("ดูทุกเป้าหมาย", "View all goals")}
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className={`mt-6 ${cardGridClassName}`}>
        {featuredGoals.map((goal) => {
          const progressWidth = Math.min(goal.progressPercent, 100);
          const preset = SAVINGS_GOAL_PRESETS.find((item) => item.category === goal.category);

          return (
            <Link
              key={goal.id}
              href={`/buckets/${goal.id}`}
              className={`group rounded-[26px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[color:var(--app-border-strong)] hover:shadow-[0_24px_54px_-42px_rgba(20,14,10,0.75)] ${
                featuredGoals.length === 1 ? "sm:p-6" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: `${goal.color}18` }}
                >
                  {goal.icon}
                </div>
                <ArrowRight
                  size={16}
                  className="mt-1 shrink-0 text-[color:var(--app-text-subtle)] transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </div>

              <div className={featuredGoals.length === 1 ? "mt-6 max-w-md" : "mt-6"}>
                <p className="text-xl font-medium text-[color:var(--app-text)]">
                  {preset ? tr(preset.name, preset.nameEn) : goal.name}
                </p>
                <p className="mt-2 font-[family-name:var(--font-geist-mono)] text-4xl font-semibold leading-none text-[color:var(--app-text)]">
                  {Math.round(goal.progressPercent)}%
                </p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color:var(--app-surface-soft)]">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${progressWidth}%`,
                    backgroundColor: goal.color,
                  }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[color:var(--app-text-muted)]">
                <span>
                  {formatBahtCompact(goal.currentAmount)} / {formatBahtCompact(goal.targetAmount)}
                </span>
                <span style={{ color: goal.color }}>{formatBahtCompact(goal.remainingAmount)}</span>
              </div>

              <p className="mt-3 text-sm text-[color:var(--app-text-muted)]">
                {preset
                  ? tr(preset.strategyLabel, preset.strategyLabelEn)
                  : goal.strategyLabel || tr("ยังไม่ได้ระบุช่องทางออม", "No strategy specified")}
              </p>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
