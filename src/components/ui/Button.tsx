"use client";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<Variant, string> = {
  primary:
    "border border-[color:var(--app-brand)] bg-[color:var(--app-brand)] text-white shadow-[0_18px_32px_-20px_var(--app-brand-shadow)] hover:-translate-y-0.5 hover:bg-[color:var(--app-brand-hover)] hover:shadow-[0_22px_38px_-20px_var(--app-brand-shadow)]",
  secondary:
    "border border-[color:var(--app-border)] bg-[color:var(--app-surface)] text-[color:var(--app-text)] shadow-[0_12px_28px_-26px_rgba(26,20,16,0.45)] hover:-translate-y-0.5 hover:border-[color:var(--app-border-strong)] hover:bg-[color:var(--app-surface-strong)]",
  ghost:
    "border border-transparent text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]",
  danger:
    "border border-[color:var(--expense)] bg-[color:var(--expense)] text-white shadow-[0_18px_30px_-20px_rgba(232,66,106,0.45)] hover:-translate-y-0.5 hover:brightness-95",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium tracking-[-0.01em] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
