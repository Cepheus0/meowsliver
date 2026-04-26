"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  CircleAlert,
  MessageSquare,
  Loader2,
  Send,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AiSummaryRenderer } from "@/components/charts/AiSummaryRenderer";
import { useTr } from "@/lib/i18n";
import { useFinanceStore } from "@/store/finance-store";
import type { AiChatMessage } from "@/lib/ai/types";

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

function getQuickPrompts(language: "th" | "en") {
  if (language === "en") {
    return [
      "What should I look at first this month?",
      "Which category is draining the most cash?",
      "If I need to cut spending now, what 3 moves should I start with?",
      "Which tag or habit shows up most often in spending?",
      "How far am I from a positive savings rate?",
      "Which account or caveat makes this read less trustworthy?",
      "What is the biggest risk to my goals right now?",
      "Summarize the dashboard in plain English.",
    ];
  }

  return [
    "เดือนนี้ควรดูเรื่องไหนก่อน?",
    "หมวดไหนกำลังกินเงินมากที่สุด?",
    "ถ้าจะลดรายจ่ายตอนนี้ ควรเริ่ม 3 เรื่องไหนก่อน?",
    "tag หรือพฤติกรรมไหนโผล่บ่อยสุดในรายจ่าย?",
    "ต้องเพิ่มอีกเท่าไหร่ถึงจะกลับมาออมเป็นบวก?",
    "มี caveat หรือบัญชีไหนที่ทำให้ภาพรวมยังไม่น่าไว้ใจ?",
    "เป้าหมายไหนเสี่ยงสุดตอนนี้?",
    "ช่วยสรุป dashboard แบบสั้นและตรงประเด็น",
  ];
}

