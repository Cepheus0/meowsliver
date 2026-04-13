"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { YearPicker } from "@/components/ui/YearPicker";
import { useMounted } from "@/lib/use-mounted";

export function TopBar() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <header className="theme-surface-muted sticky top-0 z-30 flex h-16 items-center justify-between px-6 shadow-[inset_0_-1px_0_var(--app-shell-border)] backdrop-blur-xl">
      <YearPicker />

      <div className="flex items-center gap-3">
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="theme-border rounded-xl border bg-[color:var(--app-surface)] p-2.5 text-[color:var(--app-text-muted)] shadow-[var(--app-card-shadow)] transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
            title="สลับโหมดสว่าง/มืด"
          >
            {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
      </div>
    </header>
  );
}
