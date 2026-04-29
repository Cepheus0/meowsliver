"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useFinanceStore } from "@/store/finance-store";
import { useLanguage, useTr } from "@/lib/i18n";
import { getExpenseHeatmapFromTransactions } from "@/lib/dashboard-surface-analytics";
import { formatBahtCompact, getMonthLabel } from "@/lib/utils";

const HEAT_COLORS = [
  "color-mix(in_srgb,var(--app-text-muted)_22%,var(--app-surface)_78%)",
  "#4c2d18",
  "#7a411d",
  "#a3541f",
  "#d66a1e",
  "#ff6b0b",
];

function formatHeatmapDate(date: string, language: "th" | "en") {
  const [year, month, day] = date.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) {
    return date;
  }

  if (language === "en") {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return `${day} ${getMonthLabel(month - 1, language, "full")} ${year}`;
}

export function DashboardCalendarHeatmap() {
  const tr = useTr();
  const language = useLanguage();
  const importedTransactions = useFinanceStore((state) => state.importedTransactions);
  const selectedYear = useFinanceStore((state) => state.selectedYear);
  const cells = useMemo(
    () => getExpenseHeatmapFromTransactions(importedTransactions, selectedYear),
    [importedTransactions, selectedYear]
  );
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const defaultSelectedDate = useMemo(() => {
    const latestSpendDay = [...cells]
      .reverse()
      .find((cell) => cell.amount > 0);
    return latestSpendDay?.date ?? cells.at(-1)?.date ?? null;
  }, [cells]);
  const [selectedDate, setSelectedDate] = useState<string | null>(defaultSelectedDate);
  const selectedCell =
    cells.find((cell) => cell.date === selectedDate) ??
    cells.find((cell) => cell.date === defaultSelectedDate) ??
    null;
  const hoveredCell = hoveredDate ? cells.find((cell) => cell.date === hoveredDate) ?? null : null;
  const focused = hoveredCell ?? selectedCell;

  useEffect(() => {
    setSelectedDate(defaultSelectedDate);
  }, [defaultSelectedDate]);

  const groupedWeeks = useMemo(() => {
    const weeks = new Map<number, typeof cells>();
    for (const cell of cells) {
      const bucket = weeks.get(cell.weekIndex) ?? [];
      bucket.push(cell);
      weeks.set(cell.weekIndex, bucket);
    }

    return [...weeks.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([, weekCells]) => weekCells.sort((left, right) => left.dayOfWeek - right.dayOfWeek));
  }, [cells]);

  if (cells.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarDays size={20} />}
          title={tr("ยังไม่มีข้อมูล heatmap การใช้จ่าย", "No spending heatmap yet")}
          description={tr(
            "เมื่อมีรายการรายจ่ายจริงแล้ว heatmap จะช่วยให้เห็นว่าวันไหนใช้เงินหนักที่สุด",
            "Once real expense rows exist, the heatmap will show which days carried the heaviest spending."
          )}
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: stable title — never changes size */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[color:var(--app-text-subtle)]">
            {tr("Calendar heatmap", "Calendar heatmap")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[color:var(--app-text)] md:text-4xl">
            {tr("ใช้หนักวันไหน", "Daily spend map")}
          </h2>
        </div>

        {/* Right: legend + fixed-size info card (h/w never change → grid never shifts) */}
        <div className="flex shrink-0 flex-col items-end gap-3">
          <div className="flex items-center gap-2 text-sm text-[color:var(--app-text-muted)]">
            <span>{tr("ศูนย์", "Zero")}</span>
            {HEAT_COLORS.map((color, index) => (
              <span
                key={index}
                className="h-4 w-4 rounded-[5px] border border-[color:var(--app-border)]"
                style={{ backgroundColor: color }}
              />
            ))}
            <span>{tr("มาก", "High")}</span>
          </div>
          <div className="flex h-[72px] w-52 flex-col justify-center rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4">
            {selectedCell ? (
              <>
                <p className="text-[11px] font-semibold text-[color:var(--app-text-subtle)]">
                  {formatHeatmapDate(selectedCell.date, language)}
                </p>
                <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-xl font-semibold text-[color:var(--app-text)]">
                  {formatBahtCompact(selectedCell.amount)}
                </p>
              </>
            ) : (
              <p className="text-sm leading-5 text-[color:var(--app-text-muted)]">
                {tr("คลิกวันที่เพื่อดูยอดใช้จ่าย", "Click a day to pin the spend")}
              </p>
            )}
          </div>
          {hoveredCell && hoveredCell.date !== selectedCell?.date ? (
            <p className="max-w-52 text-right text-xs text-[color:var(--app-text-muted)]">
              {formatHeatmapDate(hoveredCell.date, language)} · {formatBahtCompact(hoveredCell.amount)}
            </p>
          ) : (
            <p className="max-w-52 text-right text-xs text-[color:var(--app-text-subtle)]">
              {tr("คลิกเพื่อปักหมุดวัน", "Click to pin a day")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-2">
        <div className="inline-flex gap-1.5">
          {groupedWeeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-rows-7 gap-1.5">
              {Array.from({ length: 7 }).map((_, dayOfWeek) => {
                const cell = week.find((item) => item.dayOfWeek === dayOfWeek) ?? null;

                if (!cell) {
                  return <span key={dayOfWeek} className="h-4 w-4 rounded-[5px] opacity-0" />;
                }

                const isFocused = focused?.date === cell.date;

                return (
                  <button
                    key={cell.date}
                    type="button"
                    onMouseEnter={() => setHoveredDate(cell.date)}
                    onMouseLeave={() => setHoveredDate(null)}
                    onFocus={() => setHoveredDate(cell.date)}
                    onBlur={() => setHoveredDate(null)}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`h-4 w-4 rounded-[5px] border transition-transform duration-150 ${
                      isFocused
                        ? "scale-110 border-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.28)]"
                        : cell.level === 0
                          ? "border-[color:var(--app-border)]"
                          : "border-transparent"
                    }`}
                    style={{
                      backgroundColor: HEAT_COLORS[cell.level],
                    }}
                    aria-label={`${formatHeatmapDate(cell.date, language)} ${formatBahtCompact(cell.amount)}`}
                    title={`${formatHeatmapDate(cell.date, language)} • ${formatBahtCompact(cell.amount)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
