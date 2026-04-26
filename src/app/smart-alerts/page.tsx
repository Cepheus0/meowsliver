"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CircleDot,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useFinanceStore } from "@/store/finance-store";
import { useLanguage, useTr } from "@/lib/i18n";
import {
  buildCashflowForecast,
  buildSmartAlerts,
  type SmartAlert,
} from "@/lib/ai-tools-analytics";
import type { SavingsGoalsPortfolio } from "@/lib/types";
import { formatBahtCompact } from "@/lib/utils";

type AlertFilter = "all" | SmartAlert["kind"];

interface AccountHealthResponse {
  packet?: {
    evidence?: {
      accounts?: Array<{
        accountId: number;
        name: string;
        riskLevel: "info" | "green" | "watch" | "warning" | "critical";
        reconciliationStatus: string;
        storedBalance: number;
        balanceDifference: number;
        linkedTransactionCount: number;
      }>;
    };
  };
}

const FILTERS: Array<{ value: AlertFilter; labelTh: string; labelEn: string }> = [
  { value: "all", labelTh: "ทั้งหมด", labelEn: "All" },
  { value: "action", labelTh: "Action", labelEn: "Action" },
  { value: "warning", labelTh: "Warning", labelEn: "Warning" },
  { value: "goal", labelTh: "Goals", labelEn: "Goals" },
  { value: "insight", labelTh: "Insight", labelEn: "Insight" },
  { value: "forecast", labelTh: "Forecast", labelEn: "Forecast" },
];

function getAlertTone(alert: SmartAlert) {
  if (alert.severity === "critical") {
    return {
      border: "border-[color:var(--expense-text)]",
      text: "text-[color:var(--expense-text)]",
      bg: "bg-[color:var(--expense-soft)]",
    };
  }
  if (alert.severity === "warning") {
    return {
      border: "border-[color:var(--app-brand-border)]",
      text: "text-[color:var(--app-brand-text)]",
      bg: "bg-[color:var(--app-brand-soft)]",
    };
  }
  if (alert.severity === "success") {
    return {
      border: "border-[color:var(--income-text)]",
      text: "text-[color:var(--income-text)]",
      bg: "bg-[color:var(--income-soft)]",
    };
  }
  return {
    border: "border-[color:var(--app-border)]",
    text: "text-[color:var(--app-text-muted)]",
    bg: "bg-[color:var(--app-surface-soft)]",
  };
}

