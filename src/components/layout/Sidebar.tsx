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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/finance-store";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "แดชบอร์ด" },
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
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] backdrop-blur-xl transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-[color:var(--app-border)] px-4">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)]"
        >
          <Menu size={20} />
        </button>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <Cat size={24} className="text-emerald-500" />
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
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
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
        <div className="border-t border-[color:var(--app-border)] p-4">
          <p className="text-xs text-[color:var(--app-text-subtle)]">
            MoneyCat Tracker v1.0
          </p>
          <p className="text-xs text-[color:var(--app-text-subtle)]">
            🐱 เหมียวจดให้เรียบร้อย
          </p>
        </div>
      )}
    </aside>
  );
}
