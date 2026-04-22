"use client";

import { useCallback } from "react";
import { useFinanceStore } from "@/store/finance-store";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_LABELS_EN,
  type AccountType,
} from "@/lib/types";

export type Language = "th" | "en";

type Dict = Record<string, string>;

const th: Dict = {
  // Nav
  "nav.dashboard": "แดชบอร์ด",
  "nav.accounts": "บัญชี",
  "nav.transactions": "รายการ",
  "nav.import": "นำเข้า",
  "nav.buckets": "ออมเป้า",
  "nav.investments": "การลงทุน",
  "nav.reports": "รายงาน",

  // Branding / shell
  "brand.name": "เหมียวเงิน",
  "brand.tagline": "เหมียวจดให้เรียบร้อย",
  "app.version": "MoneyCat Tracker v1.0",
  "tooltip.toggleSidebar": "ย่อ/ขยายแถบเมนู",
  "tooltip.toggleTheme": "สลับโหมดสว่าง/มืด",
  "tooltip.toggleLanguage": "สลับภาษา ไทย/อังกฤษ",

  // Common actions
  "action.manage": "จัดการ",
  "action.add": "เพิ่ม",
  "action.edit": "แก้ไข",
  "action.save": "บันทึก",
  "action.cancel": "ยกเลิก",
  "action.delete": "ลบ",
  "action.viewAll": "ดูทั้งหมด",
  "action.expand": "ขยาย",
  "action.collapse": "ย่อ",
  "action.showMore": "ดูเพิ่มเติม",
  "action.showLess": "ย่อ",

  // Dashboard / summary
  "summary.netWorth": "มูลค่าสุทธิ",
  "summary.assets": "สินทรัพย์",
  "summary.liabilities": "หนี้สิน",
  "summary.totalIncome": "รายรับรวม",
  "summary.totalExpense": "รายจ่ายรวม",
  "summary.netCashflow": "เงินคงเหลือ",
  "summary.savingsRate": "อัตราการออม",
  "summary.surplus": "เหลือเก็บ",
  "summary.deficit": "ขาดดุล",
  "summary.goalHit": "เป้าหมายผ่าน",
  "summary.needsWork": "ต้องปรับปรุง",
  "summary.activeAccounts": "บัญชีที่ใช้งาน",
  "summary.noData": "ยังไม่มีข้อมูลที่นำเข้า",
  "summary.yearSummary": "สรุปจากรายการปี",
  "summary.noYearData": "ยังไม่มีรายการในปี",

  // Accounts
  "accounts.title": "บัญชี",
  "accounts.balance": "ยอดคงเหลือ",
  "accounts.manage": "จัดการบัญชี",
  "accounts.add": "เพิ่มบัญชี",
  "accounts.empty.title": "ยังไม่มีบัญชี",
  "accounts.empty.desc": "เพิ่มกระเป๋าเงิน บัญชีธนาคาร หรือบัตรเครดิต เพื่อให้เหมียวช่วยจับคู่อัตโนมัติตอนนำเข้า",
  "accounts.goToAccounts": "ไปหน้าบัญชี",
  "accounts.showAll": "ดูทุกบัญชี",
  "accounts.collapse": "ย่อกลับ",
  "accounts.dragHint": "ลากการ์ดเพื่อจัดเรียงใหม่",

  // Transactions
  "tx.title": "รายการ",
  "tx.date": "วันที่",
  "tx.amount": "จำนวน",
  "tx.type": "ประเภท",
  "tx.category": "หมวด",
  "tx.note": "บันทึก",
  "tx.account": "บัญชี",
  "tx.income": "รายรับ",
  "tx.expense": "รายจ่าย",
  "tx.transfer": "โอน",
  "tx.filters": "ตัวกรอง",
  "tx.clearFilters": "ล้างตัวกรอง",
  "tx.noResults": "ไม่พบรายการ",

  // Investments
  "invest.title": "การลงทุน",
  "invest.portfolio": "มูลค่าพอร์ต",
  "invest.allocation": "สัดส่วนการลงทุน",
  "invest.topGainer": "กำไรสูงสุด",
  "invest.topLoser": "ขาดทุนสูงสุด",
  "invest.taxSaved": "ประหยัดภาษี",
  "invest.holdings": "สินทรัพย์ในพอร์ต",
  "invest.units": "หน่วย",
  "invest.cost": "ต้นทุน",
  "invest.marketValue": "มูลค่าปัจจุบัน",
  "invest.unrealizedPL": "กำไร/ขาดทุน",

  // Reports
  "reports.title": "รายงาน",
  "reports.monthlyReport": "รายงานประจำเดือน",
};

