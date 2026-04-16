"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasMeasuredSize, setHasMeasuredSize] = useState(false);

  useEffect(() => {
    if (!mounted || !containerRef.current) {
      return;
    }

    const node = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setHasMeasuredSize(true);
          return;
        }
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [mounted]);

  return (
    <div ref={containerRef} className={cn("min-w-0", className)}>
      {mounted && hasMeasuredSize ? (
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
