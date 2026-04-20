import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format number as Thai Baht currency */
export function formatBaht(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("฿", "฿\u00A0")
    .replace(/^-/, "-\u00A0");
}

/** Format number with commas */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("th-TH").format(num);
}

/**
 * Compact baht formatter for stat tiles where space is tight.
 * 1,234,567  → "฿1.23M"
 * 41,300     → "฿41.3k"
 * 950        → "฿950"
 * Negative values get a leading "-".
 */
export function formatBahtCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}฿${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}฿${(abs / 1_000).toFixed(1)}k`;
  return `${sign}฿${Math.round(abs)}`;
}

/** Format percentage */
export function formatPercent(num: number): string {
  return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
}

/** Get array of years from 2015 to current year */
export function getYearRange(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 2015; y--) {
    years.push(y);
  }
  return years;
}

/** Thai month names */
export const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
] as const;

export const EN_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
] as const;

export const EN_MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * Format a YYYY-MM-DD date string to a short "D MMM" label.
 * Returns empty string on malformed input.
 */
export function formatShortDate(dateStr: string, language: "th" | "en" = "th"): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  const month = parseInt(parts[1] ?? "0", 10);
  const day = parseInt(parts[2] ?? "0", 10);
  if (!month || !day) return dateStr;
  const monthsArr = language === "en" ? EN_MONTHS : THAI_MONTHS;
  return `${day} ${monthsArr[month - 1] ?? ""}`;
}
