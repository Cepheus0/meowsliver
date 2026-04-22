import type { MetricPacket } from "@/lib/metrics/types";

export interface ImportRunQualitySource {
  id: number;
  sourceFilename: string;
  mode: "append" | "replace";
  status: "previewed" | "completed" | "failed";
  totalRows: number;
  newRows: number;
  duplicateRows: number;
  conflictRows: number;
  skippedRows: number;
  createdAt: string;
  completedAt?: string | null;
  rows: Array<{
    previewStatus: "new" | "duplicate" | "conflict" | "skipped";
    reviewAction?: "import_as_new" | "keep_existing" | "skip" | null;
  }>;
}

interface BuildImportQualityMetricPacketInput {
  runs: ImportRunQualitySource[];
  generatedAt?: string;
}

export interface ImportRunQualityMetric {
  id: number;
  sourceFilename: string;
  mode: ImportRunQualitySource["mode"];
  status: ImportRunQualitySource["status"];
  totalRows: number;
  newRatePercent: number;
  duplicateRatePercent: number;
  conflictRatePercent: number;
  skipRatePercent: number;
  unresolvedConflictsCount: number;
  createdAt: string;
  completedAt?: string | null;
}

export interface ImportQualityMetrics {
  recentRunCount: number;
  totalRowsReviewed: number;
  aggregateNewRatePercent: number;
  aggregateDuplicateRatePercent: number;
  aggregateConflictRatePercent: number;
  aggregateSkipRatePercent: number;
  unresolvedConflictsCount: number;
  latestRun?: ImportRunQualityMetric;
  topSkipReason: string | null;
}

export interface ImportQualityEvidence {
  recentRuns: ImportRunQualityMetric[];
  sourceFilenamesByConflictRows: Array<{
    sourceFilename: string;
    conflictRows: number;
  }>;
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function rate(count: number, total: number) {
  return total > 0 ? roundPercent((count / total) * 100) : 0;
}

function buildRunMetric(run: ImportRunQualitySource): ImportRunQualityMetric {
  const unresolvedConflictsCount = run.rows.filter(
    (row) => row.previewStatus === "conflict"
  ).length;

  return {
    id: run.id,
    sourceFilename: run.sourceFilename,
    mode: run.mode,
    status: run.status,
    totalRows: run.totalRows,
    newRatePercent: rate(run.newRows, run.totalRows),
    duplicateRatePercent: rate(run.duplicateRows, run.totalRows),
    conflictRatePercent: rate(run.conflictRows, run.totalRows),
    skipRatePercent: rate(run.skippedRows, run.totalRows),
    unresolvedConflictsCount,
    createdAt: run.createdAt,
    completedAt: run.completedAt,
  };
}

function buildSourceConflictEvidence(runs: ImportRunQualitySource[]) {
  const grouped = new Map<string, number>();

  for (const run of runs) {
    grouped.set(
      run.sourceFilename,
      (grouped.get(run.sourceFilename) ?? 0) + run.conflictRows
    );
  }

  return Array.from(grouped.entries())
    .map(([sourceFilename, conflictRows]) => ({ sourceFilename, conflictRows }))
    .filter((item) => item.conflictRows > 0)
    .sort((left, right) => right.conflictRows - left.conflictRows)
    .slice(0, 5);
}

function buildCoverageCaveats(runCount: number) {
  const caveats: string[] = ["import_skip_reasons_are_not_persisted"];

  if (runCount === 0) {
    caveats.push("no_import_runs_found");
  }

  return caveats;
}

export function buildImportQualityMetricPacket({
  runs,
  generatedAt = new Date().toISOString(),
}: BuildImportQualityMetricPacketInput): MetricPacket<
  ImportQualityMetrics,
  ImportQualityEvidence
> {
  const runMetrics = runs.map(buildRunMetric);
  const totals = runs.reduce(
    (sum, run) => ({
      totalRows: sum.totalRows + run.totalRows,
      newRows: sum.newRows + run.newRows,
      duplicateRows: sum.duplicateRows + run.duplicateRows,
      conflictRows: sum.conflictRows + run.conflictRows,
      skippedRows: sum.skippedRows + run.skippedRows,
      unresolvedConflicts:
        sum.unresolvedConflicts +
        run.rows.filter((row) => row.previewStatus === "conflict").length,
    }),
    {
      totalRows: 0,
      newRows: 0,
      duplicateRows: 0,
      conflictRows: 0,
      skippedRows: 0,
      unresolvedConflicts: 0,
    }
  );

  return {
    scope: "imports.recent",
    metrics: {
      recentRunCount: runs.length,
      totalRowsReviewed: totals.totalRows,
      aggregateNewRatePercent: rate(totals.newRows, totals.totalRows),
      aggregateDuplicateRatePercent: rate(
        totals.duplicateRows,
        totals.totalRows
      ),
      aggregateConflictRatePercent: rate(totals.conflictRows, totals.totalRows),
      aggregateSkipRatePercent: rate(totals.skippedRows, totals.totalRows),
      unresolvedConflictsCount: totals.unresolvedConflicts,
      latestRun: runMetrics[0],
      topSkipReason: null,
    },
    evidence: {
      recentRuns: runMetrics,
      sourceFilenamesByConflictRows: buildSourceConflictEvidence(runs),
    },
    generatedAt,
    coverage: {
      importRunCount: runs.length,
      generatedFrom: ["import_runs", "import_run_rows"],
      caveats: buildCoverageCaveats(runs.length),
    },
  };
}
