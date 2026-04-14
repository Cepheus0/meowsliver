import { describe, expect, it } from "vitest";
import { buildImportPreviewResult } from "@/lib/server/import-preview";
import type { PreparedImportRow } from "@/lib/import-pipeline";

describe("import-preview", () => {
  it("marks exact duplicates inside the same upload as duplicate rows", () => {
    const preparedRows: PreparedImportRow[] = [
      {
        rowNumber: 229,
        rawRow: {
          วันที่: "14/02/2026",
          เวลา: "10:45",
          ประเภท: "รายจ่าย",
          หมวดหมู่: "อาหาร",
          จำนวน: "-150",
          โน๊ต: "กาแฟ",
        },
        normalized: {
          date: "2026-02-14",
          time: "10:45",
          amount: 150,
          type: "expense",
          category: "อาหาร",
          note: "กาแฟ",
          paymentChannel: "PromptPay",
          recipient: "Cafe A",
        },
      },
      {
        rowNumber: 232,
        rawRow: {
          วันที่: "14/02/2026",
          เวลา: "10:45",
          ประเภท: "รายจ่าย",
          หมวดหมู่: "อาหาร",
          จำนวน: "-150",
          โน๊ต: "กาแฟ",
        },
        normalized: {
          date: "2026-02-14",
          time: "10:45",
          amount: 150,
          type: "expense",
          category: "อาหาร",
          note: "กาแฟ",
          paymentChannel: "PromptPay",
          recipient: "Cafe A",
        },
      },
    ];

    const result = buildImportPreviewResult(preparedRows, []);

    expect(result.summary.newRows).toBe(1);
    expect(result.summary.duplicateRows).toBe(1);
    expect(result.previewRows).toEqual([
      expect.objectContaining({
        rowNumber: 229,
        previewStatus: "new",
      }),
      expect.objectContaining({
        rowNumber: 232,
        previewStatus: "duplicate",
        reason: "รายการนี้ซ้ำกับแถวที่ 229 ในไฟล์ที่อัปโหลด",
      }),
    ]);
    expect(result.stagedRows[1]).toEqual(
      expect.objectContaining({
        rowNumber: 232,
        previewStatus: "duplicate",
      })
    );
  });

  it("counts transfer rows separately without classifying them as income or expense", () => {
    const preparedRows: PreparedImportRow[] = [
      {
        rowNumber: 12,
        rawRow: {
          วันที่: "09/02/2026",
          เวลา: "12:07",
          ประเภท: "ย้ายเงิน",
          จำนวน: "90000",
          ผู้รับ: "MR. WORAVEE C",
        },
        normalized: {
          date: "2026-02-09",
          time: "12:07",
          amount: 90000,
          type: "transfer",
          category: "ย้ายเงิน",
          paymentChannel: "บัญชี",
          payFrom: "ไทยพาณิชย์",
          recipient: "MR. WORAVEE C",
        },
      },
    ];

    const result = buildImportPreviewResult(preparedRows, []);

    expect(result.summary).toMatchObject({
      readyRows: 1,
      incomeRows: 0,
      expenseRows: 0,
      transferRows: 1,
      newRows: 1,
      totalIncome: 0,
      totalExpense: 0,
      totalTransfer: 90000,
    });
    expect(result.previewRows[0]).toEqual(
      expect.objectContaining({
        rowNumber: 12,
        previewStatus: "new",
        transaction: expect.objectContaining({
          type: "transfer",
          category: "ย้ายเงิน",
        }),
      })
    );
  });
});
