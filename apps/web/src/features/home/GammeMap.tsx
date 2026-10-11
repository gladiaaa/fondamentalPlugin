"use client";

import { useState } from "react";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import { cn } from "@/lib/cn";

/** Les liaisons entre plugins (wiki, « La gamme ensemble ») : `from` agit sur `to`. */
const LINKS: Array<{ from: string; to: string; text: string }> = [
  { from: "crate", to: "tag", text: "Une crate peut faire gagner un tag, à vie ou pour 7 jours." },
  { from: "crate", to: "bedwars", text: "Une crate peut donner un cosmétique Bedwars ; déjà possédé, il devient des coins." },
  { from: "pass", to: "tag", text: "Un palier du pass peut offrir un tag, une quête aussi." },
  { from: "pass", to: "crate", text: "Un palier du pass peut donner des clés de crate." },
  { from: "bedwars", to: "pass", text: "Les parties font avancer les quêtes : victoires, kills, lits détruits." },
  { from: "crate", to: "pass", text: "Chaque ouverture de crate fait avancer les quêtes du pass." },
  { from: "shop", to: "crate", text: "La boutique vend des clés de caisses, payées avec l’argent du serveur." },
  { from: "shop", to: "tag", text: "La boutique vend des tags, à vie ou pour une durée." },
  { from: "essentials", to: "shop", text: "L’économie d’Essentials paie les achats ; chaque mouvement est dans son journal." },
];

const NAMES: Record<string, string> = {
  bedwars: "Bedwars",
  tag: "Tag",
  crate: "Crate",
  pass: "Pass",
  shop: "Shop",
  essentials: "Essentials",
};

/** Ordre autour de l'hexagone, choisi pour que les liaisons se croisent le moins possible. */
const RING = ["bedwars", "essentials", "shop", "tag", "crate", "pass"];

/** Position de chaque plugin sur un hexagone, en % du carré de la carte. */
const POS: Record<string, { x: number; y: number }> = Object.fromEntries(
  RING.map((slug, i) => {
    const a = ((i * 60 - 90) * Math.PI) / 180;
    return [slug, { x: 50 + 37 * Math.cos(a), y: 50 + 37 * Math.sin(a) }];
  }),
);

/** Rayon d'un nœud (en unités du viewBox 100×100) : les traits s'arrêtent à son bord. */
const NODE_R = 10.5;

function edge(from: string, to: string) {
  const a = POS[from];
  const b = POS[to];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / len;
  const uy = (b.y - a.y) / len;
  // Liaison dans les deux sens (Crate ↔ Pass) : deux traits parallèles, décalés de part et d'autre.
  const both = LINKS.some((l) => l.from === to && l.to === from);
  const ox = both ? -uy * 1.4 : 0;
  const oy = both ? ux * 1.4 : 0;
  return {
    x1: a.x + ux * NODE_R + ox,
    y1: a.y + uy * NODE_R + oy,
    x2: b.x - ux * (NODE_R + 1.2) + ox,
    y2: b.y - uy * (NODE_R + 1.2) + oy,
  };
}

/**
 * Carte de la gamme (page d'accueil) : les six plugins et les liaisons qui les relient.
 * Choisir un plugin ne garde que ses liaisons, sur la carte comme dans la liste.
 */
export function GammeMap() {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const involved = (l: (typeof LINKS)[number]) => !selected || l.from === selected || l.to === selected;
  const visible = LINKS.map((l, i) => ({ ...l, i })).filter(involved);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-12">
      <div className="relative mx-auto aspect-square w-full max-w-[440px]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <marker id="gamme-fleche" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="3.2" markerHeight="3.2" orient="auto">
              <path d="M0 0 6 3 0 6z" fill="context-stroke" />
            </marker>
          </defs>
          <circle cx="50" cy="50" r="37" fill="none" stroke="var(--color-line)" strokeWidth=".3" strokeDasharray="1 1.6" />
          {LINKS.map((l, i) => {
            const on = hovered === i || (selected !== null && involved(l));
            const dim = (selected !== null && !involved(l)) || (hovered !== null && hovered !== i);
            return (
              <line
                key={i}
                {...edge(l.from, l.to)}
                markerEnd="url(#gamme-fleche)"
                stroke={on ? "var(--color-accent)" : "var(--color-accent-3)"}
                strokeWidth={on ? 0.9 : 0.55}
                strokeLinecap="round"
                className="transition-[stroke,opacity] duration-200"
                opacity={dim ? 0.18 : 1}
              />
            );
          })}
        </svg>
        {RING.map((slug) => {
          const Icon = PLUGIN_ICONS[slug];
          const active = selected === slug;
          const linked = selected !== null && LINKS.some((l) => (l.from === selected && l.to === slug) || (l.to === selected && l.from === slug));
          return (
            <button
              key={slug}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(active ? null : slug)}
              style={{ left: `${POS[slug].x}%`, top: `${POS[slug].y}%` }}
              className={cn(
                "absolute grid aspect-square w-[21%] -translate-x-1/2 -translate-y-1/2 place-items-center content-center gap-0.5 rounded-full border bg-bg transition-[border-color,background-color,opacity] duration-200",
                active
                  ? "border-accent bg-[color-mix(in_srgb,var(--color-accent)_16%,var(--color-bg))]"
                  : "border-line hover:border-accent-2",
                selected !== null && !active && !linked && "opacity-40",
              )}
            >
              {Icon && <Icon className="h-auto w-[clamp(22px,4.4vw,38px)]" />}
              <span className="text-[clamp(.62rem,1.6vw,.78rem)] font-medium leading-none">{NAMES[slug]}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        <p className="text-[.92rem] text-muted" aria-live="polite">
          {selected ? (
            <>
              {visible.length} liaison{visible.length > 1 ? "s" : ""} avec {NAMES[selected]}.{" "}
              <button type="button" onClick={() => setSelected(null)} className="font-medium text-accent-text hover:underline">
                Voir toute la gamme
              </button>
            </>
          ) : (
            "Choisissez un plugin sur la carte pour ne voir que ses liaisons."
          )}
        </p>
        <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line">
          {visible.map(({ from, to, text, i }) => {
            const From = PLUGIN_ICONS[from];
            const To = PLUGIN_ICONS[to];
            return (
              <li
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 bg-surface px-4 py-3.5 transition-colors hover:bg-surface-2"
              >
                <span className="flex items-center gap-1.5" aria-label={`${NAMES[from]} vers ${NAMES[to]}`}>
                  {From && <From width={26} height={26} />}
                  <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true" className="text-accent-2">
                    <path d="M0 5h12M8 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {To && <To width={26} height={26} />}
                </span>
                <p className="text-[.95rem]">{text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
