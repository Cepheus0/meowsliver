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
});
