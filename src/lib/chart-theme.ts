import type { CSSProperties } from "react";

// ─────────────────────────────────────────────────────────────
// Chart theme — Design System: Warm Editorial (Cursor-inspired)
// All colors reference CSS variables so light/dark is automatic.
// ─────────────────────────────────────────────────────────────

export const chartTheme = {
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  tooltipStyle: {
    borderRadius: "6px",
    border: "1px solid var(--chart-tooltip-border)",
    backgroundColor: "var(--chart-tooltip-bg)",
    color: "var(--chart-tooltip-text)",
    boxShadow: "0 4px 12px rgba(38, 37, 30, 0.08)",
    fontSize: "12px",
    padding: "8px 12px",
  } satisfies CSSProperties,
  legendStyle: {
    fontSize: "12px",
    color: "var(--chart-axis)",
  } satisfies CSSProperties,
} as const;

// ─────────────────────────────────────────────────────────────
// Chart Color Contract — 3-color semantic rule:
//
//   green  → income, positive cashflow, growth  (Cursor success)
//   red    → expense, negative cashflow, debt   (Cursor error)
//   stone  → neutral/derived metrics (net line, savings rate,
//              any non-income/expense data)
//
// NEVER use blue, teal, or purple for semantic data.
// chartColors.categories uses warm amber monochrome for
// allocation pies — cohesive with the orange brand accent.
// ─────────────────────────────────────────────────────────────

export const chartColors = {
  /** รายรับ — income bars, positive indicators */
  income: "var(--income)",

  /** รายจ่าย — expense bars, negative indicators */
  expense: "var(--expense)",

  /**
   * เส้นสุทธิ — net cashflow line.
   * Warm stone — neutral, doesn't compete with income/expense bars.
   */
  net: "#8c8a84",

  /** ออมเป้า — savings goal progress bars */
  savings: "var(--income)",

  /**
   * Allocation pie / category breakdown — warm amber monochrome.
   * Sorted darkest→lightest so the biggest slice is most prominent.
   * Recharts picks by index order.
   */
  categories: [
    "#7c2d12", // orange-950 — slot 0 (largest slice)
    "#9a3a16", // deep copper
    "#b84d22", // rust
    "#d9622f", // warm orange
    "#f07843", // medium orange
    "#f5a070", // light salmon
    "#f8c4a0", // pale peach
    "#fde4cc", // cream — slot 7 (smallest slice)
  ],

  /**
   * Neutral standalone metric (Savings Rate %, benchmark lines).
   * Orange brand — the single accent for non-semantic data.
   */
  metric: "var(--app-brand-text)",
} as const;
