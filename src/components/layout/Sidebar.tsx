"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Upload,
  Wallet,
  BarChart3,
  Landmark,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/store/finance-store";
import { useT } from "@/lib/i18n";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, key: "nav.dashboard" },
  { href: "/transactions", icon: Receipt, key: "nav.transactions" },
  { href: "/accounts", icon: Landmark, key: "nav.accounts" },
  { href: "/buckets", icon: Wallet, key: "nav.buckets" },
  { href: "/reports", icon: BarChart3, key: "nav.reports" },
  { href: "/import", icon: Upload, key: "nav.import" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();
  const { sidebarCollapsed, toggleSidebar } = useFinanceStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-[color:var(--app-bg-elevated)] shadow-[inset_-1px_0_0_color-mix(in_srgb,var(--app-shell-border)_30%,transparent)] transition-all duration-200",
        sidebarCollapsed ? "w-[52px]" : "w-[52px] md:w-[220px]"
      )}
    >
      {/* Header: logo (expanded) + collapse button pinned top-right */}
      <div
        className={cn(
          "flex h-[52px] items-center shadow-[inset_0_-1px_0_color-mix(in_srgb,var(--app-shell-border)_30%,transparent)]",
          sidebarCollapsed
            ? "justify-center px-2"
            : "justify-center px-2 md:justify-between md:px-3"
        )}
      >
        {!sidebarCollapsed && (
          <div className="hidden items-center gap-2 overflow-hidden md:flex">
            <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-md">
              <span
                aria-hidden="true"
                className="theme-logo-mark block h-[34px] w-[34px] rounded-md animate-logo-reveal"
              />
            </div>
            <div className="flex shrink-0 items-center overflow-hidden">
              <span
                aria-hidden="true"
                className="theme-logo-wordmark block h-[26px] w-[90px]"
              />
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[color:var(--app-text-subtle)] transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text-muted)]"
          aria-label={t("tooltip.toggleSidebar")}
          title={t("tooltip.toggleSidebar")}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto pb-2 pt-3",
          sidebarCollapsed ? "px-2" : "px-2 md:pl-0 md:pr-2"
        )}
      >
        {!sidebarCollapsed && (
          <p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--app-text-subtle)] md:block">
            Navigation
          </p>
        )}
        <div className={cn("space-y-0.5", sidebarCollapsed && "px-0")}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const label = t(item.key);
            return (
              <div key={item.href} className="relative">
                {/* Active left indicator — hangs at the sidebar's left edge */}
                {isActive && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[color:var(--app-brand)]"
                  />
                )}
                <Link
                  href={item.href}
                  title={sidebarCollapsed ? label : undefined}
                  className={cn(
                    "group flex h-9 items-center rounded-lg text-[13px] font-medium transition-all duration-150",
                    sidebarCollapsed
                      ? "justify-center px-0"
                      : "justify-center px-0 md:justify-start md:gap-2.5 md:pl-3 md:pr-2",
                    isActive
                      ? "bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)]"
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
                  {!sidebarCollapsed && <span className="hidden truncate md:inline">{label}</span>}
                </Link>
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
