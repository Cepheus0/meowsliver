"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTr } from "@/lib/i18n";
import type { InsightCandidate, InsightSeverity } from "@/lib/insights/types";
import { useFinanceStore } from "@/store/finance-store";

interface DashboardInsightResponse {
  packet?: {
    metrics?: {
      insightCount?: number;
    };
    evidence?: {
      insights?: InsightCandidate[];
    };
  };
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getSeverityClass(severity: InsightSeverity) {
  if (severity === "critical") {
    return {
      icon: <AlertTriangle size={16} />,
      className:
        "border-[color:var(--expense-text)]/35 bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]",
    };
  }

  if (severity === "warning") {
    return {
      icon: <AlertTriangle size={16} />,
      className:
        "border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand)]",
    };
  }

  if (severity === "watch") {
    return {
      icon: <Activity size={16} />,
      className:
        "border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] text-[color:var(--app-text)]",
    };
  }

  return {
    icon: <ShieldCheck size={16} />,
    className:
      "border-[color:var(--income-text)]/25 bg-[color:var(--income-soft)] text-[color:var(--income-text)]",
  };
}

export function DashboardInsights() {
  const tr = useTr();
  const language = useFinanceStore((state) => state.language);
  const [insights, setInsights] = useState<InsightCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const insightGridClassName =
    !isLoading && insights.length <= 1
      ? "grid w-full grid-cols-1 gap-3 lg:w-[420px]"
      : "grid flex-1 grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3";

  useEffect(() => {
    const controller = new AbortController();

    async function loadInsights() {
      try {
        const response = await fetch(
          `/api/insights/dashboard?date=${getTodayIsoDate()}&language=${language}`,
          {
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as DashboardInsightResponse;
        setInsights((data.packet?.evidence?.insights ?? []).slice(0, 3));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load dashboard insights", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadInsights();

    return () => controller.abort();
  }, [language]);

  if (!isLoading && insights.length === 0) {
    return null;
  }

  return (
    <Card className="animate-fade-slide-up anim-delay-1 overflow-hidden border-[color:var(--app-brand-border)] bg-[linear-gradient(135deg,var(--app-brand-soft)_0%,var(--app-surface)_56%,var(--app-surface-soft)_100%)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[color:var(--app-brand-border)] bg-[color:var(--app-surface)] px-3 py-1 text-xs font-semibold text-[color:var(--app-brand)]">
            <Sparkles size={14} />
            {tr("สัญญาณจาก metrics", "Metric-driven signals")}
          </div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--app-text)]">
            {tr("สิ่งที่ควรดูต่อจากตัวเลข", "What needs attention next")}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
            {tr(
              "สร้างจาก deterministic metrics เท่านั้น ยังไม่มี LLM สรุปหรือแต่งตัวเลข",
              "Built from deterministic metrics only; no LLM is generating or changing the numbers."
            )}
          </p>
        </div>

        <div className={insightGridClassName}>
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)]"
                />
              ))
            : insights.map((insight) => {
                const severity = getSeverityClass(insight.severity);

                return (
                  <article
                    key={insight.id}
                    className={`rounded-2xl border p-4 ${severity.className}`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--app-surface)]/80">
                        {severity.icon}
                      </div>
                      <span className="rounded-full bg-[color:var(--app-surface)]/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                        {insight.severity === "warning"
                          ? tr("Warning", "Warning")
                          : insight.severity === "critical"
                            ? tr("Critical", "Critical")
                            : insight.severity === "watch"
                              ? tr("Watch", "Watch")
                              : tr("Info", "Info")}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[color:var(--app-text)]">
                      {insight.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-[color:var(--app-text-muted)]">
                      {insight.summary}
                    </p>
                    {insight.actionHref && insight.actionLabel ? (
                      <div className="mt-4">
                        <Link
                          href={insight.actionHref}
                          className="inline-flex items-center rounded-full bg-[color:var(--app-surface)]/80 px-3 py-1.5 text-xs font-semibold text-[color:var(--app-text)] transition-colors hover:bg-[color:var(--app-surface)]"
                        >
                          {insight.actionLabel}
                        </Link>
                      </div>
                    ) : null}
                  </article>
                );
              })}
        </div>
      </div>
    </Card>
  );
}
