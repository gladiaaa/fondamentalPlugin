import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const variantClasses = {
  neutral: "bg-surface-2 text-muted",
  success: "bg-[color-mix(in_srgb,var(--color-success)_16%,transparent)] text-success",
  error: "bg-[color-mix(in_srgb,var(--color-error)_16%,transparent)] text-error",
} as const;

/** Icône ronde des écrans d'état (`.big-i` de la maquette) : e-mail envoyé, succès, lien expiré. */
export function StateIcon({ variant, children }: { variant: keyof typeof variantClasses; children: ReactNode }) {
  return (
    <span className={cn("mx-auto grid size-16 place-items-center rounded-full", variantClasses[variant])}>
      {children}
    </span>
  );
}
