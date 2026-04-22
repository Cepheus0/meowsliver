import { describe, expect, it } from "vitest";
import { buildImportQualityMetricPacket } from "@/lib/metrics/imports";

describe("import quality metrics", () => {
  it("summarizes recent import hygiene and unresolved conflicts", () => {
    const packet = buildImportQualityMetricPacket({
      runs: [
        {
          id: 1,
          sourceFilename: "latest.csv",
          mode: "append",
          status: "previewed",
          totalRows: 10,
          newRows: 6,
          duplicateRows: 1,
          conflictRows: 2,
          skippedRows: 1,
          createdAt: "2026-04-22T00:00:00.000Z",
          rows: [
            { previewStatus: "new" },
            { previewStatus: "conflict" },
            { previewStatus: "conflict" },
            { previewStatus: "duplicate" },
            { previewStatus: "skipped" },
          ],
        },
      ],
      generatedAt: "2026-04-22T00:00:00.000Z",
    });

    expect(packet.metrics).toMatchObject({
      recentRunCount: 1,
      totalRowsReviewed: 10,
      aggregateNewRatePercent: 60,
      aggregateConflictRatePercent: 20,
      aggregateSkipRatePercent: 10,
      unresolvedConflictsCount: 2,
      topSkipReason: null,
    });
    expect(packet.coverage.caveats).toContain(
      "import_skip_reasons_are_not_persisted"
    );
  });
});
