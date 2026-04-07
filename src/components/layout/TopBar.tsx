"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { YearPicker } from "@/components/ui/YearPicker";
import { useSyncExternalStore } from "react";

// Hydration-safe mounted check without useEffect + setState
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function TopBar() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[color:var(--app-border)] bg-[color:var(--app-surface-muted)] px-6 backdrop-blur-xl">
      <YearPicker />

      <div className="flex items-center gap-3">
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-xl p-2.5 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)]"
            title="สลับโหมดสว่าง/มืด"
          >
            {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
      </div>
    </header>
  );
}
