import type { Transaction, TransactionType } from "@/lib/types";
import { THAI_MONTHS, THAI_MONTHS_FULL } from "@/lib/utils";

// -----------------------------------------------------------------------------
// Monthly detail analytics
//
// ใช้สำหรับหน้า /reports/[year]/[month] — ต้องการ:
//   1) รายการทั้งหมดของเดือนนั้น (เรียง desc by date+time)
//   2) ตัวเลขรวม: income/expense/transfer + net
//   3) breakdown รายวันเพื่อ stack/bar chart
//   4) breakdown หลายมิติ: category, subcategory, tag, paymentChannel,
//      payFrom, recipient — เพื่อโชว์เป็น filter chips + อันดับ top spenders
//   5) ข้อมูลให้ drawer ใช้คำนวณ "รายการนี้คิดเป็นกี่ %" ของยอดเดือน/หมวด
// -----------------------------------------------------------------------------

export interface MonthlyTotals {
  income: number;
  expense: number;
  transfer: number;
  net: number;
  count: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
}

export interface DailyBucket {
  /** Day of month, 1-based (1..31) */
  day: number;
  /** YYYY-MM-DD for tooltip / cross-link */
  date: string;
  income: number;
  expense: number;
  transfer: number;
  net: number;
}

export interface DimensionSlice {
  /** Display label, never empty (uses "ไม่ระบุ" placeholder when missing) */
  label: string;
  /** Raw value (undefined when label === "ไม่ระบุ") — used for filter equality */
  value: string | undefined;
  amount: number;
  count: number;
  /** Share of the dimension's total (0..1). Useful for chip badges. */
  share: number;
}

export type Dimension =
  | "category"
  | "subcategory"
  | "tag"
  | "paymentChannel"
  | "payFrom"
  | "recipient";

export interface MonthlyDetail {
  year: number;
  monthIndex: number; // 0..11
  monthLabel: string; // "ก.พ."
  monthLabelFull: string; // "กุมภาพันธ์"
  transactions: Transaction[];
  totals: MonthlyTotals;
  daily: DailyBucket[];
  /** Breakdowns per filterable dimension, computed across the month's expense rows */
  breakdowns: Record<Dimension, DimensionSlice[]>;
}

const MISSING_LABEL = "ไม่ระบุ";

function ymd(tx: Transaction): { year: number; monthIndex: number; day: number } {
  // Manual parse instead of `new Date` to avoid timezone drift on YYYY-MM-DD.
  const [y, m, d] = tx.date.split("-").map((part) => Number.parseInt(part, 10));
  return { year: y, monthIndex: (m ?? 1) - 1, day: d ?? 1 };
}

function compareTxDateTimeDesc(a: Transaction, b: Transaction) {
  const left = `${a.date}T${a.time ?? "00:00"}`;
  const right = `${b.date}T${b.time ?? "00:00"}`;
  return right.localeCompare(left);
}

function daysInMonth(year: number, monthIndex: number): number {
  // Day 0 of next month = last day of current month.
  return new Date(year, monthIndex + 1, 0).getDate();
}

function pickDimension(tx: Transaction, dim: Dimension): string | undefined {
  switch (dim) {
    case "category":
      return tx.category;
    case "subcategory":
      return tx.subcategory;
    case "tag":
      return tx.tag;
    case "paymentChannel":
      return tx.paymentChannel;
    case "payFrom":
      return tx.payFrom;
    case "recipient":
      return tx.recipient;
  }
}

