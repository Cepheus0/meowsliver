"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";

interface ClientOnlyChartProps {
  children: ReactNode;
  className?: string;
  fallbackClassName?: string;
}

export function ClientOnlyChart({
  children,
  className,
  fallbackClassName,
}: ClientOnlyChartProps) {
  const mounted = useMounted();

  return (
    <div className={className}>
      {mounted ? (
        children
      ) : (
        <div
          className={cn(
            "h-full w-full animate-pulse rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60",
            fallbackClassName
          )}
        />
      )}
    </div>
  );
}
