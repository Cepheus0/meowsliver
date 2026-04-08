"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Landmark,
  PencilLine,
  PiggyBank,
  Plus,
  Save,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClientOnlyChart } from "@/components/charts/ClientOnlyChart";
import { chartTheme } from "@/lib/chart-theme";
import {
  DEFAULT_GOAL_COLOR,
  DEFAULT_GOAL_ICON,
  ENTRY_TYPE_LABELS,
  GOAL_CATEGORY_LABELS,
  formatGoalDate,
  getGoalPreset,
} from "@/lib/savings-goals";
import type {
  SavingsGoalCategory,
  SavingsGoalDetail,
  SavingsGoalEntryType,
} from "@/lib/types";
import { formatBaht, formatPercent } from "@/lib/utils";

const entryTypeStyles: Record<SavingsGoalEntryType, string> = {
  contribution: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  growth: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  withdrawal: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  adjustment: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function DetailStatCard({
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

function formatDaysRemaining(daysRemaining: number | null) {
  if (daysRemaining === null) {
    return "ยังไม่กำหนด deadline";
  }

  if (daysRemaining > 0) {
    return `เหลืออีก ${daysRemaining} วัน`;
  }

  if (daysRemaining === 0) {
    return "ถึงกำหนดวันนี้";
  }

  return `เกินเป้ามาแล้ว ${Math.abs(daysRemaining)} วัน`;
}

function formatSignedAmount(type: SavingsGoalEntryType, amount: number) {
  if (type === "withdrawal") {
    return `-${formatBaht(amount)}`;
  }

  if (type === "adjustment" && amount < 0) {
    return `-${formatBaht(Math.abs(amount))}`;
  }

  return `+${formatBaht(Math.abs(amount))}`;
}

export default function SavingsGoalDetailPage() {
  const params = useParams<{ goalId: string }>();
  const goalId = Number(params.goalId);
  const [detail, setDetail] = useState<SavingsGoalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "contribution" as SavingsGoalEntryType,
    amount: "",
    note: "",
  });
  const [goalForm, setGoalForm] = useState({
    name: "",
    category: "custom" as SavingsGoalCategory,
    icon: DEFAULT_GOAL_ICON,
    color: DEFAULT_GOAL_COLOR,
    targetAmount: "",
    targetDate: "",
    strategyLabel: "",
    notes: "",
  });

  useEffect(() => {
    if (Number.isFinite(goalId) && goalId > 0) {
      void (async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/savings-goals/${goalId}`, {
            cache: "no-store",
          });

          const data = (await response.json()) as {
            detail?: SavingsGoalDetail;
            error?: string;
          };

          if (!response.ok || !data.detail) {
            throw new Error(data.error ?? "ไม่สามารถโหลดรายละเอียดเป้าหมายได้");
          }

          setDetail(data.detail);
          setGoalForm({
            name: data.detail.goal.name,
            category: data.detail.goal.category,
            icon: data.detail.goal.icon,
            color: data.detail.goal.color,
            targetAmount: `${data.detail.goal.targetAmount}`,
            targetDate: data.detail.goal.targetDate ?? "",
            strategyLabel: data.detail.goal.strategyLabel ?? "",
            notes: data.detail.goal.notes ?? "",
          });
          setError(null);
        } catch (loadError) {
          console.error(loadError);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดรายละเอียดเป้าหมายได้"
          );
        } finally {
          setIsLoading(false);
        }
      })();
    } else {
      setError("รหัสเป้าหมายไม่ถูกต้อง");
      setIsLoading(false);
    }
  }, [goalId]);

  const handleAddEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/savings-goals/${goalId}/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });

      const data = (await response.json()) as {
        detail?: SavingsGoalDetail;
        error?: string;
      };

      if (!response.ok || !data.detail) {
        throw new Error(data.error ?? "ไม่สามารถบันทึกรายการได้");
      }

      setDetail(data.detail);
      setGoalForm({
        name: data.detail.goal.name,
        category: data.detail.goal.category,
        icon: data.detail.goal.icon,
        color: data.detail.goal.color,
        targetAmount: `${data.detail.goal.targetAmount}`,
        targetDate: data.detail.goal.targetDate ?? "",
        strategyLabel: data.detail.goal.strategyLabel ?? "",
        notes: data.detail.goal.notes ?? "",
      });
      setForm((currentForm) => ({
        ...currentForm,
        amount: "",
        note: "",
        type: "contribution",
      }));
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ไม่สามารถบันทึกรายการให้เป้าหมายนี้ได้"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGoal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingGoal(true);
    setError(null);

    try {
      const response = await fetch(`/api/savings-goals/${goalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...goalForm,
          targetAmount: Number(goalForm.targetAmount),
        }),
      });

      const data = (await response.json()) as {
        detail?: SavingsGoalDetail;
        error?: string;
      };

      if (!response.ok || !data.detail) {
        throw new Error(data.error ?? "ไม่สามารถอัปเดตเป้าหมายได้");
      }

      setDetail(data.detail);
      setGoalForm({
        name: data.detail.goal.name,
        category: data.detail.goal.category,
        icon: data.detail.goal.icon,
        color: data.detail.goal.color,
        targetAmount: `${data.detail.goal.targetAmount}`,
        targetDate: data.detail.goal.targetDate ?? "",
        strategyLabel: data.detail.goal.strategyLabel ?? "",
        notes: data.detail.goal.notes ?? "",
      });
      setIsEditingGoal(false);
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "ไม่สามารถอัปเดตเป้าหมายได้"
      );
    } finally {
      setIsSavingGoal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <Card>
        <EmptyState
          icon={<PiggyBank size={20} />}
          title="ไม่พบเป้าหมายนี้"
          description={error ?? "เป้าหมายนี้อาจถูกลบไปแล้วหรือมีรหัสไม่ถูกต้อง"}
          actionHref="/buckets"
          actionLabel="กลับไปหน้า Savings"
        />
      </Card>
    );
  }

  const progressWidth = Math.min(detail.metrics.progressPercent, 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/buckets"
          className="theme-border inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-[color:var(--app-text)] transition-colors hover:bg-[color:var(--app-surface-soft)]"
        >
          <ArrowLeft size={16} />
          กลับไปหน้า Savings
        </Link>
        <span className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {GOAL_CATEGORY_LABELS[detail.goal.category]}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsEditingGoal((value) => !value)}
        >
          {isEditingGoal ? <X size={16} /> : <PencilLine size={16} />}
          {isEditingGoal ? "ปิดโหมดแก้ไข" : "แก้ไขเป้าหมาย"}
        </Button>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50/60 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <p className="text-sm font-medium">{error}</p>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-3xl text-4xl"
              style={{ backgroundColor: `${detail.goal.color}18` }}
            >
              {detail.goal.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {detail.goal.name}
              </h1>
              <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
                {detail.goal.strategyLabel || "ยังไม่ได้ระบุกลยุทธ์การออม"}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[color:var(--app-text-muted)]">
                <span>Target date: {formatGoalDate(detail.goal.targetDate)}</span>
                <span>{formatDaysRemaining(detail.metrics.daysRemaining)}</span>
                <span>{detail.metrics.entryCount} movements</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-emerald-50 px-5 py-4 text-right dark:bg-emerald-500/10">
            <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
              Goal progress
            </p>
            <p className="mt-1 text-4xl font-bold text-emerald-600 dark:text-emerald-400">
              {Math.round(detail.metrics.progressPercent)}%
            </p>
          </div>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressWidth}%`,
              backgroundColor: detail.goal.color,
            }}
          />
        </div>
      </Card>

      {isEditingGoal ? (
        <Card>
          <CardHeader>
            <CardTitle>แก้ไขเป้าหมายนี้</CardTitle>
          </CardHeader>
          <form className="space-y-4" onSubmit={handleUpdateGoal}>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  ชื่อเป้าหมาย
                </span>
                <input
                  required
                  value={goalForm.name}
                  onChange={(event) =>
                    setGoalForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  ประเภทเป้าหมาย
                </span>
                <select
                  value={goalForm.category}
                  onChange={(event) =>
                    setGoalForm((currentForm) => {
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
                  value={goalForm.targetAmount}
                  onChange={(event) =>
                    setGoalForm((currentForm) => ({
                      ...currentForm,
                      targetAmount: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  วันเป้าหมาย
                </span>
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(event) =>
                    setGoalForm((currentForm) => ({
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
                  value={goalForm.strategyLabel}
                  onChange={(event) =>
                    setGoalForm((currentForm) => ({
                      ...currentForm,
                      strategyLabel: event.target.value,
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
                  value={goalForm.icon}
                  onChange={(event) =>
                    setGoalForm((currentForm) => ({
                      ...currentForm,
                      icon: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                บันทึกเพิ่มเติม
              </span>
              <textarea
                rows={4}
                value={goalForm.notes}
                onChange={(event) =>
                  setGoalForm((currentForm) => ({
                    ...currentForm,
                    notes: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSavingGoal}>
                <Save size={16} />
                {isSavingGoal ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditingGoal(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailStatCard
          label="ยอดปัจจุบัน"
          value={formatBaht(detail.metrics.currentAmount)}
          helper={`จากเป้า ${formatBaht(detail.goal.targetAmount)}`}
        />
        <DetailStatCard
          label="เงินต้นสุทธิ"
          value={formatBaht(detail.metrics.netContributions)}
          helper="หลังหักรายการถอนและรวม adjustment"
        />
        <DetailStatCard
          label="กำไรสะสม"
          value={formatBaht(detail.metrics.totalGrowth)}
          helper={`ผลตอบแทน ${formatPercent(detail.metrics.growthPercent)}`}
        />
        <DetailStatCard
          label="ต้องเติมเพิ่ม"
          value={formatBaht(detail.metrics.remainingAmount)}
          helper={
            detail.metrics.monthlyPaceNeeded
              ? `ควรเฉลี่ย ${formatBaht(detail.metrics.monthlyPaceNeeded)}/เดือน`
              : "ระบบจะคำนวณ pace เมื่อมี deadline"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Trajectory ของเป้าหมาย</CardTitle>
          </CardHeader>
          {detail.chartData.length === 0 ? (
            <EmptyState
              icon={<TrendingUp size={20} />}
              title="ยังไม่มี movement ของเป้าหมายนี้"
              description="เริ่มบันทึกยอดเติมเงินหรือกำไรครั้งแรก แล้วกราฟ balance เทียบกับเงินต้นสุทธิจะเริ่มวาดให้ทันที"
            />
          ) : (
            <ClientOnlyChart className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detail.chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} opacity={0.24} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: chartTheme.axis }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: chartTheme.axis }}
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatBaht(Number(value))}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.date
                        ? formatGoalDate(payload[0].payload.date)
                        : ""
                    }
                    contentStyle={chartTheme.tooltipStyle}
                  />
                  <Legend wrapperStyle={chartTheme.legendStyle} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="มูลค่าปัจจุบัน"
                    stroke={detail.goal.color}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netContributions"
                    name="เงินต้นสุทธิ"
                    stroke="#3b82f6"
                    strokeDasharray="6 4"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ClientOnlyChart>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>บันทึก movement ใหม่</CardTitle>
          </CardHeader>
          <form className="space-y-4" onSubmit={handleAddEntry}>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                วันที่
              </span>
              <input
                required
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    date: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                ประเภทรายการ
              </span>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    type: event.target.value as SavingsGoalEntryType,
                  }))
                }
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
              >
                {Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                จำนวนเงิน (บาท)
              </span>
              <input
                required
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    amount: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder={
                  form.type === "adjustment"
                    ? "ใช้ค่าบวกหรือลบได้"
                    : "ใส่จำนวนเต็มหรือทศนิยม"
                }
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                หมายเหตุ
              </span>
              <textarea
                rows={4}
                value={form.note}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    note: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none transition-colors focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="เช่น เติมเงินเดือนนี้, ดอกเบี้ยประจำงวด, ปรับยอดหลัง reconcile"
              />
            </label>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              <Plus size={16} />
              {isSubmitting ? "กำลังบันทึก..." : "เพิ่ม movement"}
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ประวัติการเคลื่อนไหว</CardTitle>
        </CardHeader>

        {detail.entries.length === 0 ? (
          <EmptyState
            icon={<Wallet size={20} />}
            title="ยังไม่มีประวัติรายการ"
            description="บันทึกรายการแรกของเป้าหมายนี้ แล้วตารางประวัติจะเริ่มแสดงให้ทันที"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-2 py-3 font-medium text-[color:var(--app-text-muted)]">
                    วันที่
                  </th>
                  <th className="px-2 py-3 font-medium text-[color:var(--app-text-muted)]">
                    ประเภท
                  </th>
                  <th className="px-2 py-3 font-medium text-[color:var(--app-text-muted)]">
                    หมายเหตุ
                  </th>
                  <th className="px-2 py-3 text-right font-medium text-[color:var(--app-text-muted)]">
                    จำนวนเงิน
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {detail.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-2 py-3 text-zinc-700 dark:text-zinc-300">
                      {formatGoalDate(entry.date)}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`inline-flex rounded-xl px-2.5 py-1 text-xs font-medium ${entryTypeStyles[entry.type]}`}
                      >
                        {ENTRY_TYPE_LABELS[entry.type]}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-[color:var(--app-text-muted)]">
                      {entry.note || "-"}
                    </td>
                    <td className="px-2 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                      <span className="inline-flex items-center gap-1">
                        {entry.type === "growth" ? <ArrowUpRight size={14} /> : null}
                        {entry.type === "contribution" ? <Landmark size={14} /> : null}
                        {formatSignedAmount(entry.type, entry.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
