import * as XLSX from "xlsx";

/** Raw row parsed from Excel/CSV — values are all strings */
export type RawRow = Record<string, string>;

/** Result of parsing a file */
export interface ParseResult {
  columns: string[];
  rows: RawRow[];
  sheetName: string;
  totalRows: number;
}

/**
 * Known เหมียวจด column names for auto-detection.
 * The app exports with these exact Thai headers.
 */
export const MEOWJOT_COLUMNS = [
  "วันที่",
  "เวลา",
  "ประเภท",
  "หมวดหมู่",
  "แท็ก",
  "จำนวน",
  "โน้ต",
  "ช่องทางจ่าย",
  "จ่ายจาก",
  "ธนาคารผู้รับ",
  "ผู้รับ",
] as const;

/**
 * Mapping from our internal field names to what เหมียวจด uses.
 * Used for auto-mapping when the format is detected.
 */
export interface ColumnMapping {
  date: string;
  time: string;
  type: string;
  category: string;
  tag: string;
  amount: string;
  note: string;
  paymentChannel: string;
  payFrom: string;
  recipientBank: string;
  recipient: string;
}

/** Empty mapping */
export const EMPTY_MAPPING: ColumnMapping = {
  date: "",
  time: "",
  type: "",
  category: "",
  tag: "",
  amount: "",
  note: "",
  paymentChannel: "",
  payFrom: "",
  recipientBank: "",
  recipient: "",
};

/**
 * Parse an uploaded file (xlsx, xls, csv) into structured data.
 * Returns columns (header names) and rows as key-value records.
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON — header row becomes keys
  const jsonData = XLSX.utils.sheet_to_json<RawRow>(sheet, {
    defval: "",
    raw: false,
  });

  if (jsonData.length === 0) {
    return { columns: [], rows: [], sheetName, totalRows: 0 };
  }

  // Extract column names from first row's keys
  const columns = Object.keys(jsonData[0]);

  // Convert all values to strings
  const rows: RawRow[] = jsonData.map((row) => {
    const cleaned: RawRow = {};
    for (const key of columns) {
      cleaned[key] = String(row[key] ?? "").trim();
    }
    return cleaned;
  });

  return { columns, rows, sheetName, totalRows: rows.length };
}

/**
 * Detect if the parsed file is from เหมียวจด by checking column names.
 * Returns a confidence score 0-1 and the auto-mapped columns.
 */
export function detectMeowjotFormat(columns: string[]): {
  isMeowjot: boolean;
  confidence: number;
  autoMapping: ColumnMapping;
} {
  const colSet = new Set(columns.map((c) => c.trim()));

  // Check how many known เหมียวจด columns match
  const knownCols = MEOWJOT_COLUMNS;
  let matches = 0;
  for (const col of knownCols) {
    if (colSet.has(col)) matches++;
  }

  const confidence = knownCols.length > 0 ? matches / knownCols.length : 0;
  const isMeowjot = confidence >= 0.5; // At least 50% of known columns found

  // Build auto-mapping by looking for exact or fuzzy matches
  const autoMapping: ColumnMapping = { ...EMPTY_MAPPING };

  // Helper: find a column that matches exactly or contains the keyword
  const findCol = (keywords: string[]): string => {
    // Exact match first
    for (const kw of keywords) {
      const exact = columns.find((c) => c.trim() === kw);
      if (exact) return exact;
    }
    // Partial match
    for (const kw of keywords) {
      const partial = columns.find((c) =>
        c.trim().toLowerCase().includes(kw.toLowerCase())
      );
      if (partial) return partial;
    }
    return "";
  };

  autoMapping.date = findCol(["วันที่", "date", "Date", "วัน"]);
  autoMapping.time = findCol(["เวลา", "time", "Time"]);
  autoMapping.type = findCol(["ประเภท", "type", "Type"]);
  autoMapping.category = findCol(["หมวดหมู่", "category", "Category", "หมวด"]);
  autoMapping.tag = findCol(["แท็ก", "tag", "Tag"]);
  autoMapping.amount = findCol(["จำนวน", "amount", "Amount", "จำนวนเงิน"]);
  autoMapping.note = findCol(["โน้ต", "note", "Note", "หมายเหตุ"]);
  autoMapping.paymentChannel = findCol(["ช่องทางจ่าย", "payment", "Payment"]);
  autoMapping.payFrom = findCol(["จ่ายจาก", "payFrom", "from"]);
  autoMapping.recipientBank = findCol(["ธนาคารผู้รับ", "bank"]);
  autoMapping.recipient = findCol(["ผู้รับ", "recipient", "Recipient"]);

  return { isMeowjot, confidence, autoMapping };
}

/**
 * Convert a date string from เหมียวจด format (DD/MM/YYYY) to ISO (YYYY-MM-DD).
 * Also handles YYYY-MM-DD if already in that format.
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 10);
  }

  // DD/MM/YYYY format (common in Thai exports)
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // DD-MM-YYYY format
  const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Fallback: try native Date parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return dateStr;
}

/**
 * Determine transaction type from เหมียวจด's ประเภท column and/or amount sign.
 * เหมียวจด uses: "รายจ่าย" (expense), "รายรับ" (income)
 * Amount is negative for expenses, positive for income.
 */
export function resolveTransactionType(
  typeStr: string,
  amount: number
): "income" | "expense" {
  const normalized = typeStr.trim().toLowerCase();

  if (normalized.includes("รายรับ") || normalized.includes("income")) {
    return "income";
  }
  if (normalized.includes("รายจ่าย") || normalized.includes("expense")) {
    return "expense";
  }

  // Fallback: use amount sign
  return amount >= 0 ? "income" : "expense";
}
