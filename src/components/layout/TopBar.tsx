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
    <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between shadow-[inset_0_-1px_0_color-mix(in_srgb,var(--app-shell-border)_30%,transparent)] bg-[color:var(--app-bg-elevated)] px-6">
      <YearPicker />

      <div className="flex items-center gap-2">
        {mounted && (
          <>
            {/* TH / EN language toggle */}
            <div
              role="group"
              aria-label={t("tooltip.toggleLanguage")}
              className="flex h-8 items-center rounded-md bg-[color:var(--app-surface-soft)] p-0.5 text-[11px] font-semibold"
            >
              {(["th", "en"] as const).map((lng) => {
                const active = language === lng;
                return (
                  <button
                    key={lng}
                    onClick={() => setLanguage(lng)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-7 w-8 items-center justify-center rounded-[5px] uppercase tracking-wide transition-colors",
                      active
                        ? "bg-[color:var(--app-surface)] text-[color:var(--app-brand-text)] shadow-[0_1px_2px_rgba(38,37,30,0.08)]"
                        : "text-[color:var(--app-text-subtle)] hover:text-[color:var(--app-text-muted)]"
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
              className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--app-text-muted)] transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
              title={t("tooltip.toggleTheme")}
              aria-label={t("tooltip.toggleTheme")}
            >
              {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
