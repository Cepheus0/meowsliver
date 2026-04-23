"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, CircleAlert, Loader2, Send, Sparkles, WifiOff, AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTr } from "@/lib/i18n";
import { useFinanceStore } from "@/store/finance-store";
import type { AiChatMessage } from "@/lib/ai/types";

function AiSummaryContent({ content }: { content: string }) {
  // Parse AI summary into structured sections
  const sections = content.split(/\n(?=###|##|\*\*|Highlights|Risks|Next Actions)/i).filter(Boolean);
  
  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const trimmed = section.trim();
        if (!trimmed) return null;
        
        // Check for section headers
        const isHighlights = /^(###|##|\*\*)?\s*Highlights|highlights/i.test(trimmed);
        const isRisks = /^(###|##|\*\*)?\s*Risks|risks/i.test(trimmed);
        const isNextActions = /^(###|##|\*\*)?\s*Next Actions|next actions/i.test(trimmed);
        
        const icon = isHighlights ? <CheckCircle2 size={16} className="text-[color:var(--income-text)]" /> 
                   : isRisks ? <AlertCircle size={16} className="text-[color:var(--expense-text)]" />
                   : isNextActions ? <Zap size={16} className="text-[color:var(--app-brand-text)]" />
                   : null;
        
        // Extract bullet points
        const lines = trimmed.split('\n').filter(line => line.trim());
        const headerLine = lines[0];
        const bullets = lines.slice(1).filter(line => /^[*\-•]/.test(line.trim()));
        
        return (
          <div key={idx} className="space-y-2">
            {(isHighlights || isRisks || isNextActions) && (
              <div className="flex items-center gap-2">
                {icon}
                <h4 className="font-semibold text-[color:var(--app-text)]">
                  {headerLine.replace(/^(###|##|\*\*|[*\-•])?\s*/, '').replace(/\*\*$/g, '')}
                </h4>
              </div>
            )}
            {bullets.length > 0 ? (
              <ul className="space-y-1.5 ml-6">
                {bullets.map((bullet, bIdx) => (
                  <li key={bIdx} className="text-sm text-[color:var(--app-text)] before:content-['•'] before:mr-2 before:text-[color:var(--app-text-muted)]">
                    {bullet.replace(/^[*\-•]\s*/, '')}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[color:var(--app-text)]">{trimmed}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface AiHealthResponse {
  health?: {
    ok: boolean;
    baseUrl: string;
    model?: string;
    availableModels: string[];
    error?: string;
  };
}

interface AiInsightResponse {
  insight?: string;
  model?: string;
  context?: {
    caveats?: string[];
  };
  error?: string;
  detail?: string;
}

interface AiChatResponse {
  message?: AiChatMessage;
  model?: string;
  error?: string;
  detail?: string;
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultQuestion(language: "th" | "en") {
  return language === "th"
    ? "จากตัวเลขตอนนี้ ควรดูเรื่องไหนก่อน?"
    : "Based on the current metrics, what should I look at first?";
}

export function DashboardAiConsole() {
  const tr = useTr();
  const { selectedYear, language } = useFinanceStore();
  const [health, setHealth] = useState<AiHealthResponse["health"] | null>(null);
  const [aiInsight, setAiInsight] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [draft, setDraft] = useState(defaultQuestion(language));
  const [error, setError] = useState<string | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setDraft(defaultQuestion(language));
  }, [language]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHealthAndInsight() {
      try {
        const healthResponse = await fetch("/api/ai/health", {
          signal: controller.signal,
        });
        const healthData = (await healthResponse.json()) as AiHealthResponse;
        const nextHealth = healthData.health ?? null;
        setHealth(nextHealth);

        if (!nextHealth?.ok) {
          return;
        }

        setIsInsightLoading(true);
        const insightResponse = await fetch(
          `/api/ai/insights/dashboard?year=${selectedYear}&date=${getTodayIsoDate()}`,
          { signal: controller.signal }
        );
        const insightData = (await insightResponse.json()) as AiInsightResponse;
        if (!insightResponse.ok) {
          setError(insightData.error ?? tr("เรียก AI insight ไม่สำเร็จ", "AI insight failed"));
          return;
        }

        setAiInsight(insightData.insight ?? "");
      } catch (nextError) {
        if (!controller.signal.aborted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : tr("เชื่อมต่อ AI ไม่สำเร็จ", "Unable to connect to AI")
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsHealthLoading(false);
          setIsInsightLoading(false);
        }
      }
    }

    void loadHealthAndInsight();

    return () => controller.abort();
  }, [selectedYear, tr]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || isSending) {
      return;
    }

    const nextMessages: AiChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          date: getTodayIsoDate(),
          messages: nextMessages,
        }),
      });
      const data = (await response.json()) as AiChatResponse;

      if (!response.ok || !data.message) {
        setError(data.error ?? tr("AI chat ตอบกลับไม่สำเร็จ", "AI chat failed"));
        return;
      }

      setMessages([...nextMessages, data.message]);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : tr("AI chat ตอบกลับไม่สำเร็จ", "AI chat failed")
      );
    } finally {
      setIsSending(false);
    }
  }

  const modelLabel =
    health?.model ?? tr("ยังไม่พบ model ที่โหลดไว้", "No loaded model detected");

  return (
    <Card className="animate-fade-slide-up anim-delay-2 overflow-hidden">
          <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex min-h-[280px] flex-col justify-between rounded-[22px] border border-[color:var(--app-brand-border)] bg-[linear-gradient(135deg,var(--app-brand-soft)_0%,transparent_72%)] p-5">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-brand-border)] bg-[color:var(--app-surface)] px-3 py-1 text-xs font-semibold text-[color:var(--app-brand-text)]">
                <Bot size={14} />
                {tr("Local CFO copilot", "Local CFO copilot")}
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                  health?.ok
                    ? "bg-[color:var(--income-soft)] text-[color:var(--income-text)]"
                    : "bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)]"
                }`}
              >
                {health?.ok ? "ready" : "offline"}
              </span>
            </div>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--app-text)]">
              {tr("คุยกับตัวเลข โดยให้ metrics เป็นแหล่งความจริง", "Chat with your metrics as the source of truth")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--app-text-muted)]">
              {tr(
                "AI route จะส่งเฉพาะ metric packets และ caveats ให้ LM Studio ไม่ส่ง raw transaction history ทั้งก้อน",
                "The AI route sends metric packets and caveats to LM Studio, not the full raw transaction history."
              )}
            </p>

            <div className="mt-5 space-y-2 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4 text-xs text-[color:var(--app-text-muted)]">
              <p>
                <span className="font-semibold text-[color:var(--app-text)]">
                  Base URL:
                </span>{" "}
                {health?.baseUrl ?? "http://localhost:1234/v1"}
              </p>
              <p>
                <span className="font-semibold text-[color:var(--app-text)]">
                  Model:
                </span>{" "}
                {isHealthLoading ? tr("กำลังตรวจสอบ", "Checking") : modelLabel}
              </p>
            </div>
          </div>

          {!isHealthLoading && !health?.ok ? (
            <div className="mt-5 flex gap-3 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-4">
              <WifiOff className="mt-0.5 shrink-0 text-[color:var(--app-text-muted)]" size={18} />
              <div className="text-sm text-[color:var(--app-text-muted)]">
                <p className="font-semibold text-[color:var(--app-text)]">
                  {tr("LM Studio ยังไม่พร้อม", "LM Studio is not ready")}
                </p>
                <p className="mt-1">
                  {tr(
                    "เปิด Local Server, โหลด model แล้ว refresh หน้า dashboard นี้อีกครั้ง",
                    "Start the Local Server, load a model, then refresh this dashboard."
                  )}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col rounded-[22px] border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-4 min-h-[280px]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--app-text-subtle)]">
                <Sparkles size={14} />
                {tr("AI summary", "AI summary")}
              </div>
              <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
                {tr("สรุปจาก dashboard context ล่าสุด", "Generated from the latest dashboard context")}
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-[120px] max-h-[240px] overflow-y-auto rounded-2xl bg-[color:var(--app-surface)] p-4 text-sm leading-6 text-[color:var(--app-text)] space-y-2">
            {isInsightLoading ? (
              <span className="inline-flex items-center gap-2 text-[color:var(--app-text-muted)]">
                <Loader2 className="animate-spin" size={16} />
                {tr("กำลังให้ LM Studio อ่าน metrics", "Asking LM Studio to read the metrics")}
              </span>
            ) : aiInsight ? (
              <AiSummaryContent content={aiInsight} />
            ) : (
              <span className="text-[color:var(--app-text-muted)]">
                {health?.ok
                  ? tr("ยังไม่มี AI summary", "No AI summary yet")
                  : tr("เปิด LM Studio เพื่อใช้งาน AI summary", "Start LM Studio to enable AI summary")}
              </span>
            )}
          </div>

          <div className="mt-3 space-y-2 flex-1 overflow-y-auto max-h-[120px]">
            {messages.slice(-2).map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                className={`rounded-2xl px-3 py-2 text-xs leading-5 ${
                  message.role === "user"
                    ? "ml-8 bg-[color:var(--app-brand-soft)] text-[color:var(--app-text)] whitespace-pre-wrap break-words"
                    : "mr-8 bg-[color:var(--app-surface)] text-[color:var(--app-text-muted)] whitespace-pre-wrap break-words"
                }`}
              >
                {message.content}
              </div>
            ))}

            {error ? (
              <div className="flex items-start gap-2 rounded-2xl border border-[color:var(--expense-text)]/25 bg-[color:var(--expense-soft)] p-3 text-sm text-[color:var(--expense-text)]">
                <CircleAlert size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={!health?.ok || isSending}
                rows={2}
                className="min-h-12 flex-1 resize-none rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-3 text-sm text-[color:var(--app-text)] outline-none transition-colors placeholder:text-[color:var(--app-text-subtle)] focus:border-[color:var(--app-brand-border)]"
                placeholder={tr("ถามจาก metrics ตอนนี้...", "Ask about the current metrics...")}
              />
              <button
                type="submit"
                disabled={!health?.ok || !draft.trim() || isSending}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--app-brand)] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--app-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                aria-label={tr("ส่งคำถาม", "Send question")}
              >
                {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </section>
      </div>
    </Card>
  );
}
