"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  X,
  AlertTriangle,
  Sparkles,
  FileWarning,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { fetchAccountsFromApi } from "@/lib/client/finance-sync";
import { cn, formatBaht } from "@/lib/utils";
import { useFinanceStore } from "@/store/finance-store";
import {
  parseFile,
  detectMeowjotFormat,
  EMPTY_MAPPING,
  type ParseResult,
  type ColumnMapping,
} from "@/lib/excel-parser";
import {
  prepareImportRows,
  type ImportCommitResponse,
  type ImportPreviewResponse,
  type ImportPreviewRow,
  type ImportReviewAction,
  type ImportPreviewSummary,
} from "@/lib/import-pipeline";
import {
  canReviewPreviewRow,
  countPendingConflictRows,
  getImportReviewActionLabel,
} from "@/lib/import-review";
import {
  getTransactionAmountPrefix,
  getTransactionTypeLabel,
} from "@/lib/transaction-presentation";
import { useLanguage, useTr } from "@/lib/i18n";

type ImportStep = "upload" | "mapping" | "preview" | "done";

interface ImportStats extends ImportPreviewSummary {
  committedRows: number;
}

const EMPTY_IMPORT_STATS: ImportStats = {
  totalRows: 0,
  readyRows: 0,
  incomeRows: 0,
  expenseRows: 0,
  transferRows: 0,
  newRows: 0,
  duplicateRows: 0,
  conflictRows: 0,
  skippedRows: 0,
  totalIncome: 0,
  totalExpense: 0,
  totalTransfer: 0,
  committedRows: 0,
};

const TRANSACTION_TYPE_BADGE_CLASS: Record<
  "income" | "expense" | "transfer",
  string
> = {
  income:
    "bg-[color:var(--income-soft)] text-[color:var(--income-text)]",
  expense:
    "bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]",
  transfer:
    "bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)]",
};

const TRANSACTION_TYPE_AMOUNT_CLASS: Record<
  "income" | "expense" | "transfer",
  string
> = {
  income: "text-[color:var(--income-text)]",
  expense: "text-[color:var(--expense-text)]",
  transfer: "text-[color:var(--app-brand-text)]",
};

const PREVIEW_STATUS_CLASSES: Record<
  ImportPreviewRow["previewStatus"],
  string
> = {
  new: "bg-[color:var(--income-soft)] text-[color:var(--income-text)]",
  duplicate:
    "bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)]",
  conflict: "bg-[color:var(--neutral-soft)] text-[color:var(--neutral)]",
  skipped:
    "bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)]",
};

const REVIEW_ACTION_CLASSES: Record<ImportReviewAction, string> = {
  import_as_new:
    "border-[color:var(--income-soft)] bg-[color:var(--income-soft)] text-[color:var(--income-text)]",
  keep_existing:
    "border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)]",
  skip: "border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)]",
};

function recalculateImportStatsFromRows(
  rows: ImportPreviewRow[],
  previousStats: ImportStats
): ImportStats {
  return {
    ...previousStats,
    newRows: rows.filter((row) => row.previewStatus === "new").length,
    duplicateRows: rows.filter((row) => row.previewStatus === "duplicate").length,
    conflictRows: rows.filter((row) => row.previewStatus === "conflict").length,
    skippedRows: rows.filter((row) => row.previewStatus === "skipped").length,
  };
}

type MappingField = {
  key: keyof ColumnMapping;
  label: string;
  required: boolean;
  description: string;
};

function buildMappingFields(tr: (th: string, en: string) => string): MappingField[] {
  return [
    { key: "date", label: tr("วันที่", "Date"), required: true, description: tr("คอลัมน์วันที่ของรายการ", "Transaction date column") },
    { key: "time", label: tr("เวลา", "Time"), required: false, description: tr("เวลาในแต่ละรายการ (ถ้ามี)", "Time of each row (optional)") },
    {
      key: "amount",
      label: tr("จำนวนเงิน", "Amount"),
      required: true,
      description: tr(
        "จำนวนเงินรายการ (ติดลบ = รายจ่าย, บวก = รายรับ, ย้ายเงินควรมีคอลัมน์ประเภท)",
        "Row amount (negative = expense, positive = income; transfers need a type column)"
      ),
    },
    {
      key: "type",
      label: tr("ประเภท", "Type"),
      required: false,
      description: tr(
        "รายรับ / รายจ่าย / ย้ายเงิน (ถ้าไม่มี จะดูจากเครื่องหมาย +/- เฉพาะรายรับและรายจ่าย)",
        "Income / Expense / Transfer (otherwise inferred from +/- for income and expense only)"
      ),
    },
    { key: "category", label: tr("หมวดหมู่", "Category"), required: false, description: tr("หมวดหมู่ เช่น อาหาร, ช้อปปิ้ง", "Category, e.g. Food, Shopping") },
    { key: "note", label: tr("โน้ต / หมายเหตุ", "Note"), required: false, description: tr("รายละเอียดเพิ่มเติม", "Additional details") },
    { key: "paymentChannel", label: tr("ช่องทางจ่าย", "Payment channel"), required: false, description: tr("บัตรเครดิต, บัญชี, เงินสด", "Credit card, bank, cash") },
    { key: "payFrom", label: tr("จ่ายจาก", "Pay from"), required: false, description: tr("ชื่อบัตร/บัญชีที่จ่าย", "Name of paying card/account") },
    { key: "recipient", label: tr("ผู้รับ", "Recipient"), required: false, description: tr("ร้านค้า/ผู้รับเงิน", "Merchant / recipient") },
    { key: "tag", label: tr("แท็ก", "Tag"), required: false, description: tr("แท็กเพิ่มเติม", "Additional tag") },
  ];
}

