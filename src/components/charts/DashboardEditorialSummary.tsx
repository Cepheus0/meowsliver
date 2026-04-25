"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useFinanceStore } from "@/store/finance-store";
import { useLanguage, useTr } from "@/lib/i18n";
import { getSpendCategoryDrilldownFromTransactions } from "@/lib/dashboard-surface-analytics";
import { computeTotals } from "@/lib/monthly-detail-analytics";
import { formatBahtCompact, getMonthLabel } from "@/lib/utils";

function buildTransactionsHref(year: number, category?: string) {
  const params = new URLSearchParams();
  params.set("year", String(year));
  params.set("type", "expense");
  if (category) {
    params.set("category", category);
  }
  return `/transactions?${params.toString()}`;
}

export function DashboardEditorialSummary() {
  const tr = useTr();
  const language = useLanguage();
  const importedTransactions = useFinanceStore((state) => state.importedTransactions);
  const selectedYear = useFinanceStore((state) => state.selectedYear);

  const yearlyTransactions = importedTransactions.filter((transaction) =>
    transaction.date.startsWith(`${selectedYear}-`)
  );
  const totals = computeTotals(yearlyTransactions);
  const categories = getSpendCategoryDrilldownFromTransactions(
    importedTransactions,
    selectedYear,
    5
  );
  const topCategory = categories[0] ?? null;

  const monthlyExpense = Array.from({ length: 12 }, (_, monthIndex) => ({
    monthIndex,
    amount: 0,
    count: 0,
  }));

  for (const transaction of yearlyTransactions) {
    if (transaction.type !== "expense") continue;
    const monthIndex = Number.parseInt(transaction.date.slice(5, 7), 10) - 1;
    const bucket = monthlyExpense[monthIndex];
    if (!bucket) continue;
    bucket.amount += transaction.amount;
    bucket.count += 1;
  }

  const peakMonth = monthlyExpense
    .filter((month) => month.amount > 0)
    .sort((left, right) => right.amount - left.amount)[0];
  const savingsRate = totals.income > 0 ? (totals.net / totals.income) * 100 : 0;
  const isSurplus = totals.net >= 0;
  const categoryName = topCategory?.category ?? tr("ยังไม่มีหมวดรายจ่าย", "no spending category yet");
  const categoryHref = buildTransactionsHref(selectedYear, topCategory?.category);

  if (yearlyTransactions.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--app-brand),transparent)] opacity-50" />
        <div className="flex flex-col gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--app-text-subtle)]">
              <BookOpenText size={14} />
              {tr("EDITORIAL · บทสรุปจากเหมียว", "EDITORIAL · Meowsliver read")}
            </div>
            <h2 className="mt-5 max-w-5xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[color:var(--app-text)] md:text-5xl">
              {isSurplus
                ? tr(
                    `ปี ${selectedYear} คุณยังเหลือเก็บ ${formatBahtCompact(totals.net)} — หมวดที่ควรเฝ้าระวังคือ ${categoryName}`,
                    `${selectedYear} still has ${formatBahtCompact(totals.net)} surplus — keep an eye on ${categoryName}`
                  )
                : tr(
                    `ปี ${selectedYear} เงินคงเหลือติดลบ ${formatBahtCompact(Math.abs(totals.net))} — เริ่มตรวจจาก ${categoryName}`,
                    `${selectedYear} is down ${formatBahtCompact(Math.abs(totals.net))} — start by reviewing ${categoryName}`
                  )}
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <article className="border-t border-[color:var(--app-divider)] pt-5 lg:border-r lg:border-t-0 lg:pr-5">
              <p className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold uppercase tracking-[0.28em] text-[color:var(--expense-text)]">
                Nº 01
              </p>
              <h3 className="mt-4 text-lg font-semibold text-[color:var(--app-text)]">
                {tr("เดือนที่ใช้เยอะสุด", "Highest-spend month")}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--app-text-muted)]">
                {peakMonth
                  ? tr(
                      `${getMonthLabel(peakMonth.monthIndex, language, "full")} ใช้ไป ${formatBahtCompact(peakMonth.amount)} จาก ${peakMonth.count.toLocaleString()} รายการ`,
                      `${getMonthLabel(peakMonth.monthIndex, language, "full")} spent ${formatBahtCompact(peakMonth.amount)} across ${peakMonth.count.toLocaleString()} transactions`
                    )
                  : tr(
                      "ยังไม่มีรายจ่ายในปีนี้ให้เทียบรายเดือน",
                      "No expenses this year to compare by month yet"
                    )}
              </p>
            </article>

            <article className="border-t border-[color:var(--app-divider)] pt-5 lg:border-r lg:border-t-0 lg:pr-5">
              <p className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold uppercase tracking-[0.28em] text-[color:var(--app-brand-text)]">
                Nº 02
              </p>
              <h3 className="mt-4 text-lg font-semibold text-[color:var(--app-text)]">
                {tr("หมวดใช้เยอะสุด", "Largest category")}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--app-text-muted)]">
                {topCategory
                  ? tr(
                      `${topCategory.category} อันดับ 1 ด้วย ${formatBahtCompact(topCategory.amount)} หรือ ${(topCategory.share * 100).toFixed(1)}% ของรายจ่าย`,
                      `${topCategory.category} leads with ${formatBahtCompact(topCategory.amount)}, ${(topCategory.share * 100).toFixed(1)}% of spend`
                    )
                  : tr("ยังไม่มีหมวดที่ต้องตรวจ", "No category to inspect yet")}
              </p>
            </article>

            <article className="border-t border-[color:var(--app-divider)] pt-5 lg:border-t-0">
              <p className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold uppercase tracking-[0.28em] text-[color:var(--income-text)]">
                Nº 03
              </p>
              <h3 className="mt-4 text-lg font-semibold text-[color:var(--app-text)]">
                {tr("สิ่งที่ควรทำต่อ", "Recommended next move")}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[color:var(--app-text-muted)]">
                {tr(
                  "เปิดรายการที่ถูกกรองแล้ว ตรวจร้าน/แท็กที่ซ้ำบ่อย แล้วเลือก 3–5 จุดแรกที่ลดได้จริง",
                  "Open the filtered ledger, inspect repeated merchants/tags, then pick the first 3–5 cuts that are actually actionable."
                )}
              </p>
              <Link
                href={categoryHref}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--app-brand-text)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--app-brand)]"
              >
                {tr("ดูรายการที่เกี่ยวข้อง", "View related transactions")}
                <ArrowRight size={15} />
              </Link>
            </article>
          </div>
        </div>
      </div>
    </Card>
  );
}
