import { describe, expect, it } from "vitest";
import {
  canReviewPreviewRow,
  countPendingConflictRows,
  getPreviewStatusForReviewAction,
} from "@/lib/import-review";
import type { ImportPreviewRow } from "@/lib/import-pipeline";

describe("import review helpers", () => {
  it("maps review actions to the effective preview status", () => {
    expect(getPreviewStatusForReviewAction("import_as_new")).toBe("new");
    expect(getPreviewStatusForReviewAction("keep_existing")).toBe("duplicate");
    expect(getPreviewStatusForReviewAction("skip")).toBe("skipped");
  });

  it("tracks which rows still need user review", () => {
    const rows: ImportPreviewRow[] = [
      { rowNumber: 1, previewStatus: "conflict" },
      {
        rowNumber: 2,
        previewStatus: "duplicate",
        reviewAction: "keep_existing",
      },
      { rowNumber: 3, previewStatus: "new" },
    ];

    expect(canReviewPreviewRow(rows[0])).toBe(true);
    expect(canReviewPreviewRow(rows[1])).toBe(true);
    expect(canReviewPreviewRow(rows[2])).toBe(false);
    expect(countPendingConflictRows(rows)).toBe(1);
  });
});
