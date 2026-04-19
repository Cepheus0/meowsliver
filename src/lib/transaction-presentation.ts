import type { TransactionType } from "@/lib/types";

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "รายรับ",
  expense: "รายจ่าย",
  transfer: "ย้ายเงิน",
};

const TRANSACTION_TYPE_LABELS_EN: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

const TRANSACTION_DEFAULT_CATEGORIES: Record<TransactionType, string> = {
  income: "รายรับ",
  expense: "รายจ่าย",
  transfer: "ย้ายเงิน",
};

const TRANSACTION_AMOUNT_PREFIXES: Record<TransactionType, string> = {
  income: "+",
  expense: "-",
  transfer: "",
};

export function getTransactionTypeLabel(
  type: TransactionType,
  language: "th" | "en" = "th"
): string {
  return language === "en"
    ? TRANSACTION_TYPE_LABELS_EN[type]
    : TRANSACTION_TYPE_LABELS[type];
}

export function getTransactionDefaultCategory(type: TransactionType): string {
  return TRANSACTION_DEFAULT_CATEGORIES[type];
}

export function getTransactionAmountPrefix(type: TransactionType): string {
  return TRANSACTION_AMOUNT_PREFIXES[type];
}