// Exported so pages can compute breakdowns on arbitrary subsets (e.g. the
// transactions inside a chart-bar range), without re-running the whole
// monthly detail pipeline.
export function buildBreakdown(
  txs: Transaction[],
  dim: Dimension,
  // Which transaction types contribute. `expense` matters most for "where money
  // went"; income breakdowns can use this with type === "income" later.
  includeTypes: TransactionType[] = ["expense"]
): DimensionSlice[] {
  const includeSet = new Set(includeTypes);
  const totals = new Map<string | undefined, { amount: number; count: number }>();

  for (const tx of txs) {
    if (!includeSet.has(tx.type)) continue;
    const value = pickDimension(tx, dim);
    const key = value ?? undefined;
    const prev = totals.get(key) ?? { amount: 0, count: 0 };
    totals.set(key, { amount: prev.amount + tx.amount, count: prev.count + 1 });
  }

  const grandTotal = [...totals.values()].reduce((sum, slot) => sum + slot.amount, 0);

  return [...totals.entries()]
    .map(([value, slot]) => ({
      label: value ?? MISSING_LABEL,
      value,
      amount: slot.amount,
      count: slot.count,
      share: grandTotal > 0 ? slot.amount / grandTotal : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// -----------------------------------------------------------------------------
// Granularity rollup
//
// แปลง daily buckets เป็น "รายวัน / รายอาทิตย์ / รายเดือน" สำหรับ chart
// เลือก week boundary แบบ 7-day chunks เริ่มจากวันที่ 1 (1-7, 8-14, ...) ไม่
// ใช้ ISO week เพราะอ่านง่ายและไม่ตัดเดือนข้าม → ทุก bucket อยู่ในเดือนเดียวกัน
// -----------------------------------------------------------------------------

export type Granularity = "day" | "week" | "month";

export interface RolledBucket {
  /** Display label e.g. "1", "สัปดาห์ที่ 2", "ก.พ." */
  label: string;
  income: number;
  expense: number;
  /** Inclusive ISO date bounds — feeds straight into MonthlyFilterState. */
  dateFrom: string;
  dateTo: string;
  /** Human-readable range label for the active filter chip. */
  rangeLabel: string;
}

export function rollupDaily(
  daily: DailyBucket[],
  monthLabelFull: string,
  granularity: Granularity
): RolledBucket[] {
  if (daily.length === 0) return [];

  if (granularity === "day") {
    return daily.map((bucket) => ({
      label: String(bucket.day),
      income: bucket.income,
      expense: bucket.expense,
      dateFrom: bucket.date,
      dateTo: bucket.date,
      rangeLabel: `วันที่ ${bucket.day}`,
    }));
  }

  if (granularity === "month") {
    const totals = daily.reduce(
      (acc, bucket) => ({
        income: acc.income + bucket.income,
        expense: acc.expense + bucket.expense,
      }),
      { income: 0, expense: 0 }
    );
    return [
      {
        label: monthLabelFull,
        income: totals.income,
        expense: totals.expense,
        dateFrom: daily[0]!.date,
        dateTo: daily[daily.length - 1]!.date,
        rangeLabel: `ทั้งเดือน ${monthLabelFull}`,
      },
    ];
  }

  // week — chunk by 7 days from day 1
  const buckets: RolledBucket[] = [];
  for (let start = 0; start < daily.length; start += 7) {
    const chunk = daily.slice(start, start + 7);
    const weekIndex = Math.floor(start / 7) + 1;
    buckets.push({
      label: `ส${weekIndex}`,
      income: chunk.reduce((sum, b) => sum + b.income, 0),
      expense: chunk.reduce((sum, b) => sum + b.expense, 0),
      dateFrom: chunk[0]!.date,
      dateTo: chunk[chunk.length - 1]!.date,
      rangeLabel: `สัปดาห์ที่ ${weekIndex} (${chunk[0]!.day}-${chunk[chunk.length - 1]!.day})`,
    });
  }
  return buckets;
}

// Build a nested breakdown: for every value of `primary`, get its breakdown
// by `secondary`. Used by the category pie tooltip to show "หมวด → tags
// ภายในนั้น" without re-iterating the full dataset on every hover.
export function buildSubBreakdownByValue(
  txs: Transaction[],
  primary: Dimension,
  secondary: Dimension,
  includeTypes: TransactionType[] = ["expense"]
): Map<string, DimensionSlice[]> {
  const includeSet = new Set(includeTypes);
  const groups = new Map<string, Transaction[]>();

  for (const tx of txs) {
    if (!includeSet.has(tx.type)) continue;
    const value = pickDimension(tx, primary);
    if (value === undefined) continue;
    const bucket = groups.get(value) ?? [];
    bucket.push(tx);
    groups.set(value, bucket);
  }

  const result = new Map<string, DimensionSlice[]>();
  for (const [primaryValue, group] of groups) {
    // Tag/recipient sub-views care about "ไม่ระบุ" too — user wants to know
    // how much money in this category had no tag. Don't filter undefined.
    result.set(primaryValue, buildBreakdown(group, secondary, includeTypes));
  }
  return result;
}

// Pure totals helper — works on any subset of transactions (whole month,
// clicked-day range, fully-filtered table view, etc).
export function computeTotals(transactions: Transaction[]): MonthlyTotals {
  const totals: MonthlyTotals = {
    income: 0,
    expense: 0,
    transfer: 0,
    net: 0,
    count: transactions.length,
    incomeCount: 0,
    expenseCount: 0,
    transferCount: 0,
  };

  for (const tx of transactions) {
    if (tx.type === "income") {
      totals.income += tx.amount;
      totals.incomeCount += 1;
    } else if (tx.type === "expense") {
      totals.expense += tx.amount;
      totals.expenseCount += 1;
    } else {
      totals.transfer += tx.amount;
      totals.transferCount += 1;
    }
  }
  totals.net = totals.income - totals.expense;
  return totals;
}

export function getMonthlyDetailFromTransactions(
  transactions: Transaction[],
  year: number,
  monthIndex: number
): MonthlyDetail {
  const monthly = transactions.filter((tx) => {
    const parts = ymd(tx);
    return parts.year === year && parts.monthIndex === monthIndex;
  });

  // Sort once — both `transactions` view and `daily` derivation read this.
  const sortedDesc = [...monthly].sort(compareTxDateTimeDesc);

  const totals = computeTotals(monthly);

  // Pre-allocate every day in the month so charts get a stable x-axis even on
  // days with zero activity.
  const dayCount = daysInMonth(year, monthIndex);
  const daily: DailyBucket[] = Array.from({ length: dayCount }, (_, idx) => {
    const day = idx + 1;
    const date = `${year.toString().padStart(4, "0")}-${(monthIndex + 1)
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    return { day, date, income: 0, expense: 0, transfer: 0, net: 0 };
  });

  for (const tx of monthly) {
    const { day } = ymd(tx);
    const bucket = daily[day - 1];
    if (!bucket) continue;
    if (tx.type === "income") bucket.income += tx.amount;
    else if (tx.type === "expense") bucket.expense += tx.amount;
    else bucket.transfer += tx.amount;
    bucket.net = bucket.income - bucket.expense;
  }

  const breakdowns: Record<Dimension, DimensionSlice[]> = {
    category: buildBreakdown(monthly, "category"),
    subcategory: buildBreakdown(monthly, "subcategory"),
    tag: buildBreakdown(monthly, "tag"),
    paymentChannel: buildBreakdown(monthly, "paymentChannel"),
    payFrom: buildBreakdown(monthly, "payFrom"),
    recipient: buildBreakdown(monthly, "recipient"),
  };

  return {
    year,
    monthIndex,
    monthLabel: THAI_MONTHS[monthIndex] ?? "",
    monthLabelFull: THAI_MONTHS_FULL[monthIndex] ?? "",
    transactions: sortedDesc,
    totals,
    daily,
    breakdowns,
  };
}

// -----------------------------------------------------------------------------
// Filter pipeline
//
// ใช้บน client หลังจาก getMonthlyDetailFromTransactions แล้ว เพื่อกรองรายการ
// ตาม chip ที่ user เลือก โดยที่ตัวเลข totals ของเดือนยังคงอ้างอิง "ก่อนกรอง"
// (เพื่อให้ drawer คำนวณ % contribution ต่อยอดทั้งเดือนได้ถูก)
// -----------------------------------------------------------------------------

export interface MonthlyFilterState {
  // Each Set holds the *raw* dimension value the user opted into. Empty Set
  // means "ไม่กรองมิตินี้". `undefined` is the sentinel for "ไม่ระบุ" rows.
  types: Set<TransactionType>;
  categories: Set<string>;
  subcategories: Set<string>;
  tags: Set<string>;
  paymentChannels: Set<string>;
  payFroms: Set<string>;
  recipients: Set<string>;
  search: string;
  amountMin?: number;
  amountMax?: number;
  /** Inclusive YYYY-MM-DD bounds. Set both via chart bar click (one day or
   *  one week range), or leave undefined for "all month". String compare on
   *  ISO dates is correct because YYYY-MM-DD sorts lexicographically. */
  dateFrom?: string;
  dateTo?: string;
  /** Optional human-readable label for the active range chip — preserves the
   *  user's *intent* (e.g. "วันที่ 7" vs "สัปดาห์ที่ 2") rather than asking
   *  the chip to reverse-engineer it from from/to. */
  dateRangeLabel?: string;
}

export const EMPTY_FILTER_STATE: MonthlyFilterState = {
  types: new Set(),
  categories: new Set(),
  subcategories: new Set(),
  tags: new Set(),
  paymentChannels: new Set(),
  payFroms: new Set(),
  recipients: new Set(),
  search: "",
};

// User-chosen semantics: **AND between dimensions, OR within a dimension**.
//   - Empty Set = ไม่กรอง dimension นั้น
//   - คลิก chip เพิ่มใน dimension เดิม → ขยายผล (union)
//   - ข้าม dimension → ผลแคบลง (intersection)
// Search/amount range เป็น additional AND filters.
export function applyMonthlyFilters(
  transactions: Transaction[],
  filters: MonthlyFilterState
): Transaction[] {
  const needle = filters.search.trim().toLowerCase();

  // OR-within helper: empty set means "ไม่กรอง"; otherwise the row's value
  // must be in the set. `null` represents the "ไม่ระบุ" sentinel via the
  // string "__missing__" so users can opt to filter for unlabeled rows later.
  const matchesDimension = (
    set: Set<string>,
    value: string | undefined
  ): boolean => {
    if (set.size === 0) return true;
    return value !== undefined && set.has(value);
  };

  return transactions.filter((tx) => {
    if (filters.types.size > 0 && !filters.types.has(tx.type)) return false;
    if (!matchesDimension(filters.categories, tx.category)) return false;
    if (!matchesDimension(filters.subcategories, tx.subcategory)) return false;
    if (!matchesDimension(filters.tags, tx.tag)) return false;
    if (!matchesDimension(filters.paymentChannels, tx.paymentChannel)) return false;
    if (!matchesDimension(filters.payFroms, tx.payFrom)) return false;
    if (!matchesDimension(filters.recipients, tx.recipient)) return false;

    if (filters.amountMin !== undefined && tx.amount < filters.amountMin) return false;
    if (filters.amountMax !== undefined && tx.amount > filters.amountMax) return false;

    if (filters.dateFrom && tx.date < filters.dateFrom) return false;
    if (filters.dateTo && tx.date > filters.dateTo) return false;

    if (needle) {
      const haystack = [
        tx.category,
        tx.subcategory,
        tx.note,
        tx.recipient,
        tx.payFrom,
        tx.paymentChannel,
        tx.tag,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });
}
