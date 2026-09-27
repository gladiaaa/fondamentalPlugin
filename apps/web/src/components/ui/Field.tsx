import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Classes communes aux champs texte, select et textarea (`.fld input/select/textarea`). */
export const fieldControlClasses =
  "w-full rounded-field border-[1.5px] border-line bg-surface-2 px-4 py-[.8em] text-text transition-[border-color,box-shadow] duration-120 focus:outline-none focus:border-accent focus:shadow-[var(--focus-ring)] disabled:opacity-55 aria-invalid:border-error";

export interface FieldProps {
  label: string;
  htmlFor: string;
  /** Précision après le libellé, en gris (`.fld .fl em` de la maquette). */
  optionalHint?: string;
  /** Erreur affichée en texte sous le champ, jamais seulement en couleur (brief §8). */
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

/** Enveloppe libellé + champ + erreur/aide (`.fld` de la maquette). */
export function Field({ label, htmlFor, optionalHint, error, hint, children, className }: FieldProps) {
  return (
    <div className={cn("grid gap-1.5 min-w-0", className)}>
      <label htmlFor={htmlFor} className="font-medium text-[.84rem] font-body">
        {label} {optionalHint && <em className="not-italic font-normal text-muted">{optionalHint}</em>}
      </label>
      {children}
      {error ? (
        <small className="text-[.8rem] text-error">{error}</small>
      ) : (
        hint && <small className="text-[.8rem] text-muted">{hint}</small>
      )}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldControlClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldControlClasses, "min-h-[120px] resize-y", className)} {...props} />;
}

// Chevron du select, en style inline plutôt qu'en classe Tailwind arbitraire
// (l'URI data: contient des caractères que la syntaxe entre crochets gère mal).
const selectChevron = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239A90B3' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right .8em center",
  backgroundSize: "16px",
};

export function Select({ className, children, style, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(fieldControlClasses, "appearance-none pr-[2.4em]", className)}
      style={{ ...selectChevron, ...style }}
      {...props}
    >
      {children}
    </select>
  );
}
