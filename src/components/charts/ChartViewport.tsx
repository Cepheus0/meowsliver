"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";

interface ChartViewportProps {
  children: (size: { width: number; height: number }) => ReactNode;
  className?: string;
  fallbackClassName?: string;
}

export function ChartViewport({
  children,
  className,
  fallbackClassName,
}: ChartViewportProps) {
  const mounted = useMounted();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!mounted || !containerRef.current) {
      return;
    }

    const node = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const nextWidth = Math.floor(entry.contentRect.width);
        const nextHeight = Math.floor(entry.contentRect.height);

        if (nextWidth > 0 && nextHeight > 0) {
          setSize({ width: nextWidth, height: nextHeight });
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
      {mounted && size ? (
        children(size)
      ) : (
        <div
          className={cn(
            "h-full w-full animate-pulse rounded-2xl bg-[color:var(--app-surface-soft)]",
            fallbackClassName
          )}
        />
      )}
    </div>
  );
}
