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
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-zinc-200 bg-white transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Menu size={20} />
        </button>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <Cat size={24} className="text-emerald-500" />
            <span className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
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
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            MoneyCat Tracker v1.0
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            🐱 เหมียวจดให้เรียบร้อย
          </p>
        </div>
      )}
    </aside>
  );
}
