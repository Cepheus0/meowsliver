"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  GripVertical,
  PiggyBank,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useDragReorder } from "@/lib/use-drag-reorder";
import { useFinanceStore } from "@/store/finance-store";
import {
  DEFAULT_GOAL_COLOR,
  DEFAULT_GOAL_ICON,
  GOAL_CATEGORY_LABELS,
  GOAL_CATEGORY_LABELS_EN,
  SAVINGS_GOAL_PRESETS,
  formatGoalDate,
  getGoalCategoryLabel,
  getGoalPreset,
} from "@/lib/savings-goals";
import type { SavingsGoalCategory, SavingsGoalsPortfolio } from "@/lib/types";
import { formatBaht, formatPercent } from "@/lib/utils";
import { useLanguage, useTr } from "@/lib/i18n";

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
      <p className="mt-2 text-2xl font-bold text-[color:var(--app-text)]">
        {value}
      </p>
      <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">{helper}</p>
    </Card>
  );
}

export default function BucketsPage() {
  const tr = useTr();
  const language = useLanguage();
  const bucketOrder = useFinanceStore((s) => s.bucketOrder);
  const setBucketOrder = useFinanceStore((s) => s.setBucketOrder);
  const [portfolio, setPortfolio] = useState<SavingsGoalsPortfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const loadPortfolio = useCallback(async () => {
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
      setError(
        tr("ไม่สามารถโหลด Savings Goals Portfolio ได้", "Could not load Savings Goals Portfolio")
      );
    } finally {
      setIsLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  const orderedGoals = useMemo(() => {
    if (!portfolio) return [];
    const byId = new Map(portfolio.goals.map((g) => [g.id, g] as const));
    const result: typeof portfolio.goals = [];
    const seen = new Set<number>();
    for (const id of bucketOrder) {
      const g = byId.get(id);
      if (g) {
        result.push(g);
        seen.add(id);
      }
    }
    for (const g of portfolio.goals) {
      if (!seen.has(g.id)) result.push(g);
    }
    return result;
  }, [portfolio, bucketOrder]);

  const goalIds = useMemo(() => orderedGoals.map((g) => g.id), [orderedGoals]);
  const dr = useDragReorder<number>(goalIds, setBucketOrder);

  const pendingGoal = pendingDeleteId
    ? portfolio?.goals.find((g) => g.id === pendingDeleteId) ??
      portfolio?.archivedGoals.find((g) => g.id === pendingDeleteId) ??
      null
    : null;

  const handleDeleteGoal = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/savings-goals/${pendingDeleteId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? tr("ลบเป้าหมายไม่สำเร็จ", "Could not delete goal"));
      }
      setBucketOrder(bucketOrder.filter((id) => id !== pendingDeleteId));
      setPendingDeleteId(null);
      await loadPortfolio();
    } catch (deleteError) {
      console.error(deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : tr("ลบเป้าหมายไม่สำเร็จ", "Could not delete goal")
      );
    } finally {
      setIsDeleting(false);
    }
  };

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
        throw new Error(
          data.error ?? tr("สร้างเป้าหมายไม่สำเร็จ", "Could not create goal")
        );
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
          : tr("ไม่สามารถสร้างเป้าหมายการออมได้", "Could not create savings goal")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr("SAVINGS GOALS", "SAVINGS GOALS")}
        title="Savings Goals Portfolio"
        description={tr(
          "บริหารหลายเป้าหมายในที่เดียวพร้อมดู progress, growth, pace, และสถานะ active/archive โดยไม่ต้องสลับหน้าไปมา",
          "Manage multiple goals in one workspace with progress, growth, pace, and active/archive status without jumping between views."
        )}
        meta={[
          {
            icon: <Target size={14} />,
            label: portfolio
              ? tr(`${portfolio.goals.length} เป้าหมายที่ใช้งาน`, `${portfolio.goals.length} active goals`)
              : tr("กำลังโหลดพอร์ตเป้าหมาย", "Loading goal portfolio"),
            tone: portfolio ? "brand" : "neutral",
          },
          ...(portfolio
            ? [
                {
                  icon: <PiggyBank size={14} />,
                  label: tr(
                    `ออมแล้ว ${formatBaht(portfolio.overview.totalSaved)}`,
                    `Saved ${formatBaht(portfolio.overview.totalSaved)}`
                  ),
                  tone: "success" as const,
                },
                {
                  icon: <Archive size={14} />,
                  label: tr(
                    `${portfolio.archivedGoals.length} เป้าหมายที่เก็บไว้`,
                    `${portfolio.archivedGoals.length} archived goals`
                  ),
                  tone:
                    portfolio.archivedGoals.length > 0
                      ? ("neutral" as const)
                      : ("default" as const),
                },
              ]
            : []),
        ]}
        actions={
          <Button size="sm" onClick={() => setShowCreateForm((value) => !value)}>
            <Plus size={16} />
            {showCreateForm
              ? tr("ซ่อนฟอร์ม", "Hide form")
              : tr("เพิ่มเป้าหมาย", "Add goal")}
          </Button>
        }
      />

      {error ? (
        <Card className="border-[color:var(--expense-soft)] bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]">
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
                <p className="mt-4 text-base font-semibold text-[color:var(--app-text)]">
                  {tr(preset.name, preset.nameEn)}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--app-text-muted)]">
                  {tr(preset.description, preset.descriptionEn)}
                </p>
              </div>
              <Sparkles size={18} className="shrink-0 text-[color:var(--app-text-subtle)]" />
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-subtle)]">
              {tr("ช่องทางออมที่แนะนำ", "Suggested vehicle")}
            </p>
            <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
              {tr(preset.strategyLabel, preset.strategyLabelEn)}
            </p>
          </button>
        ))}
      </div>

      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{tr("สร้างเป้าหมายการออมใหม่", "Create a new savings goal")}</CardTitle>
          </CardHeader>
          <form className="space-y-4" onSubmit={handleCreateGoal}>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text)]">
                  {tr("ชื่อเป้าหมาย", "Goal name")}
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
                  className="theme-border theme-surface w-full rounded-xl border px-4 py-2.5 text-[color:var(--app-text)] outline-none ring-0 transition-colors focus:border-[#f54e00]"
                  placeholder={tr("เช่น เงินแต่งงาน, เงินเกษียณ", "e.g. Wedding fund, Retirement")}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text-muted)]">
                  {tr("ประเภทเป้าหมาย", "Goal category")}
                </span>
                <Select
                  value={form.category}
                  onChange={(v) =>
                    setForm((currentForm) => {
                      const category = v as SavingsGoalCategory;
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
                  options={Object.entries(
                    language === "en" ? GOAL_CATEGORY_LABELS_EN : GOAL_CATEGORY_LABELS
                  ).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text-muted)]">
                  {tr("เป้าหมาย (บาท)", "Target (THB)")}
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
                  className="theme-border theme-surface w-full rounded-xl border px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[#f54e00]"
                  placeholder={tr("เช่น 300000", "e.g. 300000")}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text)]">
                  {tr("วันเป้าหมาย", "Target date")}
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
                  className="theme-border theme-surface w-full rounded-xl border px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[#f54e00]"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text)]">
                  {tr("ช่องทางออม / กลยุทธ์", "Savings vehicle / strategy")}
                </span>
                <input
                  value={form.strategyLabel}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      strategyLabel: event.target.value,
                    }))
                  }
                  className="theme-border theme-surface w-full rounded-xl border px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[#f54e00]"
                  placeholder={tr("เช่น RMF, Money Market Fund, บัญชีฝากประจำ", "e.g. RMF, Money Market Fund, fixed deposit")}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text)]">
                  {tr("ยอดตั้งต้น (ถ้ามี)", "Starting balance (optional)")}
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
                  className="theme-border theme-surface w-full rounded-xl border px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[#f54e00]"
                  placeholder={tr("เช่น 50000", "e.g. 50000")}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text)]">
                  {tr("วันที่ยอดตั้งต้น", "Starting balance date")}
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
                  className="theme-border theme-surface w-full rounded-xl border px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[#f54e00]"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text)]">
                  {tr("ไอคอน", "Icon")}
                </span>
                <input
                  value={form.icon}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      icon: event.target.value,
                    }))
                  }
                  className="theme-border theme-surface w-full rounded-xl border px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[#f54e00]"
                  placeholder={tr("เช่น 💍", "e.g. 💍")}
                />
              </label>
            </div>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-[color:var(--app-text)]">
                {tr("บันทึกเพิ่มเติม", "Additional notes")}
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
                className="theme-border theme-surface w-full rounded-xl border px-4 py-3 text-[color:var(--app-text)] outline-none transition-colors focus:border-[#f54e00]"
                placeholder={tr(
                  "เช่น เป้าหมายนี้อยากเก็บให้ครบก่อน Q4 ปีหน้า และคุม volatility ต่ำ",
                  "e.g. Fund this fully before Q4 next year and keep volatility low"
                )}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tr("กำลังบันทึก...", "Saving...") : tr("สร้างเป้าหมาย", "Create goal")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
              >
                {tr("ยกเลิก", "Cancel")}
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
              className="h-32 animate-pulse rounded-2xl bg-[color:var(--app-surface-soft)]"
            />
          ))}
        </div>
      ) : portfolio ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <PortfolioStatCard
              label={tr("จำนวนเป้าหมาย", "Goal count")}
              value={`${portfolio.overview.goalCount}`}
              helper={
                portfolio.overview.archivedGoalCount > 0
                  ? tr(
                      `${portfolio.overview.completedGoals} เป้าหมายถึงแล้ว • archived ${portfolio.overview.archivedGoalCount}`,
                      `${portfolio.overview.completedGoals} reached • ${portfolio.overview.archivedGoalCount} archived`
                    )
                  : tr(
                      `${portfolio.overview.completedGoals} เป้าหมายถึงแล้ว`,
                      `${portfolio.overview.completedGoals} goals reached`
                    )
              }
            />
            <PortfolioStatCard
              label={tr("สะสมแล้ว", "Saved")}
              value={formatBaht(portfolio.overview.totalSaved)}
              helper={tr(
                `ต้องเก็บเพิ่มอีก ${formatBaht(portfolio.overview.remainingAmount)}`,
                `${formatBaht(portfolio.overview.remainingAmount)} left to save`
              )}
            />
            <PortfolioStatCard
              label={tr("กำไรรวม", "Total growth")}
              value={formatBaht(portfolio.overview.totalGrowth)}
              helper={tr("รวมดอกผลและกำไรจากทุกเป้าหมาย", "Combined interest and gains across all goals")}
            />
            <PortfolioStatCard
              label={tr("Progress รวม", "Overall progress")}
              value={`${Math.round(portfolio.overview.overallProgressPercent)}%`}
              helper={tr(
                `เทียบกับเป้ารวม ${formatBaht(portfolio.overview.totalTarget)}`,
                `vs. total target ${formatBaht(portfolio.overview.totalTarget)}`
              )}
            />
          </div>

          {portfolio.goals.length === 0 ? (
            <Card>
              <EmptyState
                icon={<PiggyBank size={20} />}
                title={
                  portfolio.archivedGoals.length > 0
                    ? tr("ยังไม่มีเป้าหมายที่ active อยู่ตอนนี้", "No active goals right now")
                    : tr("ยังไม่มี Savings Goals", "No savings goals yet")
                }
                description={
                  portfolio.archivedGoals.length > 0
                    ? tr(
                        `ตอนนี้มี ${portfolio.archivedGoals.length} เป้าหมายที่เก็บขึ้นหิ้งอยู่ด้านล่าง คุณสามารถเปิดดูเพื่อตัดสินใจกู้คืนหรือลบถาวรได้`,
                        `You have ${portfolio.archivedGoals.length} archived goal(s) below. Open them to restore or delete permanently.`
                      )
                    : tr(
                        "กด preset ด้านบนหรือสร้างเป้าหมายแบบกำหนดเอง แล้วระบบจะเริ่มติดตาม progress และ growth ให้ทันที",
                        "Pick a preset above or build a custom goal, and the system will start tracking progress and growth immediately."
                      )
                }
              />
            </Card>
          ) : (
            <>
              {orderedGoals.length > 1 && (
                <p className="-mt-1 flex items-center gap-1.5 text-[11px] text-[color:var(--app-text-subtle)]">
                  <GripVertical size={11} />
                  {tr("ลากการ์ดเพื่อจัดเรียงใหม่", "Drag cards to reorder")}
                </p>
              )}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {orderedGoals.map((goal) => {
                const progressWidth = Math.min(goal.progressPercent, 100);

                return (
                  <div
                    key={goal.id}
                    {...dr.itemProps(goal.id)}
                    className={`group relative ${
                      dr.isDragging(goal.id) ? "opacity-40" : ""
                    } ${
                      dr.isOver(goal.id)
                        ? "ring-2 ring-[color:var(--app-brand-text)] ring-offset-2 ring-offset-[color:var(--app-surface)] rounded-2xl"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingDeleteId(goal.id);
                      }}
                      aria-label={tr("ลบเป้าหมาย", "Delete goal")}
                      title={tr("ลบเป้าหมาย", "Delete goal")}
                      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)] opacity-0 shadow-sm transition-all hover:border-[color:var(--expense-soft)] hover:bg-[color:var(--expense-soft)] hover:text-[color:var(--expense-text)] group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span
                      className="pointer-events-none absolute left-3 top-3 z-10 opacity-0 transition-opacity group-hover:opacity-60"
                      aria-hidden
                    >
                      <GripVertical size={14} className="text-[color:var(--app-text-subtle)]" />
                    </span>
                    <Link href={`/buckets/${goal.id}`} className="block">
                    <Card className="overflow-hidden transition-all hover:-translate-y-0.5 hover:border-[color:var(--app-border-strong)] hover:shadow-md">
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
                              <h2 className="text-lg font-semibold text-[color:var(--app-text)]">
                                {SAVINGS_GOAL_PRESETS.find(p => p.name === goal.name) ? tr(SAVINGS_GOAL_PRESETS.find(p => p.name === goal.name)!.name, SAVINGS_GOAL_PRESETS.find(p => p.name === goal.name)!.nameEn) : goal.name}
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
                              {SAVINGS_GOAL_PRESETS.find(p => p.strategyLabel === goal.strategyLabel) ? tr(SAVINGS_GOAL_PRESETS.find(p => p.strategyLabel === goal.strategyLabel)!.strategyLabel, SAVINGS_GOAL_PRESETS.find(p => p.strategyLabel === goal.strategyLabel)!.strategyLabelEn) : (goal.strategyLabel || tr("ยังไม่ได้ระบุช่องทางออม", "No strategy specified"))}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--app-text-muted)]">
                              <span>{tr("วันเป้าหมาย", "Target date")}: {formatGoalDate(goal.targetDate, language)}</span>
                              <span>{goal.entryCount} {tr("รายการเคลื่อนไหว", "movements")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[color:var(--app-text)]">
                            {Math.round(goal.progressPercent)}%
                          </p>
                          <p className="text-xs text-[color:var(--app-text-muted)]">
                            {tr("ของเป้าหมาย", "of target")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[color:var(--app-surface-soft)]">
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
                          <p className="text-xs text-[color:var(--app-text-muted)]">{tr("ยอดปัจจุบัน", "Current amount")}</p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--app-text)]">
                            {formatBaht(goal.currentAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--app-text-muted)]">{tr("เป้าหมาย", "Target")}</p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--app-text)]">
                            {formatBaht(goal.targetAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--app-text-muted)]">{tr("กำไรสะสม", "Total growth")}</p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--income-text)]">
                            {formatBaht(goal.totalGrowth)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--app-text-muted)]">{tr("% กำไร", "Growth %")}</p>
                          <p className="mt-1 text-sm font-semibold text-[color:var(--app-brand-text)]">
                            {formatPercent(goal.growthPercent)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--app-divider-soft)] pt-4">
                        <div className="flex flex-wrap gap-4 text-sm text-[color:var(--app-text-muted)]">
                          <span className="inline-flex items-center gap-2">
                            <Target size={16} />
                            {tr("เหลืออีก", "Remaining")} {formatBaht(goal.remainingAmount)}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <TrendingUp size={16} />
                            {tr("พอร์ตเติบโต", "Portfolio growth")} {formatPercent(goal.growthPercent)}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-xl bg-[#f54e00] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d44400]">
                          {tr("เปิดเป้านี้", "Open goal")}
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </Card>
                  </Link>
                  </div>
                );
              })}
            </div>
            </>
          )}

          {portfolio.archivedGoals.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[color:var(--app-text-muted)]">
                <Archive size={16} />
                {tr("เป้าหมายที่เก็บขึ้นหิ้ง", "Archived goals")} ({portfolio.archivedGoals.length})
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {portfolio.archivedGoals.map((goal) => (
                  <div key={goal.id} className="group relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingDeleteId(goal.id);
                      }}
                      aria-label={tr("ลบเป้าหมาย", "Delete goal")}
                      title={tr("ลบเป้าหมายถาวร", "Delete goal permanently")}
                      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)] opacity-0 shadow-sm transition-all hover:bg-[color:var(--expense-soft)] hover:text-[color:var(--expense-text)] group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                    <Link href={`/buckets/${goal.id}`} className="block">
                    <Card className="transition-all hover:-translate-y-0.5 hover:border-[color:var(--app-border-strong)] hover:shadow-md">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                            style={{ backgroundColor: `${goal.color}16` }}
                          >
                            {goal.icon}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-semibold text-[color:var(--app-text)]">
                                {SAVINGS_GOAL_PRESETS.find(p => p.name === goal.name) ? tr(SAVINGS_GOAL_PRESETS.find(p => p.name === goal.name)!.name, SAVINGS_GOAL_PRESETS.find(p => p.name === goal.name)!.nameEn) : goal.name}
                              </h2>
                              <span className="rounded-xl bg-[color:var(--app-surface-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--app-text-muted)]">
                                {tr("เก็บขึ้นหิ้ง", "Archived")}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
                              {SAVINGS_GOAL_PRESETS.find(p => p.strategyLabel === goal.strategyLabel) ? tr(SAVINGS_GOAL_PRESETS.find(p => p.strategyLabel === goal.strategyLabel)!.strategyLabel, SAVINGS_GOAL_PRESETS.find(p => p.strategyLabel === goal.strategyLabel)!.strategyLabelEn) : (goal.strategyLabel || tr("ยังไม่ได้ระบุช่องทางออม", "No strategy specified"))}
                            </p>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--app-text-muted)]">
                          {tr("เปิดดู", "View")}
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </Card>
                  </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        busy={isDeleting}
        tone="danger"
        title={tr("ลบเป้าหมายการออม?", "Delete savings goal?")}
        description={
          pendingGoal
            ? tr(
                `เป้าหมาย "${pendingGoal.name}" และรายการทั้งหมดจะถูกลบถาวร การกระทำนี้ย้อนกลับไม่ได้`,
                `The goal "${pendingGoal.name}" and all its entries will be permanently deleted. This cannot be undone.`
              )
            : undefined
        }
        confirmLabel={tr("ลบถาวร", "Delete permanently")}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={handleDeleteGoal}
      />
    </div>
  );
}
