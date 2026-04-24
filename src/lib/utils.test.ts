import { describe, expect, it } from "vitest";
import {
  formatBaht,
  formatPercent,
  formatNumber,
  getMonthLabel,
  getYearRange,
} from "@/lib/utils";

describe("utils", () => {
  it("formats baht and plain numbers with Thai locale separators", () => {
    expect(formatBaht(123456)).toContain("123,456");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formats signed percentages for positive and negative values", () => {
    expect(formatPercent(12.34)).toBe("+12.3%");
    expect(formatPercent(-5.55)).toBe("-5.5%");
  });

  it("builds a descending year range up to the current year", () => {
    const years = getYearRange();

    expect(years[0]).toBe(new Date().getFullYear());
    expect(years.at(-1)).toBe(2015);
    expect(years).toContain(2026);
  });

  it("returns localized month labels", () => {
    expect(getMonthLabel(0, "th")).toBe("ม.ค.");
    expect(getMonthLabel(0, "en")).toBe("Jan");
    expect(getMonthLabel(3, "en", "full")).toBe("April");
  });
});
