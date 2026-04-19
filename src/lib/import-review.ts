import type {
  ImportPreviewRow,
  ImportPreviewStatus,
  ImportReviewAction,
} from "@/lib/import-pipeline";

export const IMPORT_REVIEW_ACTION_LABELS: Record<ImportReviewAction, string> = {
  import_as_new: "นำเข้าเป็นรายการใหม่",
  keep_existing: "ใช้รายการเดิม",
  skip: "ข้ามรายการนี้",
};

export const IMPORT_REVIEW_ACTION_LABELS_EN: Record<ImportReviewAction, string> = {
  import_as_new: "Import as new",
  keep_existing: "Keep existing",
  skip: "Skip this row",
};

export function getImportReviewActionLabel(
  action: ImportReviewAction,
  language: "th" | "en" = "th"
): string {
  return language === "en"
    ? IMPORT_REVIEW_ACTION_LABELS_EN[action]
    : IMPORT_REVIEW_ACTION_LABELS[action];
}

export function getPreviewStatusForReviewAction(
  action: ImportReviewAction
): ImportPreviewStatus {
  if (action === "import_as_new") return "new";
  if (action === "keep_existing") return "duplicate";
  return "skipped";
}

export function canReviewPreviewRow(row: ImportPreviewRow) {
  return row.previewStatus === "conflict" || row.reviewAction != null;
}

export function countPendingConflictRows(rows: ImportPreviewRow[]) {
  return rows.filter((row) => row.previewStatus === "conflict").length;
}
