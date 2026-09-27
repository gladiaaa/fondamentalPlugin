import type { ReactNode } from "react";

/** Liste vide (`.empty` de la maquette). Toujours avec une action utile (brief §9), pas juste un constat. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-3 py-[clamp(28px,5cqi,48px)] text-center">
      {icon && (
        <span className="grid size-[68px] place-items-center rounded-card-lg bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-accent">
          {icon}
        </span>
      )}
      <p className="text-[1.08rem] font-semibold font-display">{title}</p>
      {description && <p className="max-w-[44ch] text-muted">{description}</p>}
      {action}
    </div>
  );
}
