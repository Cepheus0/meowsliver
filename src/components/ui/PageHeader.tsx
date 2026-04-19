import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderTone = "default" | "brand" | "success" | "danger" | "neutral";

const toneClasses: Record<PageHeaderTone, string> = {
  default:
    "border-[color:var(--app-border)] bg-[color:var(--app-surface)] text-[color:var(--app-text-muted)]",
  brand:
    "border-[color:var(--app-brand-border)] bg-[color:var(--app-brand-soft)] text-[color:var(--app-brand-text)]",
  success:
    "border-[color:var(--income-soft)] bg-[color:var(--income-soft)] text-[color:var(--income-text)]",
  danger:
    "border-[color:var(--expense-soft)] bg-[color:var(--expense-soft)] text-[color:var(--expense-text)]",
  neutral:
    "border-[color:var(--neutral-soft)] bg-[color:var(--neutral-soft)] text-[color:var(--neutral)]",
};

export interface PageHeaderMetaItem {
  icon?: ReactNode;
  label: ReactNode;
  tone?: PageHeaderTone;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: PageHeaderMetaItem[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta = [],
  actions,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[30px] border border-[color:var(--app-border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--app-surface)_94%,transparent),color-mix(in_srgb,var(--app-surface-soft)_34%,transparent))] px-5 py-6 shadow-[0_30px_80px_-52px_rgba(26,20,16,0.38)] backdrop-blur-sm sm:px-6 sm:py-7",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-8rem] top-[-10rem] h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,var(--app-glow-primary)_0%,transparent_70%)] opacity-80" />
        <div className="absolute bottom-[-12rem] left-[-7rem] h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,var(--app-glow-secondary)_0%,transparent_72%)] opacity-70" />
      </div>

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--app-text-subtle)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[color:var(--app-text)] sm:text-[2.35rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--app-text-muted)] sm:text-[15px]">
              {description}
            </p>
          ) : null}
          {meta.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {meta.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-[0_12px_30px_-24px_rgba(26,20,16,0.35)]",
                    toneClasses[item.tone ?? "default"]
                  )}
                >
                  {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}
