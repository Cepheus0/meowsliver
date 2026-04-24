import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
        "relative flex flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-[color:var(--app-dashed-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--app-surface-soft)_82%,transparent),color-mix(in_srgb,var(--app-surface)_58%,transparent))] px-6 py-10 text-center sm:px-8 sm:py-12",
        className
      )}
    >
      {icon ? (
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[18px] border border-[color:var(--app-border)] bg-[color:var(--app-surface)] text-[color:var(--app-text-muted)] shadow-[0_18px_35px_-26px_rgba(26,20,16,0.45)]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[color:var(--app-text)] sm:text-base">
        {title}
      </h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-[color:var(--app-text-muted)] sm:leading-7">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--app-brand)] bg-[color:var(--app-brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_32px_-20px_var(--app-brand-shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[color:var(--app-brand-hover)]"
        >
          {actionLabel}
          <ArrowRight size={14} />
        </Link>
      ) : null}
    </div>
  );
}
