"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Upload,
  Wallet,
  TrendingUp,
  BarChart3,
  Menu,
  Cat,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/finance-store";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "แดชบอร์ด" },
  { href: "/accounts", icon: Landmark, label: "บัญชี" },
  { href: "/transactions", icon: Receipt, label: "รายการ" },
  { href: "/import", icon: Upload, label: "นำเข้า" },
  { href: "/buckets", icon: Wallet, label: "ออมเป้า" },
  { href: "/investments", icon: TrendingUp, label: "การลงทุน" },
  { href: "/reports", icon: BarChart3, label: "รายงาน" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useFinanceStore();

  return (
    <aside
      className={cn(
        "theme-surface-muted fixed left-0 top-0 z-40 flex h-screen flex-col shadow-[inset_-1px_0_0_var(--app-shell-border)] backdrop-blur-xl transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 shadow-[inset_0_-1px_0_var(--app-shell-border)]">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)]"
        >
          <Menu size={20} />
        </button>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[color:var(--app-brand-border)] bg-[linear-gradient(135deg,var(--app-brand-soft-strong)_0%,var(--app-brand-soft)_100%)] text-[color:var(--app-brand-text)] shadow-[0_18px_36px_-26px_var(--app-brand-shadow)]">
              <Cat size={20} />
            </div>
            <span className="text-lg font-bold text-[color:var(--app-text)]">
              เหมียวเงิน
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)] shadow-[0_18px_32px_-28px_var(--app-brand-shadow)]"
                  : "text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
              )}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-4 shadow-[inset_0_1px_0_var(--app-shell-border)]">
          <p className="text-xs text-[color:var(--app-text-subtle)]">
            MoneyCat Tracker v1.0
          </p>
          <p className="text-xs text-[color:var(--app-text-subtle)]">
            เหมียวจดให้เรียบร้อย
          </p>
        </div>
      )}
    </aside>
  );
}
