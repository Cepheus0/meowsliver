import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-[color:var(--app-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--app-surface)_96%,transparent),color-mix(in_srgb,var(--app-surface-soft)_28%,transparent))] p-5 shadow-[0_22px_60px_-48px_rgba(24,18,12,0.5)] backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-base font-semibold tracking-[-0.01em] text-[color:var(--app-text)]",
        className
      )}
    >
      {children}
    </h3>
  );
}
