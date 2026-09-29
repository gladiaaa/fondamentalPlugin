"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import type { ProductResponse } from "@fondamental/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ValiderIcon, DocumentationIcon } from "@/components/icons";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import { formatPriceCents } from "@/lib/format";
import { cn } from "@/lib/cn";
import { BedwarsDemo, CrateDemo, PassDemo, TagDemo } from "./demos";

/** Accroche et points forts de chaque plugin (vérifiés dans leur code, voir le wiki). */
const PITCH: Record<string, { tagline: string; points: string[]; Demo: ComponentType }> = {
  bedwars: {
    tagline: "Un Bedwars complet, prêt à jouer.",
    points: [
      "9 modes, jusqu’à 8 équipes, un monde neuf par partie",
      "Matchmaking, vote de carte, party et parties privées",
      "Classé Elo et 8 rangs, classements en hologramme (Premium)",
      "82 cosmétiques achetés avec les coins gagnés en jouant",
      "Boutique, pièges et améliorations d’équipe réglables",
    ],
    Demo: BedwarsDemo,
  },
  tag: {
    tagline: "Des tags qui se voient, jusque dans le chat.",
    points: [
      "Dans le chat, au-dessus de la tête et dans le TAB",
      "12 effets animés et 9 styles de lettres (Premium)",
      "L’Atelier : chaque joueur compose son propre tag",
      "Boutique, raretés et tags saisonniers à dates",
      "Reprend automatiquement une installation TagsCustom",
    ],
    Demo: TagDemo,
  },
  crate: {
    tagline: "Des crates qui donnent envie d’ouvrir.",
    points: [
      "9 animations, dont une chambre au trésor en 3D (Premium)",
      "Éditeur 100 % en jeu, sans toucher un fichier",
      "Pitié, limites de gain, paliers, « quitte ou double » (Premium)",
      "Clés physiques et virtuelles, ouverture multiple",
      "Chances affichées = chances réelles, aucune clé perdue",
    ],
    Demo: CrateDemo,
  },
  pass: {
    tagline: "Un pass de saison pour tout votre réseau.",
    points: [
      "Piste gratuite et piste premium à vendre à vos joueurs",
      "Quêtes du jour, de la semaine et de saison, tirées au hasard",
      "15 objectifs, dont n’importe quel placeholder (Premium)",
      "La même progression sur tous vos serveurs (Premium)",
      "Parchemins, calendrier de connexion, pass événement",
    ],
    Demo: PassDemo,
  },
};

const ORDER = ["bedwars", "tag", "crate", "pass"];

/**
 * Les plugins en action (page d'accueil) : un onglet par plugin, avec ses points forts, ses
 * prérequis et son prix réels, et une démonstration animée.
 */
export function PluginShowcase({ products }: { products: ProductResponse[] | null }) {
  const [active, setActive] = useState("bedwars");
  const product = products?.find((p) => p.slug === active);
  const pitch = PITCH[active];
  const Icon = PLUGIN_ICONS[active];
  const required = product?.requirements.dependencies.filter((d) => d.required).map((d) => d.name) ?? [];

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
              <span className="font-mono text-[.7rem] uppercase tracking-[.1em]">Requiert</span>{" "}
              {[product.requirements.platform, `Java ${product.requirements.java}`, ...required].join(" · ")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <div className="grid">
              <span className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Premium, licence à vie</span>
              <span className="font-display text-[1.5rem] font-semibold tabular-nums">
                {product?.price ? formatPriceCents(product.price.amountCents) : "—"}
              </span>
            </div>
            <Badge variant="success">Version gratuite</Badge>
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
          <pitch.Demo />
        </div>
      </div>
    </div>
  );
}
