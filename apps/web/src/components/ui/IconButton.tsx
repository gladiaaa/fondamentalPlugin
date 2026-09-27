import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Texte pour les technologies d'assistance : l'icône seule n'en porte pas. */
  label: string;
  icon: ReactNode;
}

/** Bouton icône seule (`.ib` de la maquette) : copier, afficher, fermer... */
export function IconButton({ label, icon, className, disabled, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        "grid size-[38px] shrink-0 place-items-center rounded-field border-[1.5px] border-line bg-surface-2 text-text cursor-pointer hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
