import { describe, expect, it } from "vitest";
import {
  detectMeowjotFormat,
  normalizeDate,
  resolveTransactionType,
} from "@/lib/excel-parser";

describe("excel-parser", () => {
  it("detects meowjot exports with strong confidence", () => {
    const columns = [
      "วันที่",
      "ประเภท",
      "หมวดหมู่",
      "จำนวน",
      "โน้ต",
      "ผู้รับ",
    ];

    const result = detectMeowjotFormat(columns);

    expect(result.isMeowjot).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.autoMapping.date).toBe("วันที่");
    expect(result.autoMapping.amount).toBe("จำนวน");
  });

  it("normalizes supported date formats into ISO strings", () => {
    expect(normalizeDate("2026-04-08T09:30:00")).toBe("2026-04-08");
    expect(normalizeDate("8/4/2026")).toBe("2026-04-08");
    expect(normalizeDate("08-04-2026")).toBe("2026-04-08");
  });

  it("keeps unknown values unchanged when date normalization cannot parse", () => {
    expect(normalizeDate("not-a-date")).toBe("not-a-date");
    expect(normalizeDate("")).toBe("");
  });

  it("resolves transaction type from labels before falling back to amount sign", () => {
    expect(resolveTransactionType("รายรับ", -500)).toBe("income");
    expect(resolveTransactionType("expense", 500)).toBe("expense");
    expect(resolveTransactionType("", 20)).toBe("income");
    expect(resolveTransactionType("", -20)).toBe("expense");
  });
});
