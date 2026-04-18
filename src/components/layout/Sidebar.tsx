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
import { useT } from "@/lib/i18n";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, key: "nav.dashboard" },
  { href: "/accounts", icon: Landmark, key: "nav.accounts" },
  { href: "/transactions", icon: Receipt, key: "nav.transactions" },
  { href: "/import", icon: Upload, key: "nav.import" },
  { href: "/buckets", icon: Wallet, key: "nav.buckets" },
  { href: "/investments", icon: TrendingUp, key: "nav.investments" },
  { href: "/reports", icon: BarChart3, key: "nav.reports" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();
  const { sidebarCollapsed, toggleSidebar } = useFinanceStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-[color:var(--app-bg-elevated)] shadow-[inset_-1px_0_0_color-mix(in_srgb,var(--app-shell-border)_30%,transparent)] transition-all duration-200",
        sidebarCollapsed ? "w-[52px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-[52px] items-center gap-2.5 px-3 shadow-[inset_0_-1px_0_color-mix(in_srgb,var(--app-shell-border)_30%,transparent)]">
        <button
          onClick={toggleSidebar}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[color:var(--app-text-subtle)] transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text-muted)]"
          aria-label={t("tooltip.toggleSidebar")}
          title={t("tooltip.toggleSidebar")}
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
            <div className="flex shrink-0 items-center overflow-hidden">
              <Image
                src="/logo_text.png"
                alt="Meowsliver"
                width={90}
                height={26}
                className="object-contain"
                unoptimized
              />
            </div>
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
          const label = t(item.key);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? label : undefined}
              className={cn(
                "group flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all duration-150",
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
              {!sidebarCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--app-shell-border)_30%,transparent)]">
          <p className="text-[11px] text-[color:var(--app-text-subtle)]">
            {t("app.version")}
          </p>
          <p className="text-[11px] text-[color:var(--app-text-subtle)]">
            {t("brand.tagline")}
          </p>
        </div>
      )}
    </aside>
  );
}
