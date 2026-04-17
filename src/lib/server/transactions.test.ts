import { describe, expect, it } from "vitest";
import {
  parseUiTransactionId,
  validateTransactionMutationInput,
} from "@/lib/server/transactions";

describe("server transactions helpers", () => {
  it("parses both ui-style and numeric transaction identifiers", () => {
    expect(parseUiTransactionId("txn-42")).toBe(42);
    expect(parseUiTransactionId("42")).toBe(42);
    expect(parseUiTransactionId("preview-12")).toBe(12);
    expect(parseUiTransactionId("manual")).toBeNull();
  });

  it("normalizes category and text fields for valid manual transactions", () => {
    expect(
      validateTransactionMutationInput({
        date: "2026-04-17",
        time: "09:45",
        amount: 1200,
        type: "expense",
        category: " อาหาร/เครื่องดื่ม ",
        note: "  กาแฟ  ",
        accountId: 1,
      })
    ).toEqual({
      date: "2026-04-17",
      time: "09:45",
      amount: 1200,
      type: "expense",
      category: "อาหาร/เครื่องดื่ม",
      note: "กาแฟ",
      paymentChannel: undefined,
      payFrom: undefined,
      recipient: undefined,
      tag: undefined,
      accountId: 1,
    });
  });

  it("falls back to the default category for empty category input", () => {
    const result = validateTransactionMutationInput({
      date: "2026-04-17",
      amount: 2500,
      type: "transfer",
    });

    expect(result.category).toBe("ย้ายเงิน");
  });

  it("rejects invalid date, time, and amount values", () => {
    expect(() =>
      validateTransactionMutationInput({
        date: "17/04/2026",
        amount: 100,
        type: "income",
      })
    ).toThrow("กรุณาระบุวันที่ให้ถูกต้อง");

    expect(() =>
      validateTransactionMutationInput({
        date: "2026-04-17",
        time: "9:30",
        amount: 100,
        type: "income",
      })
    ).toThrow("กรุณาระบุเวลาเป็นรูปแบบ HH:MM");

    expect(() =>
      validateTransactionMutationInput({
        date: "2026-04-17",
        amount: 0,
        type: "income",
      })
    ).toThrow("กรุณาระบุจำนวนเงินที่มากกว่า 0");
  });
});
