import { describe, expect, it } from "vitest";
import { buildImportPreviewResult } from "@/lib/server/import-preview";
import type { PreparedImportRow } from "@/lib/import-pipeline";

describe("import-preview", () => {
  it("keeps field-identical rows inside the same upload as distinct new rows", () => {
    // Two rows can legitimately be identical in every field (e.g. two Grab
    // orders placed at the same minute for the same amount). Occurrence-aware
    // fingerprints must treat them as two separate transactions rather than
    // collapsing the second into a duplicate.
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

    expect(result.summary.newRows).toBe(2);
    expect(result.summary.duplicateRows).toBe(0);
    expect(result.previewRows).toEqual([
      expect.objectContaining({ rowNumber: 229, previewStatus: "new" }),
      expect.objectContaining({ rowNumber: 232, previewStatus: "new" }),
    ]);
    // Each row gets a distinct occurrence-aware fingerprint so the UNIQUE
    // constraint on transactions.fingerprint will not collapse them on commit.
    expect(result.stagedRows[0]?.fingerprint).not.toBe(
      result.stagedRows[1]?.fingerprint
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

  it("skips both copies of a duplicated-in-source row when re-importing overlapping months", () => {
    // Simulates the user's real workflow:
    //   Upload 1: Jan — mid-Feb (commits two identical Grab 75฿ rows)
    //   Upload 2: Feb — March (same two Grab 75฿ rows are present again)
    // Both copies must be recognised as duplicates against the DB, not just one.
    const normalized = {
      date: "2026-02-10",
      time: "08:50",
      amount: 75,
      type: "expense" as const,
      category: "อาหาร",
      paymentChannel: "บัตรเครดิต",
      payFrom: "CardX ULTRA PLATINUM",
      recipient: "WWW.GRAB.COM",
    };
    const preparedRows: PreparedImportRow[] = [
      { rowNumber: 100, rawRow: {}, normalized },
      { rowNumber: 101, rawRow: {}, normalized },
    ];

    // First run — no DB rows yet.
    const firstPass = buildImportPreviewResult(preparedRows, []);
    expect(firstPass.summary.newRows).toBe(2);
    expect(firstPass.summary.duplicateRows).toBe(0);

    // Pretend the two rows have been committed to the DB with the occurrence-
    // aware fingerprints the preview produced.
    const now = new Date();
    const existing = firstPass.stagedRows.map((staged, index) => ({
      id: index + 1,
      transactionDate: normalized.date,
      transactionTime: normalized.time,
      amountSatang: 7500,
      type: normalized.type,
      category: normalized.category,
      subcategory: null,
      note: null,
      paymentChannel: normalized.paymentChannel,
      payFrom: normalized.payFrom,
      recipient: normalized.recipient,
      tag: null,
      fingerprint: staged.fingerprint,
      source: "import" as const,
      importRunId: 1,
      accountId: null,
      createdAt: now,
      updatedAt: now,
    }));

    // Second upload contains the same two rows again.
    const secondPass = buildImportPreviewResult(preparedRows, existing);
    expect(secondPass.summary.newRows).toBe(0);
    expect(secondPass.summary.duplicateRows).toBe(2);
  });
});
