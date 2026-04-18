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
  IMPORT_REVIEW_ACTION_LABELS,
} from "@/lib/import-review";
import {
  getTransactionAmountPrefix,
  getTransactionTypeLabel,
} from "@/lib/transaction-presentation";

type ImportStep = "upload" | "mapping" | "preview" | "done";

const STEP_LABELS = ["อัปโหลดไฟล์", "จับคู่คอลัมน์", "ตรวจสอบข้อมูล", "เสร็จสิ้น"];

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

const PREVIEW_STATUS_META: Record<
  ImportPreviewRow["previewStatus"],
  { label: string; className: string }
> = {
  new: {
    label: "ใหม่",
    className:
      "bg-[color:var(--income-soft)] text-[color:var(--income-text)]",
  },
  duplicate: {
    label: "ซ้ำ",
    className:
      "bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)]",
  },
  conflict: {
    label: "ต้องตรวจสอบ",
    className:
      "bg-[color:var(--neutral-soft)] text-[color:var(--neutral)]",
  },
  skipped: {
    label: "ข้าม",
    className:
      "bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)]",
  },
};

const REVIEW_ACTION_META: Record<
  ImportReviewAction,
  { label: string; className: string }
> = {
  import_as_new: {
    label: "นำเข้าเป็นรายการใหม่",
    className:
      "border-[color:var(--income-soft)] bg-[color:var(--income-soft)] text-[color:var(--income-text)]",
  },
  keep_existing: {
    label: "ใช้รายการเดิม",
    className:
      "border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)]",
  },
  skip: {
    label: "ข้ามรายการนี้",
    className:
      "border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)]",
  },
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

/** The mapping fields we need users to confirm */
const MAPPING_FIELDS: {
  key: keyof ColumnMapping;
  label: string;
  required: boolean;
  description: string;
}[] = [
  { key: "date", label: "วันที่", required: true, description: "คอลัมน์วันที่ของรายการ" },
  { key: "time", label: "เวลา", required: false, description: "เวลาในแต่ละรายการ (ถ้ามี)" },
  {
    key: "amount",
    label: "จำนวนเงิน",
    required: true,
    description: "จำนวนเงินรายการ (ติดลบ = รายจ่าย, บวก = รายรับ, ย้ายเงินควรมีคอลัมน์ประเภท)"
  },
  {
    key: "type",
    label: "ประเภท",
    required: false,
    description: "รายรับ / รายจ่าย / ย้ายเงิน (ถ้าไม่มี จะดูจากเครื่องหมาย +/- เฉพาะรายรับและรายจ่าย)"
  },
  { key: "category", label: "หมวดหมู่", required: false, description: "หมวดหมู่ เช่น อาหาร, ช้อปปิ้ง" },
  { key: "note", label: "โน้ต / หมายเหตุ", required: false, description: "รายละเอียดเพิ่มเติม" },
  { key: "paymentChannel", label: "ช่องทางจ่าย", required: false, description: "บัตรเครดิต, บัญชี, เงินสด" },
  { key: "payFrom", label: "จ่ายจาก", required: false, description: "ชื่อบัตร/บัญชีที่จ่าย" },
  { key: "recipient", label: "ผู้รับ", required: false, description: "ร้านค้า/ผู้รับเงิน" },
  { key: "tag", label: "แท็ก", required: false, description: "แท็กเพิ่มเติม" },
];

export default function ImportPage() {
  const router = useRouter();
  const { replaceImportedTransactions, setAccounts } = useFinanceStore();

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
        throw new Error("รองรับเฉพาะไฟล์ .xlsx, .xls, .csv เท่านั้น");
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("ไฟล์ใหญ่เกินไป (สูงสุด 10MB)");
      }

      setFileName(file.name);

      // Parse the file
      const result = await parseFile(file);

      if (result.rows.length === 0) {
        throw new Error("ไม่พบข้อมูลในไฟล์ กรุณาตรวจสอบว่าไฟล์มีข้อมูลอยู่");
      }

      if (result.columns.length === 0) {
        throw new Error("ไม่พบคอลัมน์ในไฟล์ กรุณาตรวจสอบว่าแถวแรกเป็นหัวคอลัมน์");
      }

      setParseResult(result);

      // Auto-detect เหมียวจด format
      const detection = detectMeowjotFormat(result.columns);
      setIsMeowjot(detection.isMeowjot);
      setConfidence(detection.confidence);
      setMapping(detection.autoMapping);

      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอ่านไฟล์");
    } finally {
      setIsProcessing(false);
    }
  }, []);

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
        throw new Error(payload?.error ?? "ไม่สามารถสร้าง preview import ได้");
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
      setError(err instanceof Error ? err.message : "ไม่สามารถสร้าง preview import ได้");
    } finally {
      setIsPreviewLoading(false);
    }
  }, [fileName, mapping, parseResult]);

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
        throw new Error(payload?.error ?? "ไม่สามารถยืนยันการนำเข้าได้");
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
      setError(err instanceof Error ? err.message : "ไม่สามารถยืนยันการนำเข้าได้");
    } finally {
      setIsCommitting(false);
    }
  }, [previewRunId, replaceImportedTransactions, setAccounts]);

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
            payload.error ?? "ไม่สามารถบันทึกการตัดสินใจสำหรับรายการนี้ได้"
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
            : "ไม่สามารถบันทึกการตัดสินใจสำหรับรายการนี้ได้"
        );
      } finally {
        setReviewingRowNumber(null);
      }
    },
    [previewRunId]
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
      ? `เคลียร์ ${pendingConflictRows} conflict ก่อน`
      : importStats.newRows > 0
      ? `ยืนยันเพิ่ม ${importStats.newRows.toLocaleString()} รายการใหม่`
      : "บันทึกผลตรวจสอบ";

  // === Step indicator index ===
  const stepIndex = ["upload", "mapping", "preview", "done"].indexOf(step);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--app-text)]">
          นำเข้าข้อมูล
        </h1>
        <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
          Import Excel / CSV จาก เหมียวจด หรือแอปบัญชีอื่นๆ
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1">
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

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--expense-soft)] bg-[color:var(--expense-soft)] p-4">
          <FileWarning size={20} className="shrink-0 text-[color:var(--expense-text)]" />
          <div>
            <p className="text-sm font-medium text-[color:var(--expense-text)]">
              เกิดข้อผิดพลาด
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
                  กำลังอ่านไฟล์...
                </p>
              </>
            ) : (
              <>
                <Upload size={48} className="mb-4 text-[color:var(--app-text-subtle)]" />
                <p className="mb-2 text-lg font-semibold text-[color:var(--app-text)]">
                  ลากไฟล์มาวางที่นี่
                </p>
                <p className="mb-1 text-sm text-[color:var(--app-text-muted)]">
                  รองรับ .xlsx, .xls, .csv (สูงสุด 10MB)
                </p>
                <p className="mb-6 flex items-center gap-1.5 text-xs text-[color:var(--app-brand-text)]">
                  <Sparkles size={14} />
                  ตรวจจับรูปแบบ เหมียวจด อัตโนมัติ
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
                    เลือกไฟล์
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
              จับคู่คอลัมน์ — {fileName}
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
                  ตรวจพบรูปแบบ เหมียวจด! (ความเชื่อมั่น {Math.round(confidence * 100)}%)
                </p>
                <p className="text-xs text-[color:var(--income-text)] opacity-80">
                  จับคู่คอลัมน์อัตโนมัติแล้ว — กรุณาตรวจสอบก่อนดำเนินการ
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-[color:var(--neutral-soft)] p-3">
              <AlertTriangle size={18} className="shrink-0 text-[color:var(--neutral)]" />
              <div>
                <p className="text-sm font-semibold text-[color:var(--neutral)]">
                  ไม่ใช่รูปแบบ เหมียวจด — กรุณาจับคู่คอลัมน์เอง
                </p>
                <p className="text-xs text-[color:var(--neutral)] opacity-80">
                  พบ {parseResult.columns.length} คอลัมน์,{" "}
                  {parseResult.totalRows} แถวข้อมูล (ชีท: {parseResult.sheetName})
                </p>
              </div>
            </div>
          )}

          {/* File info */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[color:var(--app-surface-soft)] p-3">
              <p className="text-xs text-[color:var(--app-text-muted)]">จำนวนแถว</p>
              <p className="text-lg font-bold text-[color:var(--app-text)]">
                {parseResult.totalRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-[color:var(--app-surface-soft)] p-3">
              <p className="text-xs text-[color:var(--app-text-muted)]">จำนวนคอลัมน์</p>
              <p className="text-lg font-bold text-[color:var(--app-text)]">
                {parseResult.columns.length}
              </p>
            </div>
            <div className="rounded-lg bg-[color:var(--app-surface-soft)] p-3">
              <p className="text-xs text-[color:var(--app-text-muted)]">ชีท</p>
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
                          label: field.required ? "-- เลือก (จำเป็น) --" : "-- ไม่เลือก --",
                        },
                        ...parseResult.columns.map((col) => ({
                          value: col,
                          label:
                            col +
                            (parseResult.rows[0]?.[col]
                              ? ` (ตัวอย่าง: ${parseResult.rows[0][col].slice(0, 30)})`
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
              ดูข้อมูลดิบ (5 แถวแรก)
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
              เลือกไฟล์ใหม่
            </Button>
            <Button
              onClick={() => void buildPreview()}
              disabled={!canProceedFromMapping || isPreviewLoading}
            >
              {isPreviewLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  กำลังตรวจสอบกับฐานข้อมูล...
                </>
              ) : (
                <>
                  ดูตัวอย่าง
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
              <p className="text-xs text-[color:var(--app-text-muted)]">พร้อมตรวจสอบ</p>
              <p className="mt-1 text-2xl font-bold text-[color:var(--app-text)]">
                {importStats.readyRows}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--income-soft)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--income-text)]">
                รายการใหม่
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--income-text)]">
                {importStats.newRows}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--app-brand-soft)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--app-brand-text)]">รายการซ้ำ</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--app-brand-text)]">
                {importStats.duplicateRows}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--neutral-soft)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--neutral)]">
                ต้องตรวจสอบ
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--neutral)]">
                {importStats.conflictRows}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                รายรับ ({importStats.incomeRows})
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--income-text)]">
                {formatBaht(importStats.totalIncome)}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                รายจ่าย ({importStats.expenseRows})
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--expense-text)]">
                {formatBaht(importStats.totalExpense)}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                ย้ายเงิน ({importStats.transferRows})
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--app-brand-text)]">
                {formatBaht(importStats.totalTransfer)}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-4 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">ข้ามรายการ</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-2xl font-bold text-[color:var(--neutral)]">
                {importStats.skippedRows}
              </p>
            </div>
          </div>
          {importStats.transferRows > 0 && (
            <p className="text-sm text-[color:var(--app-brand-text)]">
              รายการประเภท “ย้ายเงิน” จะถูกบันทึกไว้เพื่อใช้ตามรอยการเคลื่อนเงิน แต่จะไม่ถูกรวมเป็นรายรับหรือรายจ่ายใน dashboard และ reports
            </p>
          )}

          {reviewableRows.length > 0 && (
            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle>Conflict Review Queue</CardTitle>
                  <p className="text-sm text-[color:var(--app-text-muted)]">
                    เลือกว่าจะนำเข้าแถวที่ใกล้เคียงเป็นรายการใหม่ ใช้รายการเดิม หรือข้ามรายการนี้
                    ระบบจะยังไม่อนุญาตให้ commit จนกว่ารายการสถานะ{" "}
                    <span className="font-medium text-[color:var(--neutral)]">
                      ต้องตรวจสอบ
                    </span>{" "}
                    จะถูกตัดสินใจครบทุกแถว
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
                          แถว {row.rowNumber}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                            PREVIEW_STATUS_META[row.previewStatus].className
                          )}
                        >
                          {PREVIEW_STATUS_META[row.previewStatus].label}
                        </span>
                        {row.reviewAction ? (
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                              REVIEW_ACTION_META[row.reviewAction].className
                            )}
                          >
                            {IMPORT_REVIEW_ACTION_LABELS[row.reviewAction]}
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
                            รายการจากไฟล์
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
                            รายการเดิมที่ใกล้เคียง
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
                        {(Object.keys(REVIEW_ACTION_META) as ImportReviewAction[]).map(
                          (action) => (
                            <button
                              key={action}
                              type="button"
                              disabled={isReviewing || isCommitting}
                              onClick={() => void reviewConflictRow(row.rowNumber, action)}
                              className={cn(
                                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                REVIEW_ACTION_META[action].className,
                                row.reviewAction === action &&
                                  "ring-2 ring-offset-2 ring-offset-[color:var(--app-surface)] ring-[color:var(--app-brand)]"
                              )}
                            >
                              {isReviewing && row.reviewAction !== action ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 size={14} className="animate-spin" />
                                  กำลังบันทึก...
                                </span>
                              ) : (
                                IMPORT_REVIEW_ACTION_LABELS[action]
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
                <CardTitle>ตัวอย่างข้อมูลหลังตรวจซ้ำกับฐานข้อมูล (20 แถวแรก)</CardTitle>
                <p className="text-sm text-[color:var(--app-text-muted)]">
                  ระบบจะเพิ่มเฉพาะรายการสถานะ <span className="font-medium text-[color:var(--income-text)]">ใหม่</span>{" "}
                  เท่านั้น ส่วนรายการซ้ำจะกันออกไว้ และรายการ conflict ต้องผ่านการตัดสินใจก่อน
                </p>
                {hasReviewExceptions && (
                  <p className="text-sm text-[color:var(--neutral)]">
                    พบรายการซ้ำหรือรายการที่ควรตรวจสอบก่อนนำเข้า กรุณาเช็กแถวที่มีสถานะไม่ใช่ “ใหม่”
                  </p>
                )}
                {pendingConflictRows > 0 && (
                  <p className="text-sm text-[color:var(--neutral)]">
                    ยังมี {pendingConflictRows} รายการ conflict ที่รอการตัดสินใจ
                  </p>
                )}
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="theme-border border-b">
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">#</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">สถานะ</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">วันที่</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">เวลา</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">ประเภท</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">หมวดหมู่</th>
                    <th className="py-2.5 pr-3 text-right text-xs font-medium text-[color:var(--app-text-muted)]">จำนวน</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-[color:var(--app-text-muted)]">โน้ต</th>
                    <th className="py-2.5 text-xs font-medium text-[color:var(--app-text-muted)]">ช่องทาง</th>
                    <th className="py-2.5 pl-3 text-xs font-medium text-[color:var(--app-text-muted)]">การตัดสินใจ</th>
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
                              PREVIEW_STATUS_META[row.previewStatus].className
                            )}
                          >
                            {PREVIEW_STATUS_META[row.previewStatus].label}
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
                              {getTransactionTypeLabel(tx.type)}
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
                            ? IMPORT_REVIEW_ACTION_LABELS[row.reviewAction]
                            : row.previewStatus === "conflict"
                              ? "รอการตัดสินใจ"
                              : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {previewRows.length > 20 && (
                <p className="py-3 text-center text-xs text-[color:var(--app-text-subtle)]">
                  ...และอีก {previewRows.length - 20} รายการ
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between border-t border-[color:var(--app-divider)] pt-4">
              <Button variant="ghost" onClick={() => setStep("mapping")}>
                <ArrowLeft size={16} />
                แก้ไขการจับคู่
              </Button>
              <Button
                onClick={() => void confirmImport()}
                disabled={!previewRunId || isCommitting || pendingConflictRows > 0}
              >
                {isCommitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    กำลังบันทึกลงฐานข้อมูล...
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
            {importStats.committedRows > 0 ? "นำเข้าสำเร็จ!" : "ตรวจสอบข้อมูลเสร็จสิ้น"}
          </h2>
          <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
            เพิ่มใหม่{" "}
            <span className="font-bold text-[color:var(--app-text)]">
              {importStats.committedRows.toLocaleString()}
            </span>{" "}
            รายการจาก{" "}
            <span className="font-medium text-[color:var(--app-text)]">
              {fileName}
            </span>
          </p>

          {/* Summary */}
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl bg-[color:var(--income-soft)] p-3">
              <p className="text-xs text-[color:var(--income-text)]">
                เพิ่มสำเร็จ
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--income-text)]">
                {importStats.committedRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--app-brand-soft)] p-3">
              <p className="text-xs text-[color:var(--app-brand-text)]">รายการซ้ำ</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--app-brand-text)]">
                {importStats.duplicateRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--neutral-soft)] p-3">
              <p className="text-xs text-[color:var(--neutral)]">
                ต้องตรวจสอบ
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--neutral)]">
                {importStats.conflictRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--app-surface-soft)] p-3">
              <p className="text-xs text-[color:var(--app-text-muted)]">ข้ามรายการ</p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--app-text)]">
                {importStats.skippedRows.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mx-auto mt-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-3 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                รายรับ ({importStats.incomeRows})
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--income-text)]">
                {formatBaht(importStats.totalIncome)}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-3 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                รายจ่าย ({importStats.expenseRows})
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--expense-text)]">
                {formatBaht(importStats.totalExpense)}
              </p>
            </div>
            <div className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-3 shadow-sm">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                ย้ายเงิน ({importStats.transferRows})
              </p>
              <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-lg font-bold text-[color:var(--app-brand-text)]">
                {formatBaht(importStats.totalTransfer)}
              </p>
            </div>
          </div>

          <div className="mx-auto mt-3 max-w-2xl space-y-2">
            {(importStats.duplicateRows > 0 || importStats.conflictRows > 0) && (
              <p className="text-xs text-[color:var(--neutral)]">
                ระบบกันรายการซ้ำและรายการที่ใกล้เคียงออกจากการเพิ่มอัตโนมัติแล้ว เพื่อป้องกันข้อมูลซ้ำใน dashboard
              </p>
            )}
            {importStats.transferRows > 0 && (
              <p className="text-xs text-[color:var(--app-brand-text)]">
                รายการ “ย้ายเงิน” ถูกบันทึกไว้แยกต่างหากและจะไม่ถูกรวมในตัวเลขรายรับหรือรายจ่าย
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={resetWizard}>
              นำเข้าไฟล์อื่น
            </Button>
            <Button onClick={() => router.push("/transactions")}>
              ดูรายการ
              <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
