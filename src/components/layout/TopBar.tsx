"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { YearPicker } from "@/components/ui/YearPicker";
import { useMounted } from "@/lib/use-mounted";
import { useFinanceStore } from "@/store/finance-store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const t = useT();
  const language = useFinanceStore((s) => s.language);
  const setLanguage = useFinanceStore((s) => s.setLanguage);

  return (
    <header className="sticky top-0 z-30 h-[60px] border-b border-[color:var(--app-shell-border)] bg-[color:color-mix(in_srgb,var(--app-bg-elevated)_84%,transparent)] backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-4 px-4 md:px-6">
        <YearPicker />

        {mounted && (
          <div className="flex items-center gap-2">
            {/* TH / EN pill toggle */}
            <div
              role="group"
              aria-label={t("tooltip.toggleLanguage")}
              className="flex h-10 items-center rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-1 text-[11px] font-bold uppercase tracking-wider"
            >
              {(["th", "en"] as const).map((lng) => {
                const active = language === lng;
                return (
                  <button
                    key={lng}
                    onClick={() => setLanguage(lng)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-full min-w-[40px] items-center justify-center rounded-full px-3 transition-all duration-200",
                      active
                        ? "bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)] shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--app-brand)_35%,transparent)]"
                        : "text-[color:var(--app-text-subtle)] hover:text-[color:var(--app-text)]"
                    )}
                  >
                    {lng}
                  </button>
                );
              })}
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)] transition-all duration-200 hover:bg-[color:var(--app-surface)] hover:text-[color:var(--app-text)]"
              title={t("tooltip.toggleTheme")}
              aria-label={t("tooltip.toggleTheme")}
            >
              {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
