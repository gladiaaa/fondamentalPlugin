import type { ReactNode } from "react";

/** En-tête commun des pages du back-office. */
export function AdminPageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-1.5">
        <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Administration</p>
        <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">{title}</h1>
        {description && <p className="max-w-[62ch] text-[.92rem] text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
