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
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-6 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <YearPicker />

      <div className="flex items-center gap-3">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl p-2.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title="สลับโหมดสว่าง/มืด"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
      </div>
    </header>
  );
}
