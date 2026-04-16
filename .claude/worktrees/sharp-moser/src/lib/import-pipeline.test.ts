import { describe, expect, it } from "vitest";
import type { ColumnMapping, RawRow } from "@/lib/excel-parser";
import {
  buildTransactionFromNormalized,
  prepareImportRows,
  toPreviewTransactionId,
} from "@/lib/import-pipeline";

const mapping: ColumnMapping = {
  date: "วันที่",
  time: "เวลา",
  type: "ประเภท",
  category: "หมวดหมู่",
  tag: "แท็ก",
  amount: "จำนวน",
  note: "โน๊ต",
  paymentChannel: "ช่องทางจ่าย",
  payFrom: "จ่ายจาก",
  recipientBank: "ธนาคารผู้รับ",
  recipient: "ผู้รับ",
};

describe("import-pipeline", () => {
  it("prepares normalized import rows and skips invalid rows", () => {
    const rows: RawRow[] = [
      {
        วันที่: "08/04/2026",
        เวลา: "09:00",
        ประเภท: "รายจ่าย",
        หมวดหมู่: "อาหาร",
        แท็ก: "daily",
        จำนวน: "-120",
        โน้ต: "กาแฟ",
        ช่องทางจ่าย: "PromptPay",
        จ่ายจาก: "KBank",
        ธนาคารผู้รับ: "",
        ผู้รับ: "Cafe A",
      },
      {
        วันที่: "",
        เวลา: "09:00",
        ประเภท: "รายรับ",
        หมวดหมู่: "เงินเดือน",
        แท็ก: "",
        จำนวน: "50000",
        โน้ต: "",
        ช่องทางจ่าย: "",
        จ่ายจาก: "",
        ธนาคารผู้รับ: "",
        ผู้รับ: "",
      },
    ];

    const prepared = prepareImportRows(rows, mapping);

    expect(prepared).toHaveLength(2);
    expect(prepared[0].normalized).toMatchObject({
      date: "2026-04-08",
      time: "09:00",
      amount: 120,
      type: "expense",
      category: "อาหาร",
      paymentChannel: "PromptPay",
      payFrom: "KBank",
      recipient: "Cafe A",
    });
    expect(prepared[1].normalized).toBeUndefined();
    expect(prepared[1].skipReason).toContain("วันที่");
  });

  it("builds UI transactions from normalized rows", () => {
    const transaction = buildTransactionFromNormalized(
      {
        date: "2026-04-08",
        time: "09:00",
        amount: 120,
        type: "expense",
        category: "อาหาร",
        note: "กาแฟ",
        recipient: "Cafe A",
        paymentChannel: "PromptPay",
        payFrom: "KBank",
      },
      toPreviewTransactionId(7)
    );

    expect(transaction.id).toBe("preview-7");
    expect(transaction.time).toBe("09:00");
    expect(transaction.note).toBe("กาแฟ | Cafe A");
    expect(transaction.subcategory).toBe("PromptPay — KBank");
  });

  it("falls back to transfer defaults when the source row is money movement", () => {
    const rows: RawRow[] = [
      {
        วันที่: "09/04/2026",
        เวลา: "12:30",
        ประเภท: "ย้ายเงิน",
        หมวดหมู่: "",
        แท็ก: "",
        จำนวน: "3000",
        โน้ต: "",
        ช่องทางจ่าย: "บัญชี",
        จ่ายจาก: "ไทยพาณิชย์",
        ธนาคารผู้รับ: "",
        ผู้รับ: "WORAVEE C",
      },
    ];

    const prepared = prepareImportRows(rows, mapping);

    expect(prepared[0].normalized).toMatchObject({
      date: "2026-04-09",
      time: "12:30",
      amount: 3000,
      type: "transfer",
      category: "ย้ายเงิน",
      paymentChannel: "บัญชี",
      payFrom: "ไทยพาณิชย์",
      recipient: "WORAVEE C",
    });
  });
});
