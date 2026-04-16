import { describe, expect, it } from "vitest";
import {
  buildImportSourceHash,
  buildSkippedFingerprint,
  buildTransactionConflictKey,
  buildTransactionFingerprint,
} from "@/lib/server/import-db";
import type { PreparedImportRow } from "@/lib/import-pipeline";

const normalizedRow = {
  date: "2030-01-15",
  time: "09:45",
  amount: 1234,
  type: "expense" as const,
  category: "อาหาร",
  note: "SMOKE_IMPORT",
  recipient: "Cafe Smoke",
  paymentChannel: "PromptPay",
};

describe("import-db fingerprints", () => {
  it("keeps exact fingerprints stable for identical rows", () => {
    const first = buildTransactionFingerprint(normalizedRow);
    const second = buildTransactionFingerprint({ ...normalizedRow });

    expect(first).toBe(second);
  });

  it("changes exact fingerprints when the transaction time changes", () => {
    const first = buildTransactionFingerprint(normalizedRow);
    const second = buildTransactionFingerprint({
      ...normalizedRow,
      time: "10:15",
    });

    expect(first).not.toBe(second);
  });

  it("keeps conflict keys stable even when non-identity details change", () => {
    const first = buildTransactionConflictKey(normalizedRow);
    const second = buildTransactionConflictKey({
      ...normalizedRow,
      paymentChannel: "Credit Card",
      note: "SMOKE_IMPORT_VARIANT",
      recipient: "Cafe Smoke",
    });

    expect(first).toBe(second);
  });

  it("hashes skipped rows and import sources deterministically", () => {
    const skipped: PreparedImportRow = {
      rowNumber: 4,
      rawRow: { วันที่: "", จำนวน: "0" },
      skipReason: "missing date",
    };

    expect(buildSkippedFingerprint(skipped)).toBe(buildSkippedFingerprint(skipped));
    expect(
      buildImportSourceHash("sample.csv", [skipped])
    ).toBe(buildImportSourceHash("sample.csv", [skipped]));
  });
});
