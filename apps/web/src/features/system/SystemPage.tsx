import type { ReactNode } from "react";

/** Gabarit des pages système (`.sys-c`/`.sys-n` de la maquette) : 404, 500, maintenance. */
export function SystemPage({
  code,
  title,
  description,
  children,
}: {
  code: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid min-h-[60vh] place-items-center px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="grid max-w-[440px] justify-items-center gap-4 rounded-card-lg border border-line bg-surface p-8 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-surface-2 font-display text-[1.6rem] font-semibold text-muted">
          {code}
        </span>
        <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">{title}</h1>
        <p className="text-muted">{description}</p>
        <div className="flex flex-wrap justify-center gap-2.5">{children}</div>
      </div>
    </section>
  );
}
