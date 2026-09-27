import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Libellé, qui peut contenir un lien (vers les CGV par exemple). */
  children: ReactNode;
}

/** Case à cocher (`.chk` de la maquette) : renonciation, CGV, consentement. */
export function Checkbox({ children, className, id, ...props }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn("flex cursor-pointer items-start gap-2.5 text-[.88rem] text-muted [&_a]:text-accent", className)}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-[18px] shrink-0 accent-accent"
        {...props}
      />
      <span>{children}</span>
    </label>
  );
}
