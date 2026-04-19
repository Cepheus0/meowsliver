"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  Landmark,
  PencilLine,
  PiggyBank,
  Plus,
  RotateCcw,
  Save,
  TrendingUp,
  Trash2,
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
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
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
  contribution:
    "bg-[color:var(--income-soft)] text-[color:var(--income-text)]",
  growth:
    "bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)]",
  withdrawal:
    "bg-[color:var(--neutral-soft)] text-[color:var(--neutral)]",
  adjustment:
    "bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)]",
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
      <p className="mt-2 text-2xl font-bold text-[color:var(--app-text)]">
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

function createDefaultEntryForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    type: "contribution" as SavingsGoalEntryType,
    amount: "",
    note: "",
  };
}

export default function SavingsGoalDetailPage() {
  const params = useParams<{ goalId: string }>();
  const router = useRouter();
  const goalId = Number(params.goalId);
  const [detail, setDetail] = useState<SavingsGoalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isArchivingGoal, setIsArchivingGoal] = useState(false);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(createDefaultEntryForm);
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

  const applyDetail = (nextDetail: SavingsGoalDetail) => {
    setDetail(nextDetail);
    setGoalForm({
      name: nextDetail.goal.name,
      category: nextDetail.goal.category,
      icon: nextDetail.goal.icon,
      color: nextDetail.goal.color,
      targetAmount: `${nextDetail.goal.targetAmount}`,
      targetDate: nextDetail.goal.targetDate ?? "",
      strategyLabel: nextDetail.goal.strategyLabel ?? "",
      notes: nextDetail.goal.notes ?? "",
    });
  };

  const resetEntryForm = () => {
    setEditingEntryId(null);
    setForm(createDefaultEntryForm());
  };

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

          applyDetail(data.detail);
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

  const handleSaveEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        editingEntryId
          ? `/api/savings-goals/${goalId}/entries/${editingEntryId}`
          : `/api/savings-goals/${goalId}/entries`,
        {
          method: editingEntryId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            amount: Number(form.amount),
          }),
        }
      );

      const data = (await response.json()) as {
        detail?: SavingsGoalDetail;
        error?: string;
      };

      if (!response.ok || !data.detail) {
        throw new Error(
          data.error ??
            (editingEntryId
              ? "ไม่สามารถแก้ไขรายการได้"
              : "ไม่สามารถบันทึกรายการได้")
        );
      }

      applyDetail(data.detail);
      resetEntryForm();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : editingEntryId
            ? "ไม่สามารถแก้ไขรายการให้เป้าหมายนี้ได้"
            : "ไม่สามารถบันทึกรายการให้เป้าหมายนี้ได้"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditEntry = (entry: SavingsGoalDetail["entries"][number]) => {
    setEditingEntryId(entry.id);
    setForm({
      date: entry.date,
      type: entry.type,
      amount: `${entry.amount}`,
      note: entry.note ?? "",
    });
    setError(null);
  };

  const handleDeleteEntry = async (
    entry: SavingsGoalDetail["entries"][number]
  ) => {
    if (!confirm(`ลบ movement วันที่ ${formatGoalDate(entry.date)} ใช่หรือไม่?`)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/savings-goals/${goalId}/entries/${entry.id}`,
        {
          method: "DELETE",
        }
      );

      const data = (await response.json()) as {
        detail?: SavingsGoalDetail;
        error?: string;
      };

      if (!response.ok || !data.detail) {
        throw new Error(data.error ?? "ไม่สามารถลบรายการได้");
      }

      applyDetail(data.detail);
      if (editingEntryId === entry.id) {
        resetEntryForm();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "ไม่สามารถลบรายการของเป้าหมายนี้ได้"
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

      applyDetail(data.detail);
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

  const handleArchiveGoal = async () => {
    if (!detail) return;
    if (!confirm(`เก็บเป้าหมาย "${detail.goal.name}" ขึ้นหิ้ง?`)) return;

    setIsArchivingGoal(true);
    setError(null);
    try {
      const response = await fetch(`/api/savings-goals/${goalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isArchived: true }),
      });

      const data = (await response.json()) as {
        detail?: SavingsGoalDetail;
        error?: string;
      };

      if (!response.ok || !data.detail) {
        throw new Error(data.error ?? "ไม่สามารถเก็บเป้าหมายขึ้นหิ้งได้");
      }

      applyDetail(data.detail);
      setIsEditingGoal(false);
      resetEntryForm();
    } catch (archiveError) {
      console.error(archiveError);
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "ไม่สามารถเก็บเป้าหมายขึ้นหิ้งได้"
      );
    } finally {
      setIsArchivingGoal(false);
    }
  };

  const handleRestoreGoal = async () => {
    if (!detail) return;

    setIsArchivingGoal(true);
    setError(null);
    try {
      const response = await fetch(`/api/savings-goals/${goalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isArchived: false }),
      });

      const data = (await response.json()) as {
        detail?: SavingsGoalDetail;
        error?: string;
      };

      if (!response.ok || !data.detail) {
        throw new Error(data.error ?? "ไม่สามารถกู้คืนเป้าหมายได้");
      }

      applyDetail(data.detail);
    } catch (restoreError) {
      console.error(restoreError);
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "ไม่สามารถกู้คืนเป้าหมายได้"
      );
    } finally {
      setIsArchivingGoal(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!detail) return;
    if (
      !confirm(
        `ลบเป้าหมาย "${detail.goal.name}" ถาวร? ระบบจะลบ movement ทั้งหมดของเป้านี้ด้วย`
      )
    ) {
      return;
    }

    setIsDeletingGoal(true);
    setError(null);
    try {
      const response = await fetch(`/api/savings-goals/${goalId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "ไม่สามารถลบเป้าหมายนี้ได้");
      }

      router.push("/buckets");
    } catch (deleteError) {
      console.error(deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "ไม่สามารถลบเป้าหมายนี้ได้"
      );
    } finally {
      setIsDeletingGoal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-[color:var(--app-surface-soft)]" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-[color:var(--app-surface-soft)]"
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/buckets"
            className="theme-border inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-[color:var(--app-text)] transition-colors hover:bg-[color:var(--app-surface-soft)]"
          >
            <ArrowLeft size={16} />
            กลับไปหน้า Savings
          </Link>
          <span className="rounded-xl bg-[color:var(--app-surface-soft)] px-3 py-2 text-xs font-medium text-[color:var(--app-text-muted)]">
            {GOAL_CATEGORY_LABELS[detail.goal.category]}
          </span>
          {detail.goal.isArchived && (
            <span className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--app-surface-soft)] px-3 py-2 text-xs font-medium text-[color:var(--app-text-muted)]">
              <Archive size={14} />
              เก็บขึ้นหิ้ง
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {detail.goal.isArchived ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRestoreGoal}
                disabled={isArchivingGoal || isDeletingGoal}
              >
                <RotateCcw size={16} />
                กู้คืนเป้าหมาย
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteGoal}
                disabled={isArchivingGoal || isDeletingGoal}
              >
                <Trash2 size={16} />
                ลบถาวร
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingGoal((value) => !value)}
                disabled={isArchivingGoal || isDeletingGoal}
              >
                {isEditingGoal ? <X size={16} /> : <PencilLine size={16} />}
                {isEditingGoal ? "ปิดโหมดแก้ไข" : "แก้ไขเป้าหมาย"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleArchiveGoal}
                disabled={isArchivingGoal || isDeletingGoal}
              >
                <Archive size={16} />
                เก็บขึ้นหิ้ง
              </Button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <Card className="border-[color:var(--expense-soft)] bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]">
          <p className="text-sm font-medium">{error}</p>
        </Card>
      ) : null}

      {detail.goal.isArchived && (
        <Card className="border-[color:var(--neutral-soft)] bg-[color:var(--neutral-soft)] text-[color:var(--neutral)]">
          <p className="text-sm font-medium">
            เป้าหมายนี้ถูกเก็บขึ้นหิ้งแล้ว จึงหยุดรับ movement ใหม่และแก้ไขประวัติเดิมชั่วคราว
            คุณสามารถกู้คืนเพื่อกลับมาใช้งานต่อ หรือเลือกลบถาวรได้
          </p>
        </Card>
      )}

      <PageHeader
        eyebrow={GOAL_CATEGORY_LABELS[detail.goal.category]}
        title={detail.goal.name}
        description={
          detail.goal.notes ||
          detail.goal.strategyLabel ||
          "ติดตาม progress, growth, deadline และ movement history ของเป้าหมายนี้ในมุมมองเดียว"
        }
        meta={[
          {
            icon: <TrendingUp size={14} />,
            label: `${Math.round(detail.metrics.progressPercent)}% complete`,
            tone: "success",
          },
          {
            icon: <PiggyBank size={14} />,
            label: `ยอดปัจจุบัน ${formatBaht(detail.goal.currentAmount)}`,
            tone: "brand",
          },
          {
            icon: <Landmark size={14} />,
            label: `${detail.metrics.entryCount} movements`,
          },
          {
            icon: <Save size={14} />,
            label: formatDaysRemaining(detail.metrics.daysRemaining),
            tone: detail.metrics.daysRemaining != null && detail.metrics.daysRemaining < 0 ? "danger" : "neutral",
          },
          ...(detail.goal.isArchived
            ? [
                {
                  icon: <Archive size={14} />,
                  label: "เก็บขึ้นหิ้ง",
                  tone: "neutral" as const,
                },
              ]
            : []),
        ]}
        actions={
          <>
            {detail.goal.isArchived ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRestoreGoal}
                  disabled={isArchivingGoal || isDeletingGoal}
                >
                  <RotateCcw size={16} />
                  กู้คืนเป้าหมาย
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteGoal}
                  disabled={isArchivingGoal || isDeletingGoal}
                >
                  <Trash2 size={16} />
                  ลบถาวร
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditingGoal((value) => !value)}
                  disabled={isArchivingGoal || isDeletingGoal}
                >
                  {isEditingGoal ? <X size={16} /> : <PencilLine size={16} />}
                  {isEditingGoal ? "ปิดโหมดแก้ไข" : "แก้ไขเป้าหมาย"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleArchiveGoal}
                  disabled={isArchivingGoal || isDeletingGoal}
                >
                  <Archive size={16} />
                  เก็บขึ้นหิ้ง
                </Button>
              </>
            )}
          </>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="items-center border-b border-[color:var(--app-divider-soft)] pb-4">
          <div>
            <CardTitle>Goal progress</CardTitle>
            <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
              Target {formatBaht(detail.goal.targetAmount)} · {formatGoalDate(detail.goal.targetDate)}
            </p>
          </div>
          <div className="rounded-[22px] bg-[color:var(--income-soft)] px-5 py-4 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-text-muted)]">
              Goal progress
            </p>
            <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-4xl font-bold text-[color:var(--income-text)]">
              {Math.round(detail.metrics.progressPercent)}%
            </p>
          </div>
        </CardHeader>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-[color:var(--app-surface-soft)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressWidth}%`,
              backgroundColor: detail.goal.color,
            }}
          />
        </div>
      </Card>

      {isEditingGoal && !detail.goal.isArchived ? (
        <Card>
          <CardHeader>
            <CardTitle>แก้ไขเป้าหมายนี้</CardTitle>
          </CardHeader>
          <form className="space-y-4" onSubmit={handleUpdateGoal}>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text-muted)]">
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
                  className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[color:var(--app-brand-text)] focus:ring-2 focus:ring-[color:var(--app-brand-soft-strong)]"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text-muted)]">
                  ประเภทเป้าหมาย
                </span>
                <Select
                  value={goalForm.category}
                  onChange={(v) =>
                    setGoalForm((currentForm) => {
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
                  options={Object.entries(GOAL_CATEGORY_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text-muted)]">
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
                  className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[color:var(--app-brand-text)] focus:ring-2 focus:ring-[color:var(--app-brand-soft-strong)]"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text-muted)]">
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
                  className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[color:var(--app-brand-text)] focus:ring-2 focus:ring-[color:var(--app-brand-soft-strong)]"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text-muted)]">
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
                  className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[color:var(--app-brand-text)] focus:ring-2 focus:ring-[color:var(--app-brand-soft-strong)]"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-[color:var(--app-text-muted)]">
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
                  className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[color:var(--app-brand-text)] focus:ring-2 focus:ring-[color:var(--app-brand-soft-strong)]"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-[color:var(--app-text-muted)]">
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
                className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-3 text-[color:var(--app-text)] outline-none transition-colors focus:border-[color:var(--app-brand-text)] focus:ring-2 focus:ring-[color:var(--app-brand-soft-strong)]"
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
            <CardTitle>
              {detail.goal.isArchived
                ? "เป้าหมายนี้อยู่ในสถานะ archived"
                : editingEntryId
                  ? "แก้ไข movement"
                  : "บันทึก movement ใหม่"}
            </CardTitle>
          </CardHeader>
          {detail.goal.isArchived ? (
            <EmptyState
              icon={<Archive size={20} />}
              title="ยังแก้ movement ไม่ได้ในตอนนี้"
              description="กู้คืนเป้าหมายนี้ก่อน หากต้องการเพิ่ม แก้ไข หรือลบ movement"
            />
          ) : (
          <form className="space-y-4" onSubmit={handleSaveEntry}>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-[color:var(--app-text-muted)]">
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
                className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[color:var(--app-brand-text)] focus:ring-2 focus:ring-[color:var(--app-brand-soft-strong)]"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-[color:var(--app-text-muted)]">
                ประเภทรายการ
              </span>
              <Select
                value={form.type}
                onChange={(v) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    type: v as SavingsGoalEntryType,
                  }))
                }
                options={Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-[color:var(--app-text-muted)]">
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
                className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2.5 text-[color:var(--app-text)] outline-none transition-colors focus:border-[color:var(--app-brand-text)] focus:ring-2 focus:ring-[color:var(--app-brand-soft-strong)]"
                placeholder={
                  form.type === "adjustment"
                    ? "ใช้ค่าบวกหรือลบได้"
                    : "ใส่จำนวนเต็มหรือทศนิยม"
                }
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-[color:var(--app-text-muted)]">
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
                className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-3 text-[color:var(--app-text)] outline-none transition-colors focus:border-[color:var(--app-brand-text)] focus:ring-2 focus:ring-[color:var(--app-brand-soft-strong)]"
                placeholder="เช่น เติมเงินเดือนนี้, ดอกเบี้ยประจำงวด, ปรับยอดหลัง reconcile"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {editingEntryId ? <Save size={16} /> : <Plus size={16} />}
                {isSubmitting
                  ? "กำลังบันทึก..."
                  : editingEntryId
                    ? "บันทึกการแก้ไข"
                    : "เพิ่ม movement"}
              </Button>
              {editingEntryId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetEntryForm}
                  disabled={isSubmitting}
                >
                  ยกเลิก
                </Button>
              ) : null}
            </div>
          </form>
          )}
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
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="theme-border border-b">
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
                  <th className="px-2 py-3 text-right font-medium text-[color:var(--app-text-muted)]">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--app-divider)]">
                {detail.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-2 py-3 text-[color:var(--app-text-muted)]">
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
                    <td className="px-2 py-3 text-right font-semibold text-[color:var(--app-text)]">
                      <span className="inline-flex items-center gap-1">
                        {entry.type === "growth" ? <ArrowUpRight size={14} /> : null}
                        {entry.type === "contribution" ? <Landmark size={14} /> : null}
                        {formatSignedAmount(entry.type, entry.amount)}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEditEntry(entry)}
                          disabled={detail.goal.isArchived || isSubmitting}
                        >
                          <PencilLine size={14} />
                          แก้ไข
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry)}
                          disabled={detail.goal.isArchived || isSubmitting}
                        >
                          <Trash2 size={14} />
                          ลบ
                        </Button>
                      </div>
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
