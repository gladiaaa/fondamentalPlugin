import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "success" | "warning" | "error" | "info" | "accent";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-surface-2 text-muted",
  success: "bg-[color-mix(in_srgb,var(--color-success)_16%,transparent)] text-success",
  warning: "bg-[color-mix(in_srgb,var(--color-warning)_18%,transparent)] text-warning",
  error: "bg-[color-mix(in_srgb,var(--color-error)_16%,transparent)] text-error",
  info: "bg-[color-mix(in_srgb,var(--color-info)_16%,transparent)] text-info",
  accent: "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-accent-text",
};

/** Étiquette en police mono (`.bd` de la maquette) : statut de licence, édition, plateforme... */
export function Badge({
  variant = "neutral",
  icon,
  children,
  className,
}: {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill py-[.28em] px-[.8em] font-mono text-[.72rem] leading-[1.4]",
        variantClasses[variant],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
