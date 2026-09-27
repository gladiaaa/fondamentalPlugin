"use client";

import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Field, fieldControlClasses } from "./Field";
import { cn } from "@/lib/cn";
import { OeilIcon, OeilFermeIcon } from "@/components/icons";

export interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  hint?: string;
}

/** Champ mot de passe avec bouton Afficher/Masquer (`.pwbox`/`.pw-t` de la maquette). */
export function PasswordField({ label, error, hint, className, id, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <Field label={label} htmlFor={inputId} error={error} hint={hint}>
      <div className="relative block">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error) || undefined}
          className={cn(fieldControlClasses, "pr-[3em]", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className="absolute right-[6px] top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-field text-muted hover:text-text cursor-pointer"
        >
          {visible ? <OeilFermeIcon /> : <OeilIcon />}
        </button>
      </div>
    </Field>
  );
}
