import type {
  SavingsGoalCategory,
  SavingsGoalEntryType,
} from "@/lib/types";

export const GOAL_CATEGORY_LABELS: Record<SavingsGoalCategory, string> = {
  wedding: "แต่งงาน",
  retirement: "เกษียณ",
  home_down_payment: "ดาวน์บ้าน",
  education: "การศึกษา",
  emergency_fund: "กองทุนฉุกเฉิน",
  travel: "ท่องเที่ยว",
  custom: "กำหนดเอง",
};

export const GOAL_CATEGORY_LABELS_EN: Record<SavingsGoalCategory, string> = {
  wedding: "Wedding",
  retirement: "Retirement",
  home_down_payment: "Home down payment",
  education: "Education",
  emergency_fund: "Emergency fund",
  travel: "Travel",
  custom: "Custom",
};

export function getGoalCategoryLabel(
  category: SavingsGoalCategory,
  language: "th" | "en" = "th"
): string {
  return language === "en"
    ? GOAL_CATEGORY_LABELS_EN[category]
    : GOAL_CATEGORY_LABELS[category];
}

export const ENTRY_TYPE_LABELS: Record<SavingsGoalEntryType, string> = {
  contribution: "เติมเงิน",
  growth: "กำไร/ดอกผล",
  withdrawal: "ถอนออก",
  adjustment: "ปรับยอด",
};

export const ENTRY_TYPE_LABELS_EN: Record<SavingsGoalEntryType, string> = {
  contribution: "Contribution",
  growth: "Growth / Interest",
  withdrawal: "Withdrawal",
  adjustment: "Adjustment",
};

export function getEntryTypeLabel(
  type: SavingsGoalEntryType,
  language: "th" | "en" = "th"
): string {
  return language === "en"
    ? ENTRY_TYPE_LABELS_EN[type]
    : ENTRY_TYPE_LABELS[type];
}

export const SAVINGS_GOAL_PRESETS: Array<{
  category: SavingsGoalCategory;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  description: string;
  descriptionEn: string;
  strategyLabel: string;
  strategyLabelEn: string;
}> = [
  {
    category: "wedding",
    name: "เงินแต่งงาน",
    nameEn: "Wedding fund",
    icon: "💍",
    color: "#ec4899",
    description: "วางงบงานแต่งและติดตามเงินสะสมรายเดือนให้ชัดเจน",
    descriptionEn: "Plan the wedding budget and track monthly contributions clearly.",
    strategyLabel: "กองทุนผสม + เงินฝาก",
    strategyLabelEn: "Balanced fund + deposit",
  },
  {
    category: "retirement",
    name: "เงินเกษียณ",
    nameEn: "Retirement fund",
    icon: "🌅",
    color: "#f59e0b",
    description: "สะสมยาวและแยกผลตอบแทนออกจากเงินต้นให้เห็นชัด",
    descriptionEn: "Save for the long term and see returns separated from principal.",
    strategyLabel: "RMF / กองทุนระยะยาว",
    strategyLabelEn: "RMF / long-term fund",
  },
  {
    category: "home_down_payment",
    name: "เงินดาวน์บ้าน",
    nameEn: "Home down payment",
    icon: "🏡",
    color: "#3b82f6",
    description: "ติดตามวงเงินดาวน์บ้านและ pace ที่ต้องออมต่อเดือน",
    descriptionEn: "Track the down-payment target and the monthly pace you need to hit.",
    strategyLabel: "บัญชีฝากประจำ / MMF",
    strategyLabelEn: "Time deposit / MMF",
  },
  {
    category: "education",
    name: "กองทุนการศึกษา",
    nameEn: "Education fund",
    icon: "🎓",
    color: "#8b5cf6",
    description: "เก็บเงินสำหรับค่าเรียนหรือ upskill ระยะกลาง",
    descriptionEn: "Save for tuition or mid-term upskilling.",
    strategyLabel: "กองทุนตราสารหนี้",
    strategyLabelEn: "Fixed-income fund",
  },
  {
    category: "emergency_fund",
    name: "เงินสำรองฉุกเฉิน",
    nameEn: "Emergency fund",
    icon: "🛟",
    color: "#22c55e",
    description: "กันเงินเผื่อฉุกเฉินและเห็น readiness ได้ตลอดเวลา",
    descriptionEn: "Set aside a safety net and keep readiness visible at all times.",
    strategyLabel: "บัญชีออมทรัพย์สภาพคล่องสูง",
    strategyLabelEn: "High-liquidity savings account",
  },
  {
    category: "travel",
    name: "ทริปในฝัน",
    nameEn: "Dream trip",
    icon: "✈️",
    color: "#06b6d4",
    description: "แยกเงินท่องเที่ยวออกจากค่าใช้จ่ายปกติ",
    descriptionEn: "Keep travel money separate from everyday spending.",
    strategyLabel: "บัญชีแยกออมรายเดือน",
    strategyLabelEn: "Dedicated monthly savings account",
  },
];

export const DEFAULT_GOAL_COLOR = "#10b981";
export const DEFAULT_GOAL_ICON = "🎯";

export function getGoalPreset(category: SavingsGoalCategory) {
  return SAVINGS_GOAL_PRESETS.find((preset) => preset.category === category);
}

export function sanitizeGoalColor(color?: string | null) {
  const normalized = color?.trim();
  if (normalized && /^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized;
  }

  return DEFAULT_GOAL_COLOR;
}

export function getEntrySignedAmount(
  type: SavingsGoalEntryType,
  amount: number
) {
  if (type === "withdrawal") {
    return -Math.abs(amount);
  }

  if (type === "adjustment") {
    return amount;
  }

  return Math.abs(amount);
}

export function formatGoalDate(dateString?: string, language: "th" | "en" = "th") {
  if (!dateString) {
    return language === "en" ? "Not set" : "ยังไม่กำหนด";
  }

  const locale = language === "en" ? "en-US" : "th-TH";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(`${dateString}T00:00:00`));
}
