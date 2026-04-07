import { describe, expect, it } from "vitest";
import {
  DEFAULT_GOAL_COLOR,
  formatGoalDate,
  getEntrySignedAmount,
  getGoalPreset,
  sanitizeGoalColor,
} from "@/lib/savings-goals";

describe("savings-goals helpers", () => {
  it("returns presets for known categories", () => {
    const preset = getGoalPreset("retirement");

    expect(preset).toMatchObject({
      category: "retirement",
      icon: "🌅",
    });
  });

  it("sanitizes colors and falls back to the default token", () => {
    expect(sanitizeGoalColor("#10b981")).toBe("#10b981");
    expect(sanitizeGoalColor("green")).toBe(DEFAULT_GOAL_COLOR);
    expect(sanitizeGoalColor(undefined)).toBe(DEFAULT_GOAL_COLOR);
  });

  it("returns signed amounts that match entry semantics", () => {
    expect(getEntrySignedAmount("contribution", 1000)).toBe(1000);
    expect(getEntrySignedAmount("growth", 250)).toBe(250);
    expect(getEntrySignedAmount("withdrawal", 250)).toBe(-250);
    expect(getEntrySignedAmount("adjustment", -125)).toBe(-125);
  });

  it("formats goal dates with Thai locale output", () => {
    expect(formatGoalDate("2030-12-31")).toContain("31");
    expect(formatGoalDate()).toBe("ยังไม่กำหนด");
  });
});
