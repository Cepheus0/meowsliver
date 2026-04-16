"use client";

import {
  Bitcoin,
  Circle,
  CreditCard,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AccountType } from "@/lib/types";

const ICON_MAP: Record<string, LucideIcon> = {
  Wallet,
  Landmark,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Bitcoin,
  Circle,
};

const TYPE_FALLBACK: Record<AccountType, LucideIcon> = {
  cash: Wallet,
  bank_savings: Landmark,
  bank_fixed: PiggyBank,
  credit_card: CreditCard,
  investment: TrendingUp,
  crypto: Bitcoin,
  other: Circle,
};

interface AccountIconProps {
  icon: string;
  type: AccountType;
  size?: number;
  className?: string;
}

export function AccountIcon({ icon, type, size = 20, className }: AccountIconProps) {
  const Icon = ICON_MAP[icon] ?? TYPE_FALLBACK[type] ?? Circle;
  return <Icon size={size} className={className} />;
}
