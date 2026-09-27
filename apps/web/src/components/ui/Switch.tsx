"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export interface SwitchProps extends RadixSwitch.SwitchProps {
  label: string;
}

/** Interrupteur (`.sw-t` de la maquette). `label` sert d'accessible name. */
export function Switch({ label, className, ...props }: SwitchProps) {
  return (
    <RadixSwitch.Root
      aria-label={label}
      className={cn(
        "group relative inline-block h-7 w-[46px] shrink-0 rounded-pill border-[1.5px] border-line bg-surface-2 transition-colors duration-200 cursor-pointer data-[state=checked]:border-accent data-[state=checked]:bg-[var(--color-accent-2)]/20",
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="block size-[19px] translate-x-[3px] translate-y-[3px] rounded-full bg-muted transition-[transform,background-color] duration-200 data-[state=checked]:translate-x-[21px] data-[state=checked]:bg-accent" />
    </RadixSwitch.Root>
  );
}
