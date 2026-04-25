"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, ReceiptText, Tags } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useFinanceStore } from "@/store/finance-store";
import { useLanguage, useTr } from "@/lib/i18n";
import {
  getSpendCategoryDrilldownFromTransactions,
  type SpendCategoryDrilldown,
} from "@/lib/dashboard-surface-analytics";
import { formatBaht, formatBahtCompact, formatNumber } from "@/lib/utils";

const CATEGORY_SWATCHES = [
  "#ffe2c9",
  "#ffd0ad",
  "#f9b476",
  "#f0924b",
  "#d47a31",
  "#a85b1f",
  "#7a3d11",
  "#5f2d0d",
];

function buildTransactionsHref(year: number, category: string) {
  const params = new URLSearchParams();
  params.set("year", String(year));
  params.set("type", "expense");
  params.set("category", category);
  return `/transactions?${params.toString()}`;
}

export function SpendingCategoryExplorer() {
  const tr = useTr();
  const language = useLanguage();
  const importedTransactions = useFinanceStore((state) => state.importedTransactions);
  const selectedYear = useFinanceStore((state) => state.selectedYear);
  const categories = useMemo(
    () => getSpendCategoryDrilldownFromTransactions(importedTransactions, selectedYear, 9),
    [importedTransactions, selectedYear]
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(categories[0]?.category ?? null);

  const selected =
    categories.find((category) => category.category === activeCategory) ?? categories[0] ?? null;
  const totalExpense = categories.reduce((sum, category) => sum + category.amount, 0);

  if (categories.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<ReceiptText size={20} />}
          title={tr("ยังไม่มีข้อมูลรายจ่ายแยกหมวด", "No category spending yet")}
          description={tr(
            "เมื่อมีรายการรายจ่ายจริงแล้ว ส่วนนี้จะช่วยสรุปว่าเงินไหลไปหมวดไหนมากที่สุด และหมวดไหนควรตรวจต่อ",
            "Once real expense rows are imported, this area will show where the money is going and which category deserves a closer look."
          )}
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
        <section className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--app-text-subtle)]">
                {tr("Spending · by category", "Spending · by category")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[color:var(--app-text)] sm:text-3xl md:text-4xl">
                {tr("เงินไหลไปไหนบ้าง", "Where the money went")}
              </h2>
            </div>
            <div className="w-full rounded-[20px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-3 text-left sm:w-auto sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--app-text-subtle)]">
                {tr("รวม", "Total")}
              </p>
              <p className="mt-1 break-words font-[family-name:var(--font-geist-mono)] text-xl font-semibold text-[color:var(--app-text)] sm:text-2xl">
                {formatBahtCompact(totalExpense)}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {categories.map((category, index) => {
              const swatch = CATEGORY_SWATCHES[index % CATEGORY_SWATCHES.length];
              const isActive = selected?.category === category.category;

              return (
                <Link
                  key={category.category}
                  href={buildTransactionsHref(selectedYear, category.category)}
                  onMouseEnter={() => setActiveCategory(category.category)}
                  onFocus={() => setActiveCategory(category.category)}
                  className={`block w-full rounded-[24px] border px-5 py-4 text-left transition-all duration-200 ${
                    isActive
                      ? "border-[color:var(--app-border-strong)] bg-[color:var(--app-surface)] shadow-[0_20px_50px_-40px_rgba(18,13,9,0.7)]"
                      : "border-transparent bg-transparent hover:border-[color:var(--app-border)] hover:bg-[color:var(--app-surface)]/72"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <span
                      className="mt-1 h-7 w-7 shrink-0 rounded-xl sm:h-8 sm:w-8"
                      style={{ backgroundColor: swatch }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-medium text-[color:var(--app-text)] sm:text-xl">
                            {category.category}
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
                            {language === "en"
                              ? `${formatNumber(category.count)} transactions`
                            : `${formatNumber(category.count)} รายการ`}
                          </p>
                          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--app-brand-text)] opacity-80">
                            {tr("ดูรายการที่กรองแล้ว", "Open filtered ledger")}
                            <ArrowRight size={12} />
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3 text-left sm:block sm:text-right">
                          <p className="font-[family-name:var(--font-geist-mono)] text-lg font-semibold text-[color:var(--app-text)] sm:text-xl">
                            {formatBahtCompact(category.amount)}
                          </p>
                          <p className="text-sm text-[color:var(--app-text-muted)] sm:mt-1">
                            {(category.share * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color:var(--app-surface-soft)]">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{
                            width: `${Math.max(category.share * 100, 4)}%`,
                            backgroundColor: swatch,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="min-w-0 rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4 sm:p-5">
          {selected ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--app-text-subtle)]">
                {tr("Drilldown", "Drilldown")} / {selected.category}
              </p>
              <div className="mt-3 flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
                <p className="break-words font-[family-name:var(--font-geist-mono)] text-3xl font-semibold leading-none text-[color:var(--app-text)] md:text-5xl">
                  {formatBahtCompact(selected.amount)}
                </p>
                <p className="max-w-full pb-1 text-sm leading-6 text-[color:var(--app-text-muted)]">
                  {tr("เฉลี่ย", "Avg")} {formatBahtCompact(selected.averageAmount)}{" "}
                  {tr("ต่อรายการ", "per transaction")}
                </p>
              </div>

              {selected.topTags.length > 0 ? (
                <div className="mt-5">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--app-text-subtle)]">
                    <Tags size={13} />
                    {tr("Top tags", "Top tags")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.topTags.map((tag) => (
                      <span
                        key={`${selected.category}-${tag.label}`}
                        className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3 py-1.5 text-xs text-[color:var(--app-text-muted)]"
                      >
                        <span className="font-medium text-[color:var(--app-text)]">
                          {tag.label}
                        </span>
                        <span>{formatBahtCompact(tag.amount)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--app-text-subtle)]">
                  <ArrowUpRight size={13} />
                  {tr("Top merchants", "Top merchants")}
                </div>
                <div className="space-y-3">
                  {selected.topMerchants.map((merchant) => (
                    <div key={`${selected.category}-${merchant.label}`}>
                      <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3 text-sm">
                        <span className="truncate text-[color:var(--app-text)]">
                          {merchant.label}
                        </span>
                        <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[color:var(--app-text-muted)]">
                          {formatBahtCompact(merchant.amount)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--app-surface-soft)]">
                        <div
                          className="h-full rounded-full bg-[color:var(--app-brand)]"
                          style={{ width: `${Math.max(merchant.share * 100, 10)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </Card>
  );
}