export function DashboardAiConsole() {
  const tr = useTr();
  const { selectedYear, language } = useFinanceStore();
  const [health, setHealth] = useState<AiHealthResponse["health"] | null>(null);
  const [aiInsight, setAiInsight] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const fabDragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const fabHasDragged = useRef(false);
  const [fabPos, setFabPos] = useState<{ left: number; top: number } | null>(null);

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
          `/api/ai/insights/dashboard?year=${selectedYear}&date=${getTodayIsoDate()}&language=${language}`,
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
  }, [selectedYear, language, tr]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isDrawerOpen, messages, isSending]);

  async function sendQuestion(question: string) {
    const cleanedQuestion = question.trim();
    if (!cleanedQuestion || isSending) {
      return;
    }

    const nextMessages: AiChatMessage[] = [
      ...messages,
      { role: "user", content: cleanedQuestion },
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
          language,
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendQuestion(draft);
  }

  const modelLabel =
    health?.model ?? tr("ยังไม่พบ model ที่โหลดไว้", "No loaded model detected");
  const quickPrompts = useMemo(() => getQuickPrompts(language), [language]);
  const assistantMessages = messages.filter((message) => message.role === "assistant");

  function handleQuickPrompt(prompt: string) {
    void sendQuestion(prompt);
  }

  return (
    <>
      <Card className="animate-fade-slide-up anim-delay-2 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[color:var(--app-divider)] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--app-text-subtle)]">
              <Sparkles size={14} />
              {tr("AI summary", "AI summary")}
            </div>
            <h2 className="mt-2 text-3xl font-semibold text-[color:var(--app-text)] md:text-4xl">
              {tr("สรุปจาก dashboard ล่าสุด", "Summary from the latest dashboard")}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--app-text-muted)]">
              {tr(
                "สรุปนี้อ่านจาก metrics จริงของปีที่เลือก และจะเปลี่ยนภาษาให้ตรงกับ UI ที่กำลังใช้อยู่",
                "This summary reads from the selected year's real metrics and follows the current UI language."
              )}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-3 py-1.5 text-xs text-[color:var(--app-text-muted)]">
            {health?.ok ? <Bot size={13} /> : <WifiOff size={13} />}
            {health?.ok
              ? tr("Local model ready", "Local model ready")
              : tr("Local model offline", "Local model offline")}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)]">
          <div className="border-b border-[color:var(--app-divider)] px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--app-text-muted)]">
              <span className="rounded-full bg-[color:var(--app-surface-soft)] px-3 py-1">
                FY {selectedYear}
              </span>
              <span className="rounded-full bg-[color:var(--app-surface-soft)] px-3 py-1">
                {isHealthLoading && !health
                  ? tr("กำลังตรวจสอบ model", "Checking model")
                  : modelLabel}
              </span>
              <span className="rounded-full bg-[color:var(--app-surface-soft)] px-3 py-1">
                {tr("ใช้เฉพาะ metrics และ caveats", "Grounded in metrics and caveats only")}
              </span>
            </div>
          </div>

          <div className="px-5 py-5">
            {isInsightLoading ? (
              <span className="inline-flex items-center gap-2 text-[color:var(--app-text-muted)]">
                <Loader2 className="animate-spin" size={16} />
                {tr("กำลังให้ agent อ่าน metrics", "Asking the agent to read the metrics")}
              </span>
            ) : aiInsight ? (
              <AiSummaryRenderer content={aiInsight} />
            ) : (
              <span className="text-sm text-[color:var(--app-text-muted)]">
                {health?.ok
                  ? tr("ยังไม่มี AI summary", "No AI summary yet")
                  : tr("เปิด LM Studio เพื่อสร้าง AI summary", "Start LM Studio to generate the AI summary")}
              </span>
            )}
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2 rounded-[20px] border border-[color:var(--expense-text)]/25 bg-[color:var(--expense-soft)] p-3 text-sm text-[color:var(--expense-text)]">
            <CircleAlert size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : null}
      </Card>

      {!isDrawerOpen ? (
        <div
          className="fixed z-40 group"
          style={fabPos ? { left: fabPos.left, top: fabPos.top } : { bottom: "6rem", right: "1rem" }}
        >
          <button
            ref={fabRef}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              const rect = fabRef.current!.getBoundingClientRect();
              fabDragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top };
              fabHasDragged.current = false;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!fabDragRef.current) return;
              const dx = e.clientX - fabDragRef.current.startX;
              const dy = e.clientY - fabDragRef.current.startY;
              if (!fabHasDragged.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) fabHasDragged.current = true;
              if (fabHasDragged.current) {
                setFabPos({
                  left: Math.max(0, Math.min(window.innerWidth - 40, fabDragRef.current.startLeft + dx)),
                  top: Math.max(0, Math.min(window.innerHeight - 40, fabDragRef.current.startTop + dy)),
                });
              }
            }}
            onPointerUp={() => {
              if (!fabHasDragged.current) setIsDrawerOpen(true);
              fabDragRef.current = null;
              fabHasDragged.current = false;
            }}
            className="flex h-10 w-10 cursor-grab select-none items-center justify-center rounded-full border border-[color:var(--app-brand-border)] bg-[color:var(--app-brand)] text-white shadow-[0_8px_24px_-8px_var(--app-brand-shadow)] transition-colors hover:bg-[color:var(--app-brand-hover)] active:cursor-grabbing"
            aria-label={tr("เปิด AI agent", "Open AI agent")}
          >
            <MessageSquare size={16} />
          </button>
          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[color:var(--app-text)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--app-bg)] opacity-0 transition-opacity group-hover:opacity-100">
            {tr("คุยกับ Agent", "Ask Agent")}
          </span>
        </div>
      ) : null}

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-[60] bg-[rgba(12,10,8,0.58)] backdrop-blur-sm">
          <div className="flex h-full items-end justify-end p-0 md:p-6">
            <section className="flex h-[min(86vh,860px)] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-bg-elevated)] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.85)] md:h-full md:rounded-[28px]">
              <div className="flex items-start justify-between gap-4 border-b border-[color:var(--app-divider)] px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] text-[color:var(--app-brand)]">
                    <Bot size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--app-text)]">
                      {tr("Agent · เหมียวเงิน", "Agent · Meowsliver")}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[color:var(--income-text)]" />
                      {health?.ok
                        ? tr("ผู้ช่วยการเงิน · online", "Financial assistant · online")
                        : tr("รอ local model อยู่", "Waiting for local model")}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="rounded-full border border-[color:var(--app-border)] p-2 text-[color:var(--app-text-muted)] transition-colors hover:text-[color:var(--app-text)]"
                  aria-label={tr("ปิด AI agent", "Close AI agent")}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="rounded-[24px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-5">
                  <p className="text-base leading-8 text-[color:var(--app-text)]">
                    {tr(
                      "สวัสดีค่ะ เราคือเหมียว ผู้ช่วยการเงินของคุณ ถามจากตัวเลขจริงใน dashboard ได้ทันที เช่น เดือนนี้ใช้เกินหรือยัง ควรลดตรงไหนก่อน และเป้าหมายไหนเสี่ยงสุด",
                      "Hi, I'm your finance agent. Ask from the live dashboard numbers right away, like whether you're overspending, what to cut first, or which goal is under pressure."
                    )}
                  </p>
                </div>

                <div className="mt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--app-text-subtle)]">
                    {tr("Try asking", "Try asking")}
                  </p>
                  <div className="mt-3 space-y-3">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleQuickPrompt(prompt)}
                        disabled={!health?.ok || isSending}
                        className="flex w-full items-center justify-between rounded-[20px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-3 text-left text-sm text-[color:var(--app-text)] transition-all duration-200 hover:border-[color:var(--app-brand-border)] hover:bg-[color:var(--app-brand-soft)] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <span>{prompt}</span>
                        <ArrowUpRight size={15} className="shrink-0 text-[color:var(--app-text-subtle)]" />
                      </button>
                    ))}
                  </div>
                </div>

                {messages.length > 0 ? (
                  <div className="mt-6 space-y-3">
                    {messages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}-${message.content.slice(0, 16)}`}
                        className={`rounded-[22px] border px-4 py-3 ${
                          message.role === "user"
                            ? "ml-8 border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] text-[color:var(--app-text)]"
                            : "mr-8 border-[color:var(--app-border)] bg-[color:var(--app-surface)] text-[color:var(--app-text)]"
                        }`}
                      >
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--app-text-subtle)]">
                          {message.role === "user" ? tr("คุณ", "You") : tr("เหมียวเงิน", "Meowsliver")}
                        </p>
                        {message.role === "assistant" ? (
                          <AiSummaryRenderer content={message.content} />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                        )}
                      </div>
                    ))}
                    <div ref={threadEndRef} />
                  </div>
                ) : null}

                {!isHealthLoading && !health?.ok ? (
                  <div className="mt-6 flex gap-3 rounded-[22px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4">
                    <WifiOff
                      className="mt-0.5 shrink-0 text-[color:var(--app-text-muted)]"
                      size={18}
                    />
                    <div className="text-sm text-[color:var(--app-text-muted)]">
                      <p className="font-semibold text-[color:var(--app-text)]">
                        {tr("LM Studio ยังไม่พร้อม", "LM Studio is not ready")}
                      </p>
                      <p className="mt-1 leading-6">
                        {tr(
                          "เปิด Local Server, โหลด model แล้วกลับมาคุยต่อได้ทันที",
                          "Start the Local Server, load a model, then come back and continue the chat."
                        )}
                      </p>
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-6 flex items-start gap-2 rounded-[20px] border border-[color:var(--expense-text)]/25 bg-[color:var(--expense-soft)] p-3 text-sm text-[color:var(--expense-text)]">
                    <CircleAlert size={16} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[color:var(--app-divider)] px-5 py-4">
                <form onSubmit={handleSubmit}>
                  <div className="flex items-end gap-3">
                    <textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      disabled={!health?.ok || isSending}
                      rows={2}
                      className="min-h-[68px] flex-1 resize-none rounded-[20px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-3 text-sm leading-6 text-[color:var(--app-text)] outline-none transition-all placeholder:text-[color:var(--app-text-subtle)] focus:border-[color:var(--app-brand-border)] focus:bg-[color:var(--app-surface-soft)] focus:placeholder-transparent"
                      placeholder={tr("ถามเหมียวจากตัวเลขตอนนี้...", "Ask the agent from the current metrics...")}
                    />
                    <button
                      type="submit"
                      disabled={!health?.ok || !draft.trim() || isSending}
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[color:var(--app-brand)] text-white shadow-[0_18px_28px_-20px_var(--app-brand-shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--app-brand-hover)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                      aria-label={tr("ส่งคำถาม", "Send question")}
                    >
                      {isSending ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>
                </form>

                <p className="mt-3 text-xs leading-5 text-[color:var(--app-text-muted)]">
                  {tr(
                    "agent นี้เห็นเฉพาะ metrics/caveats ของ dashboard และไม่ดึง raw transaction history ทั้งก้อนออกไป",
                    "This agent only sees dashboard metrics and caveats. It does not send the full raw transaction history."
                  )}
                </p>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
