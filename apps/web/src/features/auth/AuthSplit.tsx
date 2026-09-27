import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { ValiderIcon } from "@/components/icons";

/**
 * Mise en page à deux colonnes des écrans connexion/inscription (`.auth` de
 * la maquette) : argumentaire à gauche (masqué en dessous de `lg`), formulaire
 * à droite.
 */
export function AuthSplit({
  pitch,
  ticks,
  title,
  lead,
  children,
  footer,
}: {
  pitch: ReactNode;
  ticks: string[];
  title: ReactNode;
  lead: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[960px] overflow-hidden rounded-card-lg border border-line bg-surface lg:grid-cols-2">
        <aside className="hidden flex-col gap-5 bg-surface-2 p-8 lg:flex">
          <Logo withWordmark={false} size={44} />
          <h2 className="font-display text-[1.5rem] font-semibold tracking-[-.03em]">{pitch}</h2>
          <ul className="grid gap-2.5 text-[.92rem] text-muted">
            {ticks.map((tick) => (
              <li key={tick} className="flex items-center gap-2">
                <ValiderIcon className="shrink-0 text-success" /> {tick}
              </li>
            ))}
          </ul>
        </aside>

        <div className="grid gap-5 p-6 sm:p-8">
          <div className="grid gap-1.5">
            <h1 className="font-display text-[1.6rem] font-semibold tracking-[-.03em]">{title}</h1>
            <p className="text-muted">{lead}</p>
          </div>
          {children}
          {footer}
        </div>
      </div>
    </section>
  );
}
