import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { Badge } from "@/components/ui/Badge";
import { FlecheIcon } from "@/components/icons";
import { formatPriceCents } from "@/lib/format";

export interface PluginCardProps {
  slug: string;
  name: string;
  description: string;
  /** En centimes, ou `null` tant que le prix n'est pas fixé (docs/api-front.md §4). */
  priceCents: number | null;
  freeAvailable: boolean;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/** Carte plugin (`.pcd` de la maquette), réutilisée par l'accueil et le catalogue. */
export function PluginCard({ slug, name, description, priceCents, freeAvailable, Icon }: PluginCardProps) {
  return (
    <article className="group relative flex flex-col gap-3 rounded-card-lg border border-line bg-surface p-[22px] transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-accent">
      <div className="flex items-center justify-between gap-3">
        <Icon width={52} height={52} />
        {freeAvailable && <Badge variant="success">Gratuit disponible</Badge>}
      </div>
      <h3 className="font-display text-[1.08rem] font-semibold tracking-[-.02em]">
        <Link href={`/plugins/${slug}`} className="after:absolute after:inset-0">
          {name}
        </Link>
      </h3>
      <p className="flex-1 text-muted">{description}</p>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1.5">
        <div className="min-w-0">
          <small className="block font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Premium</small>
          <b className="block font-display text-[1.35rem] font-semibold tracking-[-.03em] tabular-nums whitespace-nowrap">
            {priceCents === null ? "Bientôt disponible" : formatPriceCents(priceCents)}
          </b>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-pill py-[.62em] px-[1.05em] text-[.82rem] font-semibold shadow-[inset_0_0_0_1.5px_var(--color-line)] group-hover:shadow-[inset_0_0_0_1.5px_var(--color-accent)]">
          Voir le plugin <FlecheIcon width={16} height={16} />
        </span>
      </div>
    </article>
  );
}