export default function ImportPage() {
  const router = useRouter();
  const tr = useTr();
  const language = useLanguage();
  const { replaceImportedTransactions, setAccounts } = useFinanceStore();

  const STEP_LABELS = [
    tr("อัปโหลดไฟล์", "Upload file"),
    tr("จับคู่คอลัมน์", "Map columns"),
    tr("ตรวจสอบข้อมูล", "Review data"),
    tr("เสร็จสิ้น", "Done"),
  ];

  const MAPPING_FIELDS = buildMappingFields(tr);

  const PREVIEW_STATUS_LABELS: Record<ImportPreviewRow["previewStatus"], string> = {
    new: tr("ใหม่", "New"),
    duplicate: tr("ซ้ำ", "Duplicate"),
    conflict: tr("ต้องตรวจสอบ", "Needs review"),
    skipped: tr("ข้าม", "Skipped"),
  };

  // Wizard state
  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed file data
  const [fileName, setFileName] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isMeowjot, setIsMeowjot] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);

  // Preview data
  const [previewRunId, setPreviewRunId] = useState<number | null>(null);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importStats, setImportStats] = useState<ImportStats>(EMPTY_IMPORT_STATS);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [reviewingRowNumber, setReviewingRowNumber] = useState<number | null>(null);

  // === Step 1: File upload handlers ===

  const processUploadedFile = useCallback(async (file: File) => {
    setError(null);
    setIsProcessing(true);

    try {
      // Validate file type
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
        throw new Error(
          tr(
            "รองรับเฉพาะไฟล์ .xlsx, .xls, .csv เท่านั้น",
            "Only .xlsx, .xls, .csv files are supported"
          )
        );
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(tr("ไฟล์ใหญ่เกินไป (สูงสุด 10MB)", "File is too large (max 10MB)"));
      }

      setFileName(file.name);

      // Parse the file
      const result = await parseFile(file);

      if (result.rows.length === 0) {
        throw new Error(
          tr(
            "ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบว่าไฟล์มีข้อมูลอยู่",
            "No data found in file. Please verify the file has content."
          )
        );
      }

      if (result.columns.length === 0) {
        throw new Error(
          tr(
            "ไม่พบคอลัมน์ในไฟล์ กรุณาตรวจสอบว่าแถวแรกเป็นหัวคอลัมน์",
            "No columns found. Please check that the first row is the header."
          )
        );
      }

      setParseResult(result);

      // Auto-detect เหมียวจด format
      const detection = detectMeowjotFormat(result.columns);
      setIsMeowjot(detection.isMeowjot);
      setConfidence(detection.confidence);
      setMapping(detection.autoMapping);

      setStep("mapping");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tr("เกิดข้อผิดพลาดในการอ่านไฟล์", "An error occurred while reading the file")
      );
    } finally {
      setIsProcessing(false);
    }
  }, [tr]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processUploadedFile(file);
      }
    },
    [processUploadedFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processUploadedFile(file);
      }
      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [processUploadedFile]
  );

  // === Step 2 → 3: Build preview from mapping ===

  const buildPreview = useCallback(async () => {
    if (!parseResult) return;

    setError(null);
    setIsPreviewLoading(true);

    try {
      const preparedRows = prepareImportRows(parseResult.rows, mapping);
      const response = await fetch("/api/import/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          mode: "append",
          rows: preparedRows,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          payload?.error ??
            tr("ไม่สามารถสร้าง preview import ได้", "Could not build import preview")
        );
      }

      const result = (await response.json()) as ImportPreviewResponse;

      setPreviewRunId(result.importRunId);
      setPreviewRows(result.previewRows);
      setImportStats({
        ...result.summary,
        committedRows: 0,
      });
      setStep("preview");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tr("ไม่สามารถสร้าง preview import ได้", "Could not build import preview")
      );
    } finally {
      setIsPreviewLoading(false);
    }
  }, [fileName, mapping, parseResult, tr]);

  // === Step 3 → Done: Confirm import ===

  const confirmImport = useCallback(async () => {
    if (!previewRunId) return;

    setError(null);
    setIsCommitting(true);

    try {
      const response = await fetch("/api/import/commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          importRunId: previewRunId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          payload?.error ??
            tr("ไม่สามารถยืนยันการนำเข้าได้", "Could not confirm import")
        );
      }

      const result = (await response.json()) as ImportCommitResponse;

      replaceImportedTransactions(result.transactions);
      const accounts = await fetchAccountsFromApi();
      setAccounts(accounts);
      setImportStats({
        ...result.summary,
        committedRows: result.committedRows,
      });
      setStep("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tr("ไม่สามารถยืนยันการนำเข้าได้", "Could not confirm import")
      );
    } finally {
      setIsCommitting(false);
    }
  }, [previewRunId, replaceImportedTransactions, setAccounts, tr]);

  const reviewConflictRow = useCallback(
    async (rowNumber: number, action: ImportReviewAction) => {
      if (!previewRunId) return;

      setError(null);
      setReviewingRowNumber(rowNumber);

      try {
        const response = await fetch("/api/import/review", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            importRunId: previewRunId,
            rowNumber,
            action,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          rowNumber?: number;
          previewStatus?: ImportPreviewRow["previewStatus"];
          reviewAction?: ImportReviewAction;
          summary?: ImportPreviewSummary;
        };

        if (!response.ok || !payload.rowNumber || !payload.previewStatus) {
          throw new Error(
            payload.error ??
              tr(
                "ไม่สามารถบันทึกการตัดสินใจสำหรับรายการนี้ได้",
                "Could not save the decision for this row"
              )
          );
        }

        setPreviewRows((currentRows) => {
          const nextRows = currentRows.map((row) =>
            row.rowNumber === rowNumber
              ? {
                  ...row,
                  previewStatus: payload.previewStatus!,
                  reviewAction: payload.reviewAction,
                }
              : row
          );

          setImportStats((currentStats) =>
            recalculateImportStatsFromRows(nextRows, {
              ...currentStats,
              ...(payload.summary
                ? {
                    ...payload.summary,
                    committedRows: currentStats.committedRows,
                  }
                : {}),
            })
          );

          return nextRows;
        });
      } catch (reviewError) {
        setError(
          reviewError instanceof Error
            ? reviewError.message
            : tr(
                "ไม่สามารถบันทึกการตัดสินใจสำหรับรายการนี้ได้",
                "Could not save the decision for this row"
              )
        );
      } finally {
        setReviewingRowNumber(null);
      }
    },
    [previewRunId, tr]
  );

  // === Reset ===

  const resetWizard = useCallback(() => {
    setStep("upload");
    setFileName("");
    setParseResult(null);
    setIsMeowjot(false);
    setConfidence(0);
    setMapping(EMPTY_MAPPING);
    setPreviewRunId(null);
    setPreviewRows([]);
    setError(null);
    setImportStats(EMPTY_IMPORT_STATS);
    setReviewingRowNumber(null);
  }, []);

  // === Validation: can we proceed from mapping? ===
  const canProceedFromMapping = mapping.date !== "" && mapping.amount !== "";
  const hasReviewExceptions =
    importStats.duplicateRows > 0 || importStats.conflictRows > 0;
  const pendingConflictRows = countPendingConflictRows(previewRows);
  const reviewableRows = previewRows.filter(canReviewPreviewRow);
  const confirmActionLabel =
    pendingConflictRows > 0
      ? tr(
          `เคลียร์ ${pendingConflictRows} conflict ก่อน`,
          `Resolve ${pendingConflictRows} conflict${pendingConflictRows === 1 ? "" : "s"} first`
        )
      : importStats.newRows > 0
      ? tr(
          `ยืนยันเพิ่ม ${importStats.newRows.toLocaleString()} รายการใหม่`,
          `Confirm adding ${importStats.newRows.toLocaleString()} new row${importStats.newRows === 1 ? "" : "s"}`
        )
      : tr("บันทึกผลตรวจสอบ", "Save review result");

  // === Step indicator index ===
  const stepIndex = ["upload", "mapping", "preview", "done"].indexOf(step);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr("IMPORT WORKFLOW", "IMPORT WORKFLOW")}
        title={tr("นำเข้าข้อมูล", "Import data")}
        description={tr(
          "อัปโหลดไฟล์จาก เหมียวจด หรือ CSV/Excel อื่น ๆ แล้วให้ระบบจับคู่คอลัมน์ ตรวจ duplicate และเปิด conflict review ก่อน commit จริง",
          "Upload a Meowjot export or other CSV/Excel file, then map columns, detect duplicates, and resolve conflicts before a real commit."
        )}
        meta={[
          {
            icon: <Upload size={14} />,
            label: tr("รองรับ .xlsx / .xls / .csv", "Supports .xlsx / .xls / .csv"),
            tone: "brand",
          },
          {
            icon: <Sparkles size={14} />,
            label: tr("มี auto-detect และ conflict review", "Includes auto-detect and conflict review"),
          },
          {
            icon: <CheckCircle size={14} />,
            label: fileName
              ? tr(`ไฟล์ล่าสุด: ${fileName}`, `Current file: ${fileName}`)
              : tr("ยังไม่ได้เลือกไฟล์", "No file selected yet"),
            tone: fileName ? "success" : "neutral",
          },
        ]}
        actions={
          step !== "upload" ? (
            <Button variant="secondary" onClick={resetWizard}>
              <ArrowLeft size={16} />
              {tr("เริ่มใหม่", "Start over")}
            </Button>
          ) : undefined
        }
      />

      {/* Progress Steps */}
      <div className="overflow-x-auto rounded-[24px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] px-4 py-4 shadow-[0_22px_60px_-48px_rgba(24,18,12,0.5)]">
        <div className="flex min-w-max items-center gap-1">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    i === stepIndex
                      ? "bg-[color:var(--app-brand)] text-white"
                      : i < stepIndex
                        ? "bg-[color:var(--app-brand-soft-strong)] text-[color:var(--app-brand-text)]"
                        : "bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-subtle)]"
                  )}
                >
                  {i < stepIndex ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    i === stepIndex
                      ? "text-[color:var(--app-brand-text)]"
                      : "text-[color:var(--app-text-subtle)]"
                  )}
                >
                  {label}
                </span>
              </div>
              {i < 3 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 w-6 sm:w-10",
                    i < stepIndex
                      ? "bg-[color:var(--app-brand)]"
                      : "bg-[color:var(--app-border)]"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--expense-soft)] bg-[color:var(--expense-soft)] p-4">
          <FileWarning size={20} className="shrink-0 text-[color:var(--expense-text)]" />
          <div>
            <p className="text-sm font-medium text-[color:var(--expense-text)]">
              {tr("เกิดข้อผิดพลาด", "An error occurred")}
            </p>
            <p className="text-xs text-[color:var(--expense-text)] opacity-80">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-[color:var(--expense-text)] opacity-60 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ============ STEP 1: UPLOAD ============ */}
      {step === "upload" && (
        <Card>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all sm:p-16",
              isDragging
                ? "border-[color:var(--app-brand)] bg-[color:var(--app-brand-soft)]"
                : "border-[color:var(--app-border-strong)] hover:border-[color:var(--app-brand-border)]",
              isProcessing && "pointer-events-none opacity-60"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 size={48} className="mb-4 animate-spin text-[color:var(--app-brand)]" />
                <p className="text-lg font-semibold text-[color:var(--app-text)]">
                  {tr("กำลังอ่านไฟล์...", "Reading file...")}
                </p>
              </>
            ) : (
              <>
                <Upload size={48} className="mb-4 text-[color:var(--app-text-subtle)]" />
                <p className="mb-2 text-lg font-semibold text-[color:var(--app-text)]">
                  {tr("ลากไฟล์มาวางที่นี่", "Drop your file here")}
                </p>
                <p className="mb-1 text-sm text-[color:var(--app-text-muted)]">
                  {tr(
                    "รองรับ .xlsx, .xls, .csv (สูงสุด 10MB)",
                    "Supports .xlsx, .xls, .csv (max 10MB)"
                  )}
                </p>
                <p className="mb-6 flex items-center gap-1.5 text-xs text-[color:var(--app-brand-text)]">
                  <Sparkles size={14} />
                  {tr("ตรวจจับรูปแบบ เหมียวจด อัตโนมัติ", "Auto-detects Meowjot format")}
                </p>
                <label>
                  <input
                    type="file"
                    accept=".xlsx,.csv,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <span className="cursor-pointer rounded-xl bg-[color:var(--app-brand)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[color:var(--app-brand-hover)]">
                    <Download size={16} className="mr-2 inline" />
                    {tr("เลือกไฟล์", "Choose file")}
                  </span>
                </label>
              </>
            )}
          </div>
        </Card>
      )}

      {/* ============ STEP 2: COLUMN MAPPING ============ */}
      {step === "mapping" && parseResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet size={16} />
              {tr("จับคู่คอลัมน์", "Map columns")} — {fileName}
            </CardTitle>
            <button
              onClick={resetWizard}
              className="text-[color:var(--app-text-subtle)] hover:text-[color:var(--app-text)]"
            >
              <X size={16} />
            </button>
          </CardHeader>

          {/* Detection banner */}
          {isMeowjot ? (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-[color:var(--income-soft)] p-3">
              <Sparkles size={18} className="shrink-0 text-[color:var(--income-text)]" />
              <div>
                <p className="text-sm font-semibold text-[color:var(--income-text)]">
                  {tr(
                    `ตรวจพบรูปแบบ เหมียวจด! (ความเชื่อมั่น ${Math.round(confidence * 100)}%)`,
                    `Meowjot format detected! (${Math.round(confidence * 100)}% confidence)`
                  )}
                </p>
                <p className="text-xs text-[color:var(--income-text)] opacity-80">
                  {tr(
                    "จับคู่คอลัมน์อัตโนมัติแล้ว — กรุณาตรวจสอบก่อนดำเนินการ",
                    "Columns auto-mapped — please review before continuing"
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-[color:var(--neutral-soft)] p-3">
              <AlertTriangle size={18} className="shrink-0 text-[color:var(--neutral)]" />
              <div>
                <p className="text-sm font-semibold text-[color:var(--neutral)]">
                  {tr(
                    "ไม่ใช่รูปแบบ เหมียวจด — กรุณาจับคู่คอลัมน์เอง",
                    "Not a Meowjot format — please map columns manually"
                  )}
                </p>
                <p className="text-xs text-[color:var(--neutral)] opacity-80">
                  {tr(
                    `พบ ${parseResult.columns.length} คอลัมน์, ${parseResult.totalRows} แถวข้อมูล (ชีท: ${parseResult.sheetName})`,
                    `Found ${parseResult.columns.length} columns, ${parseResult.totalRows} rows (sheet: ${parseResult.sheetName})`
                  )}
                </p>
              </div>
            </div>
          )}

          {/* File info */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[color:var(--app-surface-soft)] p-3">
              <p className="text-xs text-[color:var(--app-text-muted)]">{tr("จำนวนแถว", "Rows")}</p>
              <p className="text-lg font-bold text-[color:var(--app-text)]">
                {parseResult.totalRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-[color:var(--app-surface-soft)] p-3">
              <p className="text-xs text-[color:var(--app-text-muted)]">{tr("จำนวนคอลัมน์", "Columns")}</p>
              <p className="text-lg font-bold text-[color:var(--app-text)]">
                {parseResult.columns.length}
              </p>
            </div>
            <div className="rounded-lg bg-[color:var(--app-surface-soft)] p-3">
              <p className="text-xs text-[color:var(--app-text-muted)]">{tr("ชีท", "Sheet")}</p>
              <p className="truncate text-lg font-bold text-[color:var(--app-text)]">
                {parseResult.sheetName}
              </p>
            </div>
          </div>

          {/* Mapping form */}
          <div className="space-y-3">
            {MAPPING_FIELDS.map((field) => {
              const value = mapping[field.key];
              return (
                <div
                  key={field.key}
                  className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="w-full sm:w-52">
                    <label className="text-sm font-medium text-[color:var(--app-text)]">
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-[color:var(--expense-text)]">*</span>
                      )}
                    </label>
                    <p className="text-xs text-[color:var(--app-text-subtle)]">
                      {field.description}
                    </p>
                  </div>
                  <div className="flex-1">
                    <Select
                      value={value}
                      onChange={(v) =>
                        setMapping((prev) => ({ ...prev, [field.key]: v }))
                      }
                      options={[
                        {
                          value: "",
                          label: field.required
                            ? tr("-- เลือก (จำเป็น) --", "-- Select (required) --")
                            : tr("-- ไม่เลือก --", "-- None --"),
                        },
                        ...parseResult.columns.map((col) => ({
                          value: col,
                          label:
                            col +
                            (parseResult.rows[0]?.[col]
                              ? tr(
                                  ` (ตัวอย่าง: ${parseResult.rows[0][col].slice(0, 30)})`,
                                  ` (sample: ${parseResult.rows[0][col].slice(0, 30)})`
                                )
                              : ""),
                        })),
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Raw data preview */}
          <details className="mt-5">
            <summary className="cursor-pointer text-xs font-medium text-[color:var(--app-text-muted)] hover:text-[color:var(--app-text)]">
              {tr("ดูข้อมูลดิบ (5 แถวแรก)", "View raw data (first 5 rows)")}
            </summary>
            <div className="theme-border mt-2 overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[color:var(--app-surface-soft)]">
                    <th className="px-3 py-2 font-medium text-[color:var(--app-text-muted)]">#</th>
                    {parseResult.columns.map((col) => (
                      <th key={col} className="whitespace-nowrap px-3 py-2 font-medium text-[color:var(--app-text-muted)]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--app-divider)]">
                  {parseResult.rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-[color:var(--app-text-subtle)]">{i + 1}</td>
                      {parseResult.columns.map((col) => (
                        <td
                          key={col}
                          className="max-w-[200px] truncate whitespace-nowrap px-3 py-1.5 text-[color:var(--app-text-muted)]"
                        >
                          {row[col] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between">
            <Button variant="ghost" onClick={resetWizard}>
              <ArrowLeft size={16} />
              {tr("เลือกไฟล์ใหม่", "Choose another file")}
            </Button>
            <Button
              onClick={() => void buildPreview()}
              disabled={!canProceedFromMapping || isPreviewLoading}
            >
              {isPreviewLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {tr("กำลังตรวจสอบกับฐานข้อมูล...", "Checking against database...")}
                </>
              ) : (
                <>
                  {tr("ดูตัวอย่าง", "Preview")}
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* ============ STEP 3: PREVIEW ============ */}
      {step === "preview" && (
        <>
          {/* Import summary cards */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-8">
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">{tr("พร้อมตรวจสอบ", "Ready to review")}</p>
              <p className="mt-1 text-2xl font-bold text-[color:var(--app-text)]">
                {importStats.readyRows}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--income-soft)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--income-text)]">
                {tr("รายการใหม่", "New rows")}
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--income-text)]">
                {importStats.newRows}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--app-brand-soft)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--app-brand-text)]">{tr("รายการซ้ำ", "Duplicates")}</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--app-brand-text)]">
                {importStats.duplicateRows}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--neutral-soft)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--neutral)]">
                {tr("ต้องตรวจสอบ", "Needs review")}
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--neutral)]">
                {importStats.conflictRows}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                {tr(`รายรับ (${importStats.incomeRows})`, `Income (${importStats.incomeRows})`)}
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--income-text)]">
                {formatBaht(importStats.totalIncome)}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                {tr(`รายจ่าย (${importStats.expenseRows})`, `Expense (${importStats.expenseRows})`)}
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--expense-text)]">
                {formatBaht(importStats.totalExpense)}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                {tr(`ย้ายเงิน (${importStats.transferRows})`, `Transfer (${importStats.transferRows})`)}
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--app-brand-text)]">
                {formatBaht(importStats.totalTransfer)}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">{tr("ข้ามรายการ", "Skipped")}</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--neutral)]">
                {importStats.skippedRows}
              </p>
            </div>
          </div>
          {importStats.transferRows > 0 && (
            <p className="text-sm text-[color:var(--app-brand-text)]">
              {tr(
                "รายการประเภท “ย้ายเงิน” จะถูกบันทึกไว้เพื่อใช้ตามรอยการเคลื่อนเงิน แต่จะไม่ถูกรวมเป็นรายรับหรือรายจ่ายใน dashboard และ reports",
                "“Transfer” rows are saved for money-trail tracking but are not counted as income or expense in the dashboard or reports."
              )}
            </p>
          )}

          {reviewableRows.length > 0 && (
            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle>{tr("คิวตรวจสอบ Conflict", "Conflict Review Queue")}</CardTitle>
                  <p className="text-sm text-[color:var(--app-text-muted)]">
                    {tr(
                      "เลือกว่าจะนำเข้าแถวที่ใกล้เคียงเป็นรายการใหม่ ใช้รายการเดิม หรือข้ามรายการนี้ ระบบจะยังไม่อนุญาตให้ commit จนกว่ารายการสถานะ",
                      "Choose whether to import the near-match row as new, keep the existing one, or skip it. Commit is blocked until every row with status"
                    )}{" "}
                    <span className="font-medium text-[color:var(--neutral)]">
                      {tr("ต้องตรวจสอบ", "Needs review")}
                    </span>{" "}
                    {tr("จะถูกตัดสินใจครบทุกแถว", "has a decision.")}
                  </p>
                </div>
              </CardHeader>

              <div className="space-y-4">
                {reviewableRows.map((row) => {
                  const tx = row.transaction;
                  const existingTx = row.existingTransaction;
                  const isReviewing = reviewingRowNumber === row.rowNumber;

                  return (
                    <div
                      key={`review-${row.rowNumber}`}
                      className="rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)]/60 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-[color:var(--app-text)]">
                          {tr(`แถว ${row.rowNumber}`, `Row ${row.rowNumber}`)}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                            PREVIEW_STATUS_CLASSES[row.previewStatus]
                          )}
                        >
                          {PREVIEW_STATUS_LABELS[row.previewStatus]}
                        </span>
                        {row.reviewAction ? (
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                              REVIEW_ACTION_CLASSES[row.reviewAction]
                            )}
                          >
                            {getImportReviewActionLabel(row.reviewAction, language)}
                          </span>
                        ) : null}
                        {row.reason ? (
                          <span className="text-xs text-[color:var(--app-text-muted)]">
                            {row.reason}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--income-text)]">
                            {tr("รายการจากไฟล์", "Row from file")}
                          </p>
                          <div className="mt-3 space-y-1.5 text-sm text-[color:var(--app-text)]">
                            <p>{tx?.date ?? "-"} {tx?.time ? `· ${tx.time}` : ""}</p>
                            <p>{tx?.category ?? "-"}</p>
                            <p className="font-semibold">
                              {tx
                                ? `${getTransactionAmountPrefix(tx.type)}${formatBaht(tx.amount)}`
                                : "-"}
                            </p>
                            <p className="text-[color:var(--app-text-muted)]">
                              {tx?.note || tx?.subcategory || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--app-brand-text)]">
                            {tr("รายการเดิมที่ใกล้เคียง", "Existing near-match")}
                          </p>
                          <div className="mt-3 space-y-1.5 text-sm text-[color:var(--app-text)]">
                            <p>
                              {existingTx?.date ?? "-"}{" "}
                              {existingTx?.time ? `· ${existingTx.time}` : ""}
                            </p>
                            <p>{existingTx?.category ?? "-"}</p>
                            <p className="font-semibold">
                              {existingTx
                                ? `${getTransactionAmountPrefix(existingTx.type)}${formatBaht(
                                    existingTx.amount
                                  )}`
                                : "-"}
                            </p>
                            <p className="text-[color:var(--app-text-muted)]">
                              {existingTx?.note || existingTx?.subcategory || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(Object.keys(REVIEW_ACTION_CLASSES) as ImportReviewAction[]).map(
                          (action) => (
                            <button
                              key={action}
                              type="button"
                              disabled={isReviewing || isCommitting}
                              onClick={() => void reviewConflictRow(row.rowNumber, action)}
                              className={cn(
                                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                REVIEW_ACTION_CLASSES[action],
                                row.reviewAction === action &&
                                  "ring-2 ring-offset-2 ring-offset-[color:var(--app-surface)] ring-[color:var(--app-brand)]"
                              )}
                            >
                              {isReviewing && row.reviewAction !== action ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 size={14} className="animate-spin" />
                                  {tr("กำลังบันทึก...", "Saving...")}
                                </span>
                              ) : (
                                getImportReviewActionLabel(action, language)
                              )}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Preview table */}
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <CardTitle>
                  {tr(
                    "ตัวอย่างข้อมูลหลังตรวจซ้ำกับฐานข้อมูล (20 แถวแรก)",
                    "Preview after duplicate check (first 20 rows)"
                  )}
                </CardTitle>
                <p className="text-sm text-[color:var(--app-text-muted)]">
                  {tr(
                    "ระบบจะเพิ่มเฉพาะรายการสถานะ",
                    "Only rows with status"
                  )}{" "}
                  <span className="font-medium text-[color:var(--income-text)]">
                    {tr("ใหม่", "New")}
                  </span>{" "}
                  {tr(
                    "เท่านั้น ส่วนรายการซ้ำจะกันออกไว้ และรายการ conflict ต้องผ่านการตัดสินใจก่อน",
                    "will be added. Duplicates are skipped, and conflicts must be resolved first."
                  )}
                </p>
                {hasReviewExceptions && (
                  <p className="text-sm text-[color:var(--neutral)]">
                    {tr(
                      "พบรายการซ้ำหรือรายการที่ควรตรวจสอบก่อนนำเข้า กรุณาเช็กแถวที่มีสถานะไม่ใช่ “ใหม่”",
                      "Found duplicates or rows that need review before import. Please check rows with status other than “New”."
                    )}
                  </p>
                )}
                {pendingConflictRows > 0 && (
                  <p className="text-sm text-[color:var(--neutral)]">
                    {tr(
                      `ยังมี ${pendingConflictRows} รายการ conflict ที่รอการตัดสินใจ`,
                      `${pendingConflictRows} conflict row${pendingConflictRows === 1 ? "" : "s"} still pending decision`
                    )}
                  </p>
                )}
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="theme-border border-b">
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">#</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">{tr("สถานะ", "Status")}</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">{tr("วันที่", "Date")}</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">{tr("เวลา", "Time")}</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">{tr("ประเภท", "Type")}</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">{tr("หมวดหมู่", "Category")}</th>
                    <th className="py-2.5 pr-3 text-right text-xs font-medium text-[color:var(--app-text-muted)]">{tr("จำนวน", "Amount")}</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">{tr("โน้ต", "Note")}</th>
                    <th className="py-2.5 text-xs font-medium text-[color:var(--app-text-muted)]">{tr("ช่องทาง", "Channel")}</th>
                    <th className="py-2.5 pl-3 text-xs font-medium text-[color:var(--app-text-muted)]">{tr("การตัดสินใจ", "Decision")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--app-divider)]">
                  {previewRows.slice(0, 20).map((row, i) => {
                    const tx = row.transaction;

                    return (
                      <tr
                        key={`${row.rowNumber}-${row.previewStatus}`}
                        className="hover:bg-[color:var(--app-surface-soft)]"
                      >
                        <td className="py-2 pr-3 text-xs text-[color:var(--app-text-subtle)]">{i + 1}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={cn(
                              "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                              PREVIEW_STATUS_CLASSES[row.previewStatus]
                            )}
                          >
                            {PREVIEW_STATUS_LABELS[row.previewStatus]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 text-[color:var(--app-text)]">
                          {tx?.date ?? "-"}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 text-[color:var(--app-text-muted)]">
                          {tx?.time ?? "-"}
                        </td>
                        <td className="py-2 pr-3">
                          {tx ? (
                            <span
                              className={cn(
                                "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                                TRANSACTION_TYPE_BADGE_CLASS[tx.type]
                              )}
                            >
                              {getTransactionTypeLabel(tx.type, language)}
                            </span>
                          ) : (
                            <span className="text-xs text-[color:var(--app-text-subtle)]">-</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-[color:var(--app-text)]">
                          {tx?.category || "-"}
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap py-2 pr-3 text-right font-medium font-[family-name:var(--font-geist-mono)]",
                            tx && TRANSACTION_TYPE_AMOUNT_CLASS[tx.type],
                            !tx && "text-[color:var(--app-text-subtle)]"
                          )}
                        >
                          {tx ? (
                            <>
                              {getTransactionAmountPrefix(tx.type)}
                              {formatBaht(tx.amount)}
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="max-w-[240px] truncate py-2 pr-3 text-xs text-[color:var(--app-text-muted)]">
                          {tx?.note || row.reason || "-"}
                        </td>
                        <td className="max-w-[150px] truncate py-2 text-xs text-[color:var(--app-text-muted)]">
                          {tx?.subcategory || "-"}
                        </td>
                        <td className="py-2 pl-3 text-xs text-[color:var(--app-text-muted)]">
                          {row.reviewAction
                            ? getImportReviewActionLabel(row.reviewAction, language)
                            : row.previewStatus === "conflict"
                              ? tr("รอการตัดสินใจ", "Pending decision")
                              : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {previewRows.length > 20 && (
                <p className="py-3 text-center text-xs text-[color:var(--app-text-subtle)]">
                  {tr(
                    `...และอีก ${previewRows.length - 20} รายการ`,
                    `...and ${previewRows.length - 20} more rows`
                  )}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between border-t border-[color:var(--app-divider)] pt-4">
              <Button variant="ghost" onClick={() => setStep("mapping")}>
                <ArrowLeft size={16} />
                {tr("แก้ไขการจับคู่", "Edit mapping")}
              </Button>
              <Button
                onClick={() => void confirmImport()}
                disabled={!previewRunId || isCommitting || pendingConflictRows > 0}
              >
                {isCommitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {tr("กำลังบันทึกลงฐานข้อมูล...", "Saving to database...")}
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    {confirmActionLabel}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* ============ STEP 4: DONE ============ */}
      {step === "done" && (
        <Card className="py-10 text-center">
          <CheckCircle size={64} className="mx-auto mb-4 text-[color:var(--income)]" />
          <h2 className="text-2xl font-bold text-[color:var(--app-text)]">
            {importStats.committedRows > 0
              ? tr("นำเข้าสำเร็จ!", "Import successful!")
              : tr("ตรวจสอบข้อมูลเสร็จสิ้น", "Review complete")}
          </h2>
          <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
            {tr("เพิ่มใหม่ ", "Added ")}
            <span className="font-bold text-[color:var(--app-text)]">
              {importStats.committedRows.toLocaleString()}
            </span>{" "}
            {tr("รายการจาก ", "rows from ")}
            <span className="font-medium text-[color:var(--app-text)]">
              {fileName}
            </span>
          </p>

          {/* Summary */}
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl bg-[color:var(--income-soft)] p-3">
              <p className="text-xs text-[color:var(--income-text)]">
                {tr("เพิ่มสำเร็จ", "Added")}
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--income-text)]">
                {importStats.committedRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--app-brand-soft)] p-3">
              <p className="text-xs text-[color:var(--app-brand-text)]">{tr("รายการซ้ำ", "Duplicates")}</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--app-brand-text)]">
                {importStats.duplicateRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--neutral-soft)] p-3">
              <p className="text-xs text-[color:var(--neutral)]">
                {tr("ต้องตรวจสอบ", "Needs review")}
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--neutral)]">
                {importStats.conflictRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--app-surface-soft)] p-3">
              <p className="text-xs text-[color:var(--app-text-muted)]">{tr("ข้ามรายการ", "Skipped")}</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--app-text)]">
                {importStats.skippedRows.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mx-auto mt-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-3 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                {tr(`รายรับ (${importStats.incomeRows})`, `Income (${importStats.incomeRows})`)}
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--income-text)]">
                {formatBaht(importStats.totalIncome)}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-3 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                {tr(`รายจ่าย (${importStats.expenseRows})`, `Expense (${importStats.expenseRows})`)}
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--expense-text)]">
                {formatBaht(importStats.totalExpense)}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-3 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                {tr(`ย้ายเงิน (${importStats.transferRows})`, `Transfer (${importStats.transferRows})`)}
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--app-brand-text)]">
                {formatBaht(importStats.totalTransfer)}
              </p>
            </div>
          </div>

          <div className="mx-auto mt-3 max-w-2xl space-y-2">
            {(importStats.duplicateRows > 0 || importStats.conflictRows > 0) && (
              <p className="text-xs text-[color:var(--neutral)]">
                {tr(
                  "ระบบกันรายการซ้ำและรายการที่ใกล้เคียงออกจากการเพิ่มอัตโนมัติแล้ว เพื่อป้องกันข้อมูลซ้ำใน dashboard",
                  "Duplicates and near-matches were excluded from the automatic import to prevent duplicate data on the dashboard."
                )}
              </p>
            )}
            {importStats.transferRows > 0 && (
              <p className="text-xs text-[color:var(--app-brand-text)]">
                {tr(
                  "รายการ “ย้ายเงิน” ถูกบันทึกไว้แยกต่างหากและจะไม่ถูกรวมในตัวเลขรายรับหรือรายจ่าย",
                  "“Transfer” rows are saved separately and are not counted as income or expense."
                )}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={resetWizard}>
              {tr("นำเข้าไฟล์อื่น", "Import another file")}
            </Button>
            <Button onClick={() => router.push("/transactions")}>
              {tr("ดูรายการ", "View transactions")}
              <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
