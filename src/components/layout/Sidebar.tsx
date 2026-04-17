"use client";

import Image from "next/image";
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
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-[color:var(--app-bg-elevated)] shadow-[inset_-1px_0_0_var(--app-shell-border)] transition-all duration-200",
        sidebarCollapsed ? "w-[52px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-[52px] items-center gap-2.5 px-3 shadow-[inset_0_-1px_0_var(--app-shell-border)]">
        <button
          onClick={toggleSidebar}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[color:var(--app-text-subtle)] transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text-muted)]"
          aria-label="Toggle sidebar"
        >
          <Menu size={16} />
        </button>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-md">
              <Image 
                src="/logo.png" 
                alt="Meowsliver Logo" 
                width={34} 
                height={34}
                className="rounded-md object-cover animate-logo-reveal"
                unoptimized
              />
            </div>
            <span className="truncate text-sm font-semibold text-[color:var(--app-text)]">
              เหมียวเงิน
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "group flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)] shadow-[inset_3px_0_0_var(--app-brand-text)]"
                  : "text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
              )}
            >
              <item.icon
                size={16}
                className={cn(
                  "shrink-0 transition-transform duration-150",
                  !isActive && "group-hover:scale-110"
                )}
              />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-3 shadow-[inset_0_1px_0_var(--app-shell-border)]">
          <p className="text-[11px] text-[color:var(--app-text-subtle)]">
            MoneyCat Tracker v1.0
          </p>
          <p className="text-[11px] text-[color:var(--app-text-subtle)]">
            เหมียวจดให้เรียบร้อย
          </p>
        </div>
      )}
    </aside>
  );
}