const en: Dict = {
  // Nav
  "nav.dashboard": "Dashboard",
  "nav.accounts": "Accounts",
  "nav.transactions": "Transactions",
  "nav.import": "Import",
  "nav.buckets": "Buckets",
  "nav.investments": "Investments",
  "nav.reports": "Reports",

  // Branding / shell
  "brand.name": "Meowsliver",
  "brand.tagline": "Neatly logged by the cat",
  "app.version": "MoneyCat Tracker v1.0",
  "tooltip.toggleSidebar": "Collapse/expand sidebar",
  "tooltip.toggleTheme": "Toggle light/dark",
  "tooltip.toggleLanguage": "Switch TH / EN",

  // Common actions
  "action.manage": "Manage",
  "action.add": "Add",
  "action.edit": "Edit",
  "action.save": "Save",
  "action.cancel": "Cancel",
  "action.delete": "Delete",
  "action.viewAll": "View all",
  "action.expand": "Expand",
  "action.collapse": "Collapse",
  "action.showMore": "Show more",
  "action.showLess": "Show less",

  // Dashboard / summary
  "summary.netWorth": "Net Worth",
  "summary.assets": "Assets",
  "summary.liabilities": "Liabilities",
  "summary.totalIncome": "Total Income",
  "summary.totalExpense": "Total Expense",
  "summary.netCashflow": "Net Cashflow",
  "summary.savingsRate": "Savings Rate",
  "summary.surplus": "Surplus",
  "summary.deficit": "Deficit",
  "summary.goalHit": "Goal hit",
  "summary.needsWork": "Needs work",
  "summary.activeAccounts": "active accounts",
  "summary.noData": "No imported data yet",
  "summary.yearSummary": "From transactions in",
  "summary.noYearData": "No transactions in",

  // Accounts
  "accounts.title": "Accounts",
  "accounts.balance": "Balance",
  "accounts.manage": "Manage accounts",
  "accounts.add": "Add account",
  "accounts.empty.title": "No accounts yet",
  "accounts.empty.desc": "Add a wallet, bank account, or credit card so the cat can auto-match them on import.",
  "accounts.goToAccounts": "Go to accounts",
  "accounts.showAll": "Show all accounts",
  "accounts.collapse": "Collapse",
  "accounts.dragHint": "Drag cards to reorder",

  // Transactions
  "tx.title": "Transactions",
  "tx.date": "Date",
  "tx.amount": "Amount",
  "tx.type": "Type",
  "tx.category": "Category",
  "tx.note": "Note",
  "tx.account": "Account",
  "tx.income": "Income",
  "tx.expense": "Expense",
  "tx.transfer": "Transfer",
  "tx.filters": "Filters",
  "tx.clearFilters": "Clear filters",
  "tx.noResults": "No results",

  // Investments
  "invest.title": "Investments",
  "invest.portfolio": "Portfolio value",
  "invest.allocation": "Allocation",
  "invest.topGainer": "Top gainer",
  "invest.topLoser": "Top loser",
  "invest.taxSaved": "Tax saved",
  "invest.holdings": "Holdings",
  "invest.units": "Units",
  "invest.cost": "Cost",
  "invest.marketValue": "Market value",
  "invest.unrealizedPL": "Unrealized P/L",

  // Reports
  "reports.title": "Reports",
  "reports.monthlyReport": "Monthly report",
};

const dictionaries: Record<Language, Dict> = { th, en };

/**
 * Hook that returns a translation function bound to the current language.
 * Falls back to the key itself if a translation is missing, so missing
 * keys are immediately visible during development.
 */
export function useT() {
  const language = useFinanceStore((s) => s.language);
  const dict = dictionaries[language] ?? dictionaries.th;
  return useCallback((key: string): string => dict[key] ?? key, [dict]);
}

/** Non-hook accessor for cases where a component isn't available (server helpers, etc). */
export function translate(language: Language, key: string): string {
  return (dictionaries[language] ?? dictionaries.th)[key] ?? key;
}

/**
 * Inline-pair translator — returns a function that picks between Thai and
 * English strings based on the current UI language.
 *
 * Use this for one-off strings (page copy, button labels tied to a specific
 * screen, modal text) where a dict key is overkill. Keeps both languages
 * next to each other in the JSX so translations are easy to review and
 * nothing can fall out of sync.
 *
 * For shared strings used in many places (nav, summary card labels, etc.),
 * prefer `useT()` + the dictionary so a single edit updates everywhere.
 *
 * @example
 *   const tr = useTr();
 *   <button>{tr("เพิ่มบัญชี", "Add account")}</button>
 */
export function useTr() {
  const language = useFinanceStore((s) => s.language);
  return useCallback(
    (th: string, en: string): string => (language === "en" ? en : th),
    [language]
  );
}

/** Read the current language directly, for conditional rendering. */
export function useLanguage(): Language {
  return useFinanceStore((s) => s.language);
}

/**
 * Returns the translated AccountType label map for the current language.
 * Call it once per component then index with `labels[account.type]`.
 */
export function useAccountTypeLabels(): Record<AccountType, string> {
  const language = useFinanceStore((s) => s.language);
  return language === "en" ? ACCOUNT_TYPE_LABELS_EN : ACCOUNT_TYPE_LABELS;
}

/** Non-hook variant for use inside render helpers that already have language. */
export function getAccountTypeLabel(
  type: AccountType,
  language: Language
): string {
  return (language === "en" ? ACCOUNT_TYPE_LABELS_EN : ACCOUNT_TYPE_LABELS)[
    type
  ];
}
