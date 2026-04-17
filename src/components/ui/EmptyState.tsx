import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionHref,
  actionLabel,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-[color:var(--app-dashed-border)] bg-[color:var(--app-surface-soft)] px-6 py-10 text-center",
        className
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface)] text-[color:var(--app-text-muted)]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-[color:var(--app-text)]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[color:var(--app-text-muted)]">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center justify-center rounded-md bg-[#f54e00] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d44400]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
