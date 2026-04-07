"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PiggyBank, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatBaht } from "@/lib/utils";
import type { SavingsGoalsPortfolio } from "@/lib/types";

export function BucketsOverview() {
  const [portfolio, setPortfolio] = useState<SavingsGoalsPortfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    void fetch("/api/savings-goals", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch savings goals");
        }

        return (await response.json()) as SavingsGoalsPortfolio;
      })
      .then((data) => {
        if (!isCancelled) {
          setPortfolio(data);
          setError(null);
        }
      })
      .catch((fetchError) => {
        console.error("Failed to hydrate savings goals overview", fetchError);
        if (!isCancelled) {
          setError("ไม่สามารถโหลดข้อมูลกระปุกเป้าหมายได้");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Savings Goals Portfolio</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-[color:var(--app-surface-soft)]"
            />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Savings Goals Portfolio</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<Sparkles size={20} />}
          title="โหลดข้อมูลกระปุกไม่สำเร็จ"
          description={error}
          actionHref="/buckets"
          actionLabel="เปิดหน้า Savings"
        />
      </Card>
    );
  }

  if (!portfolio || portfolio.goals.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Savings Goals Portfolio</CardTitle>
        </CardHeader>
        <EmptyState
          icon={<PiggyBank size={20} />}
          title="ยังไม่มีเป้าหมายการออม"
          description="เริ่มสร้างเป้าหมายหลายก้อน เช่น แต่งงาน เกษียณ หรือเงินดาวน์บ้าน แล้ว dashboard จะสรุป progress ให้ทันที"
          actionHref="/buckets"
          actionLabel="สร้างเป้าหมายแรก"
        />
      </Card>
    );
  }

  const featuredGoals = portfolio.goals.slice(0, 3);
  const overallProgress = Math.round(portfolio.overview.overallProgressPercent);

  return (
    <Card className="col-span-full">
      <CardHeader className="items-start gap-3 sm:flex-row sm:items-center">
        <div>
          <CardTitle>Savings Goals Portfolio</CardTitle>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            สะสมแล้ว {formatBaht(portfolio.overview.totalSaved)} จากเป้ารวม{" "}
            {formatBaht(portfolio.overview.totalTarget)}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right dark:bg-emerald-500/10">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              ความคืบหน้ารวม
            </p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {overallProgress}%
            </p>
          </div>
          <Link
            href="/buckets"
            className="rounded-xl border border-[color:var(--app-border)] px-3 py-2 text-sm font-medium text-[color:var(--app-text)] transition-colors hover:bg-[color:var(--app-surface-soft)]"
          >
            ดูทั้งหมด
          </Link>
        </div>
      </CardHeader>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {featuredGoals.map((goal) => {
          const progressWidth = Math.min(goal.progressPercent, 100);

          return (
            <Link
              key={goal.id}
              href={`/buckets/${goal.id}`}
              className="rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)]/70 p-4 transition-colors hover:border-[color:var(--app-border-strong)] hover:bg-[color:var(--app-surface)]"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: `${goal.color}18` }}
                >
                  {goal.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {goal.name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {goal.strategyLabel || "ยังไม่ได้ระบุช่องทางออม"}
                      </p>
                    </div>
                    <span
                      className="rounded-xl px-2.5 py-1 text-xs font-semibold"
                      style={{
                        color: goal.color,
                        backgroundColor: `${goal.color}15`,
                      }}
                    >
                      {Math.round(goal.progressPercent)}%
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color:var(--app-surface-soft)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progressWidth}%`,
                        backgroundColor: goal.color,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        ยอดปัจจุบัน
                      </p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatBaht(goal.currentAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        กำไรสะสม
                      </p>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatBaht(goal.totalGrowth)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
