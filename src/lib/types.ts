// ===== Core Transaction Types =====
export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  date: string; // ISO date string
  amount: number;
  category: string;
  subcategory?: string;
  type: TransactionType;
  note?: string;
  bucket?: string; // which asset bucket
}

// ===== Asset Allocation Types =====
export type AssetCategory =
  | "cash"
  | "bank_savings"
  | "bank_fixed"
  | "stocks"
  | "etf"
  | "crypto"
  | "ssf"
  | "rmf"
  | "gold"
  | "p2p"
  | "real_estate"
  | "insurance"
  | "other_investment";

export type LiabilityCategory =
  | "credit_card"
  | "personal_loan"
  | "car_loan"
  | "mortgage"
  | "overdraft"
  | "other_debt";

export interface AssetItem {
  category: AssetCategory;
  label: string;
  amount: number;
  color: string;
}

export interface LiabilityItem {
  category: LiabilityCategory;
  label: string;
  amount: number;
  color: string;
}

// ===== Savings Bucket Types =====
export interface SavingsBucket {
  id: string;
  name: string;
  icon: string;
  currentAmount: number;
  targetAmount: number;
  investmentType: string;
  color: string;
}

// ===== Investment Types =====
export interface InvestmentHolding {
  id: string;
  name: string;
  ticker?: string;
  type: AssetCategory;
  units: number;
  avgCost: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

// ===== Cashflow Types =====
export interface MonthlyCashflow {
  month: string;
  monthIndex: number;
  income: number;
  expense: number;
  net: number;
}

export interface YearlySummary {
  year: number;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  savingsRate: number;
  netWorth: number;
  netWorthGrowth: number;
}

// ===== Category Constants =====
export const EXPENSE_CATEGORIES = [
  "อาหาร/เครื่องดื่ม",
  "ค่าเดินทาง",
  "ที่พัก/ค่าเช่า",
  "ค่าน้ำ/ค่าไฟ",
  "โทรศัพท์/อินเทอร์เน็ต",
  "ช้อปปิ้ง",
  "สุขภาพ/ยา",
  "ประกัน",
  "การศึกษา",
  "บันเทิง",
  "บัตรเครดิต",
  "ผ่อนรถ",
  "ผ่อนบ้าน",
  "ลงทุน SSF",
  "ลงทุน RMF",
  "ลงทุน Crypto",
  "ลงทุนหุ้น/ETF",
  "ลงทุนทอง",
  "อื่นๆ",
] as const;

export const INCOME_CATEGORIES = [
  "เงินเดือน",
  "โบนัส",
  "ฟรีแลนซ์",
  "ปันผล",
  "ดอกเบี้ย",
  "ขายของ",
  "เงินคืนภาษี",
  "อื่นๆ",
] as const;

export const QUICK_TEMPLATES = [
  { label: "กินข้าว", category: "อาหาร/เครื่องดื่ม", type: "expense" as const, amount: 200 },
  { label: "บัตรเครดิต", category: "บัตรเครดิต", type: "expense" as const, amount: 0 },
  { label: "โอน SSF", category: "ลงทุน SSF", type: "expense" as const, amount: 0 },
  { label: "โอน RMF", category: "ลงทุน RMF", type: "expense" as const, amount: 0 },
  { label: "เงินเดือน", category: "เงินเดือน", type: "income" as const, amount: 0 },
  { label: "ค่าเช่า", category: "ที่พัก/ค่าเช่า", type: "expense" as const, amount: 0 },
] as const;
