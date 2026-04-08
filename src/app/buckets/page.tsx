"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PiggyBank, Plus, Sparkles, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  DEFAULT_GOAL_COLOR,
  DEFAULT_GOAL_ICON,
  GOAL_CATEGORY_LABELS,
  SAVINGS_GOAL_PRESETS,
  formatGoalDate,
  getGoalPreset,
} from "@/lib/savings-goals";
import type { SavingsGoalCategory, SavingsGoalsPortfolio } from "@/lib/types";
import { formatBaht, formatPercent } from "@/lib/utils";

const today = new Date().toISOString().slice(0, 10);

function PortfolioStatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">{helper}</p>
    </Card>
  );
}

export default function BucketsPage() {
  const [portfolio, setPortfolio] = useState<SavingsGoalsPortfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "custom" as SavingsGoalCategory,
    icon: DEFAULT_GOAL_ICON,
    color: DEFAULT_GOAL_COLOR,
    targetAmount: "",
    targetDate: "",
    strategyLabel: "",
    initialAmount: "",
    initialDate: today,
    notes: "",
  });

  const loadPortfolio = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/savings-goals", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch savings goals");
      }

      const data = (await response.json()) as SavingsGoalsPortfolio;
      setPortfolio(data);
      setError(null);
    } catch (loadError) {
      console.error(loadError);
      setError("ไม่สามารถโหลด Savings Goals Portfolio ได้");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPortfolio();
  }, []);

  const applyPreset = (presetIndex: number) => {
    const preset = SAVINGS_GOAL_PRESETS[presetIndex];
    setShowCreateForm(true);
    setForm((currentForm) => ({
      ...currentForm,
      name: preset.name,
      category: preset.category,
      icon: preset.icon,
      color: preset.color,
      strategyLabel: preset.strategyLabel,
    }));
  };

  const handleCreateGoal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/savings-goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          targetAmount: Number(form.targetAmount),
          initialAmount: form.initialAmount ? Number(form.initialAmount) : 0,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "สร้างเป้าหมายไม่สำเร็จ");
      }

      setForm({
        name: "",
        category: "custom",
        icon: DEFAULT_GOAL_ICON,
        color: DEFAULT_GOAL_COLOR,
        targetAmount: "",
        targetDate: "",
        strategyLabel: "",
        initialAmount: "",
        initialDate: today,
        notes: "",
      });
      setShowCreateForm(false);
      await loadPortfolio();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถสร้างเป้าหมายการออมได้"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Savings Goals Portfolio
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[color:var(--app-text-muted)]">
            จัดการหลายเป้าหมายพร้อมกันในที่เดียว ทั้งเงินแต่งงาน เกษียณ ดาวน์บ้าน
            หรือเป้าหมายเฉพาะทาง พร้อมดู progress, กำไร, growth และ pace การออมของแต่ละก้อนได้แบบแยกกัน
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm((value) => !value)}>
          <Plus size={16} />
          {showCreateForm ? "ซ่อนฟอร์ม" : "เพิ่มเป้าหมาย"}
        </Button>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50/60 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <p className="text-sm font-medium">{error}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {SAVINGS_GOAL_PRESETS.map((preset, index) => (
          <button
            key={preset.category}
            type="button"
            onClick={() => applyPreset(index)}
            className="theme-border theme-surface rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--app-card-shadow)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: `${preset.color}18` }}
                >
                  {preset.icon}
                </div>
                <p className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {preset.name}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--app-text-muted)]">
                  {preset.description}
                </p>
              </div>
              <Sparkles size={18} className="shrink-0 text-zinc-400" />
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-subtle)]">
              Suggested vehicle
            </p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              {preset.strategyLabel}
            </p>
          </button>
        ))}
      </div>

      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle>สร้างเป้าหมายการออมใหม่</CardTitle>
          </CardHeader>
          <form className="space-y-4" onSubmit={handleCreateGoal}>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  ชื่อเป้าหมาย
                </span>
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none ring-0 transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="เช่น เงินแต่งงาน, เงินเกษียณ"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  ประเภทเป้าหมาย
                </span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((currentForm) => {
                      const category = event.target.value as SavingsGoalCategory;
                      const preset = getGoalPreset(category);

                      return {
                        ...currentForm,
                        category,
                        icon: preset?.icon ?? currentForm.icon,
                        color: preset?.color ?? currentForm.color,
                        strategyLabel:
                          preset?.strategyLabel ?? currentForm.strategyLabel,
                      };
                    })
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {Object.entries(GOAL_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  เป้าหมาย (บาท)
                </span>
                <input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.targetAmount}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      targetAmount: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="เช่น 300000"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  วันเป้าหมาย
                </span>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      targetDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  ช่องทางออม / กลยุทธ์
                </span>
                <input
                  value={form.strategyLabel}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      strategyLabel: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="เช่น RMF, Money Market Fund, บัญชีฝากประจำ"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  ยอดตั้งต้น (ถ้ามี)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.initialAmount}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      initialAmount: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="เช่น 50000"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  วันที่ยอดตั้งต้น
                </span>
                <input
                  type="date"
                  value={form.initialDate}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      initialDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  ไอคอน
                </span>
                <input
                  value={form.icon}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      icon: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                  placeholder="เช่น 💍"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                บันทึกเพิ่มเติม
              </span>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    notes: event.target.value,
                  }))
                }
                rows={4}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="เช่น เป้าหมายนี้อยากเก็บให้ครบก่อน Q4 ปีหน้า และคุม volatility ต่ำ"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "กำลังบันทึก..." : "สร้างเป้าหมาย"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : portfolio ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <PortfolioStatCard
              label="จำนวนเป้าหมาย"
              value={`${portfolio.overview.goalCount}`}
              helper={`${portfolio.overview.completedGoals} เป้าหมายถึงแล้ว`}
            />
            <PortfolioStatCard
              label="สะสมแล้ว"
              value={formatBaht(portfolio.overview.totalSaved)}
              helper={`ต้องเก็บเพิ่มอีก ${formatBaht(portfolio.overview.remainingAmount)}`}
            />
            <PortfolioStatCard
              label="กำไรรวม"
              value={formatBaht(portfolio.overview.totalGrowth)}
              helper="รวมดอกผลและกำไรจากทุกเป้าหมาย"
            />
            <PortfolioStatCard
              label="Progress รวม"
              value={`${Math.round(portfolio.overview.overallProgressPercent)}%`}
              helper={`เทียบกับเป้ารวม ${formatBaht(portfolio.overview.totalTarget)}`}
            />
          </div>

          {portfolio.goals.length === 0 ? (
            <Card>
              <EmptyState
                icon={<PiggyBank size={20} />}
                title="ยังไม่มี Savings Goals"
                description="กด preset ด้านบนหรือสร้างเป้าหมายแบบกำหนดเอง แล้วระบบจะเริ่มติดตาม progress และ growth ให้ทันที"
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {portfolio.goals.map((goal) => {
                const progressWidth = Math.min(goal.progressPercent, 100);

                return (
                  <Link key={goal.id} href={`/buckets/${goal.id}`} className="block">
                    <Card className="overflow-hidden transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-600">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
                            style={{ backgroundColor: `${goal.color}16` }}
                          >
                            {goal.icon}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                {goal.name}
                              </h2>
                              <span
                                className="rounded-xl px-2.5 py-1 text-xs font-semibold"
                                style={{
                                  color: goal.color,
                                  backgroundColor: `${goal.color}15`,
                                }}
                              >
                                {GOAL_CATEGORY_LABELS[goal.category]}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
                              {goal.strategyLabel || "ยังไม่ได้ระบุช่องทางออม"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--app-text-muted)]">
                              <span>Target date: {formatGoalDate(goal.targetDate)}</span>
                              <span>{goal.entryCount} movements</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {Math.round(goal.progressPercent)}%
                          </p>
                          <p className="text-xs text-[color:var(--app-text-muted)]">
                            ของเป้าหมาย
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progressWidth}%`,
                            backgroundColor: goal.color,
                          }}
                        />
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
                        <div>
                          <p className="text-xs text-[color:var(--app-text-muted)]">ยอดปัจจุบัน</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatBaht(goal.currentAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--app-text-muted)]">เป้าหมาย</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatBaht(goal.targetAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--app-text-muted)]">กำไรสะสม</p>
                          <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatBaht(goal.totalGrowth)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--app-text-muted)]">% กำไร</p>
                          <p className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {formatPercent(goal.growthPercent)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <div className="flex flex-wrap gap-4 text-sm text-[color:var(--app-text-muted)]">
                          <span className="inline-flex items-center gap-2">
                            <Target size={16} />
                            เหลืออีก {formatBaht(goal.remainingAmount)}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <TrendingUp size={16} />
                            พอร์ตเติบโต {formatPercent(goal.growthPercent)}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors dark:bg-zinc-100 dark:text-zinc-900">
                          เปิดเป้านี้
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
