import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Étire le bouton sur toute la largeur disponible (`.b.w` de la maquette). */
  fullWidth?: boolean;
  /** Affiche un spinner et désactive le bouton, sans changer sa taille. */
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-110",
  secondary: "text-text shadow-[inset_0_0_0_1.5px_var(--color-line)] hover:shadow-[inset_0_0_0_1.5px_var(--color-accent)]",
  ghost: "bg-transparent text-accent px-[.7em]",
  danger: "bg-transparent text-error shadow-[inset_0_0_0_1.5px_var(--color-error)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "py-[.62em] px-[1.05em] text-[.82rem]",
  md: "py-[.85em] px-[1.4em] text-[.92rem]",
  lg: "py-[1.05em] px-[1.7em] text-[1rem]",
};

/** Bouton principal du site (`.b` de la maquette). Variantes : principal, secondaire, discret, danger. */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-semibold font-body text-center cursor-pointer transition-[filter,box-shadow,transform] duration-[120ms] active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:filter-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          className="block size-4 shrink-0 rounded-full border-2 border-line border-t-accent animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