export default function SmartAlertsPage() {
  const tr = useTr();
  const language = useLanguage();
  const transactions = useFinanceStore((state) => state.importedTransactions);
  const accounts = useFinanceStore((state) => state.accounts);
  const selectedYear = useFinanceStore((state) => state.selectedYear);
  const [accountHealth, setAccountHealth] = useState<AccountHealthResponse["packet"] | null>(null);
  const [goals, setGoals] = useState<SavingsGoalsPortfolio | null>(null);
  const [activeFilter, setActiveFilter] = useState<AlertFilter>("all");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();

    async function loadMetricSources() {
      try {
        const [accountResponse, goalsResponse] = await Promise.all([
          fetch("/api/metrics/accounts/health", { signal: controller.signal }),
          fetch("/api/savings-goals", { cache: "no-store", signal: controller.signal }),
        ]);

        if (accountResponse.ok) {
          const data = (await accountResponse.json()) as AccountHealthResponse;
          setAccountHealth(data.packet ?? null);
        }

        if (goalsResponse.ok) {
          const data = (await goalsResponse.json()) as SavingsGoalsPortfolio;
          setGoals(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load smart-alert metric sources", error);
        }
      }
    }

    void loadMetricSources();

    return () => controller.abort();
  }, []);

  const forecast = useMemo(
    () =>
      buildCashflowForecast({
        transactions,
        accounts,
        year: selectedYear,
        horizonDays: 90,
      }),
    [accounts, selectedYear, transactions]
  );
  const alerts = useMemo(
    () =>
      buildSmartAlerts({
        transactions,
        accounts,
        year: selectedYear,
        forecast,
        accountHealth: accountHealth?.evidence?.accounts,
        goals: goals?.goals,
        language,
      }),
    [accountHealth, accounts, forecast, goals, language, selectedYear, transactions]
  );
  const filteredAlerts =
    activeFilter === "all"
      ? alerts
      : alerts.filter((alert) => alert.kind === activeFilter);
  const unreadCount = alerts.filter((alert) => !readIds.has(alert.id)).length;
  const counts = {
    action: alerts.filter((alert) => alert.kind === "action").length,
    warning: alerts.filter((alert) => alert.kind === "warning").length,
    goal: alerts.filter((alert) => alert.kind === "goal").length,
    insight: alerts.filter((alert) => alert.kind === "insight").length,
  };

  return (
    <div className="space-y-6">
      <section className="border-b border-[color:var(--app-divider)] pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--app-text-subtle)]">
              {tr("SMART ALERTS · การแจ้งเตือนอัจฉริยะ", "SMART ALERTS")}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <h1 className="text-5xl font-semibold italic tracking-[-0.06em] text-[color:var(--app-text)] md:text-6xl">
                Smart Alerts
              </h1>
              {unreadCount > 0 ? (
                <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-[color:var(--expense-text)] px-3 font-[family-name:var(--font-geist-mono)] text-sm font-bold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setReadIds(new Set(alerts.map((alert) => alert.id)))}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--app-text-muted)] underline underline-offset-4 hover:text-[color:var(--app-text)]"
            >
              <CheckCheck size={15} />
              {tr("อ่านทั้งหมด", "Mark all read")}
            </button>
            <div className="inline-flex rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-1">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    activeFilter === filter.value
                      ? "bg-[color:var(--app-surface-strong)] text-[color:var(--app-text)] shadow-[var(--app-card-shadow)]"
                      : "text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]"
                  }`}
                >
                  {language === "en" ? filter.labelEn : filter.labelTh}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-[color:var(--app-text-muted)]">Action Required</p>
          <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-3xl font-semibold text-[color:var(--expense-text)]">
            {counts.action}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-[color:var(--app-text-muted)]">Warnings</p>
          <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-3xl font-semibold text-[color:var(--app-brand-text)]">
            {counts.warning}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-[color:var(--app-text-muted)]">Goals</p>
          <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-3xl font-semibold text-[color:var(--income-text)]">
            {counts.goal}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-[color:var(--app-text-muted)]">Insights</p>
          <p className="mt-3 font-[family-name:var(--font-geist-mono)] text-3xl font-semibold text-[color:var(--app-brand)]">
            {counts.insight}
          </p>
        </Card>
      </div>

      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const tone = getAlertTone(alert);
          const isRead = readIds.has(alert.id);
          const content = (
            <article
              className={`group flex min-h-[92px] items-center gap-4 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${tone.border} ${
                isRead ? "opacity-55" : ""
              }`}
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.bg}`}>
                <span className="text-xl">{alert.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!isRead ? (
                    <CircleDot size={10} className={tone.text} />
                  ) : null}
                  <h2 className="truncate text-base font-semibold text-[color:var(--app-text)]">
                    {alert.title}
                  </h2>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-[color:var(--app-text-muted)]">
                  {alert.summary}
                </p>
              </div>
              {alert.amount !== undefined ? (
                <span className="hidden font-[family-name:var(--font-geist-mono)] text-sm text-[color:var(--app-text-muted)] sm:inline">
                  {formatBahtCompact(alert.amount)}
                </span>
              ) : null}
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.bg} ${tone.text}`}>
                {alert.kind}
              </span>
            </article>
          );

          return alert.href ? (
            <Link
              key={alert.id}
              href={alert.href}
              onClick={() =>
                setReadIds((current) => new Set([...current, alert.id]))
              }
              className="block"
            >
              {content}
            </Link>
          ) : (
            <div key={alert.id}>{content}</div>
          );
        })}
      </div>

      {filteredAlerts.length === 0 ? (
        <Card className="text-center">
          <Bell className="mx-auto text-[color:var(--app-text-subtle)]" size={22} />
          <p className="mt-3 font-semibold text-[color:var(--app-text)]">
            {tr("ไม่มี alert ในหมวดนี้", "No alerts in this category")}
          </p>
        </Card>
      ) : null}

      <Card className="border-[color:var(--app-brand-border)] bg-[linear-gradient(135deg,var(--app-brand-soft),var(--app-surface))]">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 text-[color:var(--app-brand-text)]" size={20} />
          <div>
            <p className="font-semibold text-[color:var(--app-text)]">
              {tr("แหล่งข้อมูลที่ใช้สร้าง alerts", "Alert source of truth")}
            </p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--app-text-muted)]">
              {tr(
                "หน้านี้รวม deterministic metrics จาก transactions, account health, savings goals และ forecast 90 วัน โดยไม่แต่งตัวเลขจาก LLM",
                "This page combines deterministic metrics from transactions, account health, savings goals, and the 90-day forecast without LLM-generated numbers."
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
