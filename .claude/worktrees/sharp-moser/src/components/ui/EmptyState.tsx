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
        "theme-dashed-border flex flex-col items-center justify-center rounded-2xl border border-dashed bg-[color:var(--app-surface-soft)]/76 px-6 py-10 text-center backdrop-blur-sm",
        className
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--app-surface-strong)] text-[color:var(--app-text-muted)] shadow-[var(--app-card-shadow)]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-[color:var(--app-text)]">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[color:var(--app-text-muted)]">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
