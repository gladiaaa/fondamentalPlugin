"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import type { ProductResponse } from "@fondamental/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ValiderIcon, DocumentationIcon } from "@/components/icons";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import { ORDER, PITCH } from "@/features/plugins/pitch";
import { formatPriceCents } from "@/lib/format";
import { cn } from "@/lib/cn";
import { BedwarsDemo, CrateDemo, EssentialsDemo, PassDemo, ShopDemo, TagDemo } from "./demos";

/** Démonstration animée de chaque plugin. */
const DEMOS: Record<string, ComponentType> = {
  bedwars: BedwarsDemo,
  tag: TagDemo,
  crate: CrateDemo,
  pass: PassDemo,
  shop: ShopDemo,
  essentials: EssentialsDemo,
};

/**
 * Les plugins en action (page d'accueil) : un onglet par plugin, avec ses points forts, ses
 * prérequis et son prix réels, et une démonstration animée.
 */
export function PluginShowcase({ products }: { products: ProductResponse[] | null }) {
  const [active, setActive] = useState("bedwars");
  const product = products?.find((p) => p.slug === active);
  const pitch = PITCH[active];
  const Demo = DEMOS[active];
  const Icon = PLUGIN_ICONS[active];
  const required = product?.requirements.dependencies.filter((d) => d.required).map((d) => d.name) ?? [];
  const freeOnly = product?.distribution === "FREE_ONLY";

  return (
    <div className="grid gap-6">
      <div role="tablist" aria-label="Plugins" className="flex flex-wrap gap-2">
        {ORDER.map((slug) => {
          const TabIcon = PLUGIN_ICONS[slug];
          const name = products?.find((p) => p.slug === slug)?.name ?? `Fondamental${slug[0].toUpperCase()}${slug.slice(1)}`;
          return (
            <button
              key={slug}
              type="button"
              role="tab"
              id={`vitrine-${slug}`}
              aria-selected={slug === active}
              aria-controls="vitrine-panneau"
              onClick={() => setActive(slug)}
              className={cn(
                "flex items-center gap-2 rounded-pill border px-4 py-2.5 text-[.92rem] font-medium transition-colors",
                slug === active
                  ? "border-accent bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-text"
                  : "border-line text-muted hover:text-text",
              )}
            >
              {TabIcon && <TabIcon width={22} height={22} />}
              {name.replace("Fondamental", "")}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="vitrine-panneau"
        aria-labelledby={`vitrine-${active}`}
        className="grid items-center gap-8 rounded-card-lg border border-line bg-surface p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      >
        <div className="grid content-start gap-5">
          <div className="flex items-center gap-3">
            {Icon && <Icon width={48} height={48} />}
            <div className="grid">
              <h3 className="font-display text-[1.35rem] font-semibold tracking-[-.03em]">{product?.name ?? active}</h3>
              <p className="text-muted">{pitch.tagline}</p>
            </div>
          </div>
          <ul className="grid gap-2.5">
            {pitch.points.map((point) => (
              <li key={point} className="flex gap-2.5">
                <ValiderIcon className="mt-0.5 shrink-0 text-success" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          {product && (
            <p className="text-[.85rem] text-muted">
              Requiert {[product.requirements.platform, `Java ${product.requirements.java}`, ...required].join(", ")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <div className="grid">
              <span className="text-[.85rem] text-muted">
                {freeOnly ? "Sans licence" : "Premium, licence à vie"}
              </span>
              <span className="font-display text-[1.5rem] font-semibold tabular-nums">
                {freeOnly ? "Gratuit" : product?.price ? formatPriceCents(product.price.amountCents) : "—"}
              </span>
            </div>
            <Badge variant="success">{freeOnly ? "100 % gratuit" : "Version gratuite"}</Badge>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/plugins/${active}`}>Voir le plugin</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/wiki/${active}`}>
                  <DocumentationIcon /> Wiki
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div aria-hidden="true">
          <Demo />
        </div>
      </div>
    </div>
  );
}
