"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { YearPicker } from "@/components/ui/YearPicker";
import { useMounted } from "@/lib/use-mounted";

export function TopBar() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-[color:var(--app-shell-border)] bg-[color:var(--app-bg-elevated)] px-6">
      <YearPicker />

      <div className="flex items-center gap-2">
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--app-text-muted)] transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
            title="สลับโหมดสว่าง/มืด"
          >
            {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}
      </div>
    </header>
  );
}
