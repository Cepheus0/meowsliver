import type { AccountType, AssetCategory } from "@/lib/types";

export type InvestmentBucketKey = "crypto" | "ssf" | "rmf" | "stocks" | "others";

export interface AccountCatalogEntry {
  name: string;
  type: AccountType;
  currentBalance: number;
  creditLimit?: number;
  aliases: string[];
  isDefault?: boolean;
  assetCategory?: AssetCategory;
  investmentBucket?: InvestmentBucketKey;
  ticker?: string;
  costBasis?: number;
  notes?: string;
}

export const YELLOW_ACCOUNT_CATALOG: AccountCatalogEntry[] = [
  {
    name: "Krungsri SSF",
    type: "investment",
    currentBalance: 146339,
    aliases: ["krungsri ssf", "กรุงศรี ssf", "kfbrandssf"],
    assetCategory: "ssf",
    investmentBucket: "ssf",
    ticker: "KFBRANDSSF",
    costBasis: 135000,
    notes: [
      "มูลค่าปัจจุบันจากภาพรวม: ฿146,339",
      "ต้นทุนโดยประมาณ: ฿135,000",
      "",
      "ข้อมูลย่อยจากภาพ:",
      "- 2021-11-09: gain +฿11,338.91",
      "- 2020-12-26: ซื้อผ่าน K-Bank ฿100,000",
      "- 2020-02-01: ซื้อผ่าน KTB ฿30,000",
      "- 2019-11-22: ซื้อผ่าน SCB ฿5,000",
    ].join("\n"),
  },
  {
    name: "K-bank SSF",
    type: "investment",
    currentBalance: 371000,
    aliases: ["k-bank ssf", "kbank ssf", "กสิกร ssf"],
    assetCategory: "ssf",
    investmentBucket: "ssf",
    ticker: "K-SSF",
    costBasis: 230568,
    notes: [
      "มูลค่าปัจจุบันจากภาพรวม: ฿371,000",
      "ต้นทุนโดยประมาณจากหน้ารายละเอียด: ฿230,568",
      "",
      "ข้อมูลย่อยจากภาพ:",
      "- 2024-12-31: K-VIETNAM ฿41,000",
      "- 2023-12-13: K-Change ฿20,000 + K-China ฿60,000",
      "- 2022-12-27: K-VIETNAM-SSF ฿50,000",
      "- 2022-12-27: K-China-SSF ฿50,000",
      "- 2022-12-27: K-CHANGE-SSF ฿50,000",
      "- 2021-12-19: K-China first buy ฿50,000",
      "- 2021-12-19: K-Change first buy ฿50,000",
    ].join("\n"),
  },
  {
    name: "KbankThaiESG",
    type: "investment",
    currentBalance: 200000,
    aliases: ["kbank thaiesg", "kbank thai esg", "k-hdthesgx"],
    assetCategory: "stocks",
    investmentBucket: "stocks",
    ticker: "K-HDTHESGX",
    costBasis: 200000,
    notes: [
      "มูลค่าปัจจุบันจากภาพรวม: ฿200,000",
      "ต้นทุนโดยประมาณจากหน้ารายละเอียด: ฿200,000",
      "",
      "ข้อมูลย่อยจากภาพ:",
      "- 2025-06-30: ThaiESGX ฿20,000",
      "- 2025-06-30: SCB Keep เพิ่มอีก ฿180,000",
    ].join("\n"),
  },
  {
    name: "SCB SSF",
    type: "investment",
    currentBalance: 281000,
    aliases: ["scb ssf", "scbndq-ssf", "scbgoldh-ssf"],
    assetCategory: "ssf",
    investmentBucket: "ssf",
    ticker: "SCB-SSF",
    costBasis: 153541,
    notes: [
      "มูลค่าปัจจุบันจากภาพรวม: ฿281,000",
      "ต้นทุนโดยประมาณจากหน้ารายละเอียด: ฿153,541",
      "",
      "ข้อมูลย่อยจากภาพ:",
      "- 2024-12-31: SCBNDQ-SSF ฿40,000",
      "- 2024-12-31: SCBGOLDH-SSF ฿11,000",
      "- 2023-12-13: ScbNdq ฿50,000 + SCBIhealth ฿40,000 + Scbgold ฿20,000",
      "- 2022-12-27: SCB-IHEALTH-SSF 2022 ฿20,000",
      "- 2021-12-21: ซื้อ IHealth SSF ผ่าน SCB Credit Card ฿40,000",
      "- 2021-12-20: ซื้อ IHealth ฿10,000 + Goldh ฿48,000 ผ่าน K-Bank",
      "- 2021-12-19: ซื้อ SCBGOLDH SSF ครั้งแรก ฿2,000",
    ].join("\n"),
  },
  {
    name: "SCB RMF",
    type: "investment",
    currentBalance: 165000,
    aliases: ["scb rmf", "scbrmgwp", "scbrms&p500"],
    assetCategory: "rmf",
    investmentBucket: "rmf",
    ticker: "SCB-RMF",
    costBasis: 101757,
    notes: [
      "มูลค่าปัจจุบันจากภาพรวม: ฿165,000",
      "ต้นทุนโดยประมาณจากหน้ารายละเอียด: ฿101,757",
      "",
      "ข้อมูลย่อยจากภาพ:",
      "- 2024-12-31: SCBRMGWP ฿20,000",
      "- 2024-12-31: SCBRMS&P500 ฿25,000",
      "- 2023-12-13: ScbRMgwp ฿10,000 + ScbRMs&p500 ฿10,000",
      "- 2022-12-27: SCBRMS&P500 ฿10,000",
      "- 2022-12-27: SCBRMGWP ฿10,000",
      "- 2021-12-22: SCBRMGWP ผ่าน SCB Credit Card ฿40,000",
      "- 2021-12-22: SCBRMS&P500 ผ่าน SCB Credit Card ฿40,000",
    ].join("\n"),
  },
  {
    name: "SCBThaiESG",
    type: "investment",
    currentBalance: 340000,
    aliases: ["scb thai esg", "scbthaiesg", "scbta"],
    assetCategory: "stocks",
    investmentBucket: "stocks",
    ticker: "SCBTA",
    costBasis: 81250,
    notes: [
      "มูลค่าปัจจุบันจากภาพรวม: ฿340,000",
      "ต้นทุนโดยประมาณจากหน้ารายละเอียด: ฿81,250",
      "",
      "ข้อมูลย่อยจากภาพ:",
      "- 2025-03-19: ซื้อผ่าน SCB Credit Card ฿100,000",
      "- 2024-12-31: ซื้อผ่าน SCB ฿220,000",
      "- 2023-12-13: SCBTA ฿20,000",
    ].join("\n"),
  },
  {
    name: "SET",
    type: "investment",
    currentBalance: 881277,
    aliases: ["set", "thai stocks"],
    assetCategory: "stocks",
    investmentBucket: "stocks",
    ticker: "SET",
    notes: "มูลค่าปัจจุบันจากภาพรวม: ฿881,277\nยังไม่มีภาพย่อยสำหรับต้นทุนหรือรายการย่อยในรอบนี้",
  },
  {
    name: "Crypto",
    type: "crypto",
    currentBalance: 307106,
    aliases: ["crypto", "คริปโต"],
    assetCategory: "crypto",
    investmentBucket: "crypto",
    ticker: "CRYPTO",
    notes: "มูลค่าปัจจุบันจากภาพรวม: ฿307,106\nยังไม่มีภาพย่อยสำหรับต้นทุนหรือรายการย่อยในรอบนี้",
  },
  {
    name: "Wallet",
    type: "cash",
    currentBalance: 6520,
    aliases: ["wallet", "cash wallet"],
    assetCategory: "cash",
    notes: "ยอดจากภาพรวม: ฿6,520",
  },
  {
    name: "SCB",
    type: "other",
    currentBalance: -59670.42,
    aliases: ["scb", "scb bank"],
    notes: "ยอดติดลบจากภาพรวม: -฿59,670.42",
  },
  {
    name: "K-Bank",
    type: "bank_savings",
    currentBalance: 37010,
    aliases: ["kbank", "k-bank", "kb"], 
    isDefault: true,
    assetCategory: "bank_savings",
    notes: "ยอดจากภาพรวม: ฿37,010",
  },
  {
    name: "SCB Credit Card",
    type: "credit_card",
    currentBalance: -13650.26,
    creditLimit: 100000,
    aliases: ["scb credit card", "scb cc"],
    notes: "ยอดคงค้างจากภาพรวม: -฿13,650.26",
  },
  {
    name: "Guy",
    type: "other",
    currentBalance: 75000,
    aliases: ["guy"],
    assetCategory: "other_investment",
    notes: "ยอดจากภาพรวม: ฿75,000",
  },
  {
    name: "Mo",
    type: "other",
    currentBalance: 220579,
    aliases: ["mo"],
    assetCategory: "other_investment",
    notes: "ยอดจากภาพรวม: ฿220,579",
  },
  {
    name: "Mom",
    type: "other",
    currentBalance: 0,
    aliases: ["mom"],
    assetCategory: "other_investment",
    notes: "ยอดจากภาพรวม: ฿0",
  },
  {
    name: "Pa'ar",
    type: "other",
    currentBalance: 0,
    aliases: ["pa'ar", "paar"],
    assetCategory: "other_investment",
    notes: "ยอดจากภาพรวม: ฿0",
  },
  {
    name: "Xcash",
    type: "cash",
    currentBalance: 0,
    aliases: ["xcash"],
    assetCategory: "cash",
    notes: "ยอดจากภาพรวม: ฿0",
  },
  {
    name: "Tax",
    type: "other",
    currentBalance: 121312,
    aliases: ["tax", "ภาษี"],
    assetCategory: "other_investment",
    notes: "ยอดจากภาพรวม: ฿121,312",
  },
];

const catalogByName = new Map(
  YELLOW_ACCOUNT_CATALOG.map((entry) => [entry.name.trim().toLowerCase(), entry])
);

export function getAccountCatalogEntryByName(name: string) {
  return catalogByName.get(name.trim().toLowerCase());
}
