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
  type ImportPreviewSummary,
} from "@/lib/import-pipeline";
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
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  expense: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  transfer: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
};

const TRANSACTION_TYPE_AMOUNT_CLASS: Record<
  "income" | "expense" | "transfer",
  string
> = {
  income: "text-emerald-600 dark:text-emerald-400",
  expense: "text-red-500",
  transfer: "text-sky-600 dark:text-sky-400",
};

const PREVIEW_STATUS_META: Record<
  ImportPreviewRow["previewStatus"],
  { label: string; className: string }
> = {
  new: {
    label: "ใหม่",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  duplicate: {
    label: "ซ้ำ",
    className:
      "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  },
  conflict: {
    label: "ต้องตรวจสอบ",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  },
  skipped: {
    label: "ข้าม",
    className:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

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
  }, []);

  // === Validation: can we proceed from mapping? ===
  const canProceedFromMapping = mapping.date !== "" && mapping.amount !== "";
  const hasReviewExceptions =
    importStats.duplicateRows > 0 || importStats.conflictRows > 0;
  const confirmActionLabel =
    importStats.newRows > 0
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
                    ? "bg-emerald-500 text-white"
                    : i < stepIndex
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                )}
              >
                {i < stepIndex ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:block",
                  i === stepIndex
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-400"
                )}
              >
                {label}
              </span>
            </div>
            {i < 3 && (
              <div
                className={cn(
                  "mx-1 h-0.5 w-6 sm:w-10",
                  i < stepIndex ? "bg-emerald-400" : "bg-zinc-200 dark:bg-zinc-700"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/40 dark:bg-red-500/5">
          <FileWarning size={20} className="shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              เกิดข้อผิดพลาด
            </p>
            <p className="text-xs text-red-600 dark:text-red-500">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
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
                ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-500/5"
                : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500",
              isProcessing && "pointer-events-none opacity-60"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 size={48} className="mb-4 animate-spin text-emerald-500" />
                <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
                  กำลังอ่านไฟล์...
                </p>
              </>
            ) : (
              <>
                <Upload size={48} className="mb-4 text-zinc-400" />
                <p className="mb-2 text-lg font-semibold text-zinc-700 dark:text-zinc-200">
                  ลากไฟล์มาวางที่นี่
                </p>
                <p className="mb-1 text-sm text-[color:var(--app-text-muted)]">
                  รองรับ .xlsx, .xls, .csv (สูงสุด 10MB)
                </p>
                <p className="mb-6 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
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
                  <span className="cursor-pointer rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
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
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={16} />
            </button>
          </CardHeader>

          {/* Detection banner */}
          {isMeowjot ? (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/5">
              <Sparkles size={18} className="shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  ตรวจพบรูปแบบ เหมียวจด! (ความเชื่อมั่น {Math.round(confidence * 100)}%)
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                  จับคู่คอลัมน์อัตโนมัติแล้ว — กรุณาตรวจสอบก่อนดำเนินการ
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-500/5">
              <AlertTriangle size={18} className="shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  ไม่ใช่รูปแบบ เหมียวจด — กรุณาจับคู่คอลัมน์เอง
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  พบ {parseResult.columns.length} คอลัมน์,{" "}
                  {parseResult.totalRows} แถวข้อมูล (ชีท: {parseResult.sheetName})
                </p>
              </div>
            </div>
          )}

          {/* File info */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <p className="text-xs text-[color:var(--app-text-muted)]">จำนวนแถว</p>
              <p className="text-lg font-bold text-[color:var(--app-text)]">
                {parseResult.totalRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <p className="text-xs text-[color:var(--app-text-muted)]">จำนวนคอลัมน์</p>
              <p className="text-lg font-bold text-[color:var(--app-text)]">
                {parseResult.columns.length}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
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
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-red-500">*</span>
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
            <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
              ดูข้อมูลดิบ (5 แถวแรก)
            </summary>
            <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800">
                    <th className="px-3 py-2 font-medium text-zinc-500">#</th>
                    {parseResult.columns.map((col) => (
                      <th key={col} className="whitespace-nowrap px-3 py-2 font-medium text-zinc-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {parseResult.rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-zinc-400">{i + 1}</td>
                      {parseResult.columns.map((col) => (
                        <td
                          key={col}
                          className="max-w-[200px] truncate whitespace-nowrap px-3 py-1.5 text-zinc-600 dark:text-zinc-300"
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
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
              <p className="text-xs text-[color:var(--app-text-muted)]">พร้อมตรวจสอบ</p>
              <p className="mt-1 text-2xl font-bold text-[color:var(--app-text)]">
                {importStats.readyRows}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 shadow-sm dark:bg-emerald-500/5">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                รายการใหม่
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {importStats.newRows}
              </p>
            </div>
            <div className="rounded-xl bg-sky-50 p-4 shadow-sm dark:bg-sky-500/5">
              <p className="text-xs text-sky-600 dark:text-sky-400">รายการซ้ำ</p>
              <p className="mt-1 text-2xl font-bold text-sky-700 dark:text-sky-300">
                {importStats.duplicateRows}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 shadow-sm dark:bg-amber-500/5">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ต้องตรวจสอบ
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
                {importStats.conflictRows}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                รายรับ ({importStats.incomeRows})
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatBaht(importStats.totalIncome)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                รายจ่าย ({importStats.expenseRows})
              </p>
              <p className="mt-1 text-2xl font-bold text-red-500">
                {formatBaht(importStats.totalExpense)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                ย้ายเงิน ({importStats.transferRows})
              </p>
              <p className="mt-1 text-2xl font-bold text-sky-600 dark:text-sky-400">
                {formatBaht(importStats.totalTransfer)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
              <p className="text-xs text-[color:var(--app-text-muted)]">ข้ามรายการ</p>
              <p className="mt-1 text-2xl font-bold text-amber-500">
                {importStats.skippedRows}
              </p>
            </div>
          </div>
          {importStats.transferRows > 0 && (
            <p className="text-sm text-sky-700 dark:text-sky-300">
              รายการประเภท “ย้ายเงิน” จะถูกบันทึกไว้เพื่อใช้ตามรอยการเคลื่อนเงิน แต่จะไม่ถูกรวมเป็นรายรับหรือรายจ่ายใน dashboard และ reports
            </p>
          )}

          {/* Preview table */}
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <CardTitle>ตัวอย่างข้อมูลหลังตรวจซ้ำกับฐานข้อมูล (20 แถวแรก)</CardTitle>
                <p className="text-sm text-[color:var(--app-text-muted)]">
                  ระบบจะเพิ่มเฉพาะรายการสถานะ <span className="font-medium text-emerald-600 dark:text-emerald-400">ใหม่</span>{" "}
                  เท่านั้น ส่วนรายการซ้ำหรือรายการที่ใกล้เคียงจะถูกกันออกไว้ก่อน
                </p>
                {hasReviewExceptions && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    พบรายการซ้ำหรือรายการที่ควรตรวจสอบก่อนนำเข้า กรุณาเช็กแถวที่มีสถานะไม่ใช่ “ใหม่”
                  </p>
                )}
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2.5 pr-3 text-xs font-medium text-zinc-500">#</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-zinc-500">สถานะ</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-zinc-500">วันที่</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-zinc-500">เวลา</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-zinc-500">ประเภท</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-zinc-500">หมวดหมู่</th>
                    <th className="py-2.5 pr-3 text-right text-xs font-medium text-zinc-500">จำนวน</th>
                    <th className="py-2.5 pr-3 text-xs font-medium text-zinc-500">โน้ต</th>
                    <th className="py-2.5 text-xs font-medium text-zinc-500">ช่องทาง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {previewRows.slice(0, 20).map((row, i) => {
                    const tx = row.transaction;

                    return (
                      <tr
                        key={`${row.rowNumber}-${row.previewStatus}`}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        <td className="py-2 pr-3 text-xs text-zinc-400">{i + 1}</td>
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
                        <td className="whitespace-nowrap py-2 pr-3 text-zinc-600 dark:text-zinc-300">
                          {tx?.date ?? "-"}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3 text-zinc-500 dark:text-zinc-400">
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
                            <span className="text-xs text-zinc-400">-</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-zinc-700 dark:text-zinc-200">
                          {tx?.category || "-"}
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap py-2 pr-3 text-right font-medium",
                            tx && TRANSACTION_TYPE_AMOUNT_CLASS[tx.type],
                            !tx && "text-zinc-400"
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {previewRows.length > 20 && (
                <p className="py-3 text-center text-xs text-zinc-400">
                  ...และอีก {previewRows.length - 20} รายการ
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <Button variant="ghost" onClick={() => setStep("mapping")}>
                <ArrowLeft size={16} />
                แก้ไขการจับคู่
              </Button>
              <Button
                onClick={() => void confirmImport()}
                disabled={!previewRunId || isCommitting}
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
          <CheckCircle size={64} className="mx-auto mb-4 text-emerald-500" />
          <h2 className="text-2xl font-bold text-[color:var(--app-text)]">
            {importStats.committedRows > 0 ? "นำเข้าสำเร็จ!" : "ตรวจสอบข้อมูลเสร็จสิ้น"}
          </h2>
          <p className="mt-2 text-sm text-[color:var(--app-text-muted)]">
            เพิ่มใหม่{" "}
            <span className="font-bold text-[color:var(--app-text)]">
              {importStats.committedRows.toLocaleString()}
            </span>{" "}
            รายการจาก{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              {fileName}
            </span>
          </p>

          {/* Summary */}
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/5">
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                เพิ่มสำเร็จ
              </p>
              <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {importStats.committedRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-sky-50 p-3 dark:bg-sky-500/5">
              <p className="text-xs text-sky-600 dark:text-sky-400">รายการซ้ำ</p>
              <p className="mt-1 text-lg font-bold text-sky-700 dark:text-sky-300">
                {importStats.duplicateRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-500/5">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ต้องตรวจสอบ
              </p>
              <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">
                {importStats.conflictRows.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800">
              <p className="text-xs text-[color:var(--app-text-muted)]">ข้ามรายการ</p>
              <p className="mt-1 text-lg font-bold text-zinc-700 dark:text-zinc-200">
                {importStats.skippedRows.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mx-auto mt-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-900">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                รายรับ ({importStats.incomeRows})
              </p>
              <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatBaht(importStats.totalIncome)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-900">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                รายจ่าย ({importStats.expenseRows})
              </p>
              <p className="mt-1 text-lg font-bold text-red-500">
                {formatBaht(importStats.totalExpense)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-900">
              <p className="text-xs text-[color:var(--app-text-muted)]">
                ย้ายเงิน ({importStats.transferRows})
              </p>
              <p className="mt-1 text-lg font-bold text-sky-600 dark:text-sky-400">
                {formatBaht(importStats.totalTransfer)}
              </p>
            </div>
          </div>

          <div className="mx-auto mt-3 max-w-2xl space-y-2">
            {(importStats.duplicateRows > 0 || importStats.conflictRows > 0) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ระบบกันรายการซ้ำและรายการที่ใกล้เคียงออกจากการเพิ่มอัตโนมัติแล้ว เพื่อป้องกันข้อมูลซ้ำใน dashboard
              </p>
            )}
            {importStats.transferRows > 0 && (
              <p className="text-xs text-sky-700 dark:text-sky-300">
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
