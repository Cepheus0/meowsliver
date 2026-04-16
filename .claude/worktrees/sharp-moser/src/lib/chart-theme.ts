import type { CSSProperties } from "react";

export const chartTheme = {
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  tooltipStyle: {
    borderRadius: "16px",
    border: "1px solid var(--chart-tooltip-border)",
    backgroundColor: "var(--chart-tooltip-bg)",
    color: "var(--chart-tooltip-text)",
    boxShadow: "0 24px 55px -28px rgba(15, 23, 42, 0.55)",
    fontSize: "12px",
  } satisfies CSSProperties,
  legendStyle: {
    fontSize: "12px",
    color: "var(--chart-axis)",
  } satisfies CSSProperties,
} as const;
