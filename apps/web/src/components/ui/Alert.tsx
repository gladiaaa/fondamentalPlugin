import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ValiderIcon, InfoIcon, AlerteIcon, ErreurIcon } from "@/components/icons";

export type AlertVariant = "success" | "info" | "warning" | "error";

const variantConfig: Record<AlertVariant, { color: string; Icon: typeof InfoIcon }> = {
  success: { color: "var(--color-success)", Icon: ValiderIcon },
  info: { color: "var(--color-info)", Icon: InfoIcon },
  warning: { color: "var(--color-warning)", Icon: AlerteIcon },
  error: { color: "var(--color-error)", Icon: ErreurIcon },
};

/** Message d'état encadré (`.al` de la maquette). Pas pour les erreurs de champ : voir `Field`. */
export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: AlertVariant;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { color, Icon } = variantConfig[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-2xl border p-3.5 text-[.92rem]", className)}
      style={{
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 10%, var(--color-bg))`,
      }}
    >
      <span className="mt-px shrink-0" style={{ color }}>
        <Icon />
      </span>
      <div className="grid flex-1 min-w-0 gap-0.5">
        {title && <b className="font-semibold">{title}</b>}
        <div>{children}</div>
      </div>
    </div>
  );
}
