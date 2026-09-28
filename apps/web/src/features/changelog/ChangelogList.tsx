"use client";

import { useMemo, useState } from "react";
import type { ProductResponse, ReleaseFileResponse } from "@fondamental/shared";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import { PanierIcon } from "@/components/icons";

export interface ChangelogEntry {
  product: Pick<ProductResponse, "slug" | "name">;
  file: ReleaseFileResponse;
}

/**
 * Puces de filtre + liste (`.chips2`/`.cl` de la maquette). `PLUGIN_ICONS`
 * est importé ici plutôt que reçu en prop : un composant React ne peut pas
 * traverser la frontière serveur/client (voir PluginFiche, même piège).
 */
export function ChangelogList({
  entries,
  products,
}: {
  entries: ChangelogEntry[];
  products: Pick<ProductResponse, "slug" | "name">[];
}) {
  const [filter, setFilter] = useState<string>("all");

  const visible = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.product.slug === filter)),
    [entries, filter],
  );

  return (
    <div className="grid gap-6">
      <div role="group" aria-label="Filtrer par plugin" className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Tous
        </FilterChip>
        {products.map((product) => (
          <FilterChip key={product.slug} active={filter === product.slug} onClick={() => setFilter(product.slug)}>
            {product.name.replace("Fondamental", "")}
          </FilterChip>
        ))}
      </div>

      <div className="grid gap-4">
        {visible.map(({ product, file }) => {
          const Icon = PLUGIN_ICONS[product.slug] ?? PanierIcon;
          return (
            <article key={`${product.slug}-${file.release.version}`} className="rounded-card-lg border border-line bg-surface p-5">
              <header className="flex items-center gap-3">
                <Icon width={32} height={32} className="shrink-0" />
                <div>
                  <b className="font-display">
                    {product.name} {file.release.version}
                  </b>
                  <div className="text-[.85rem] text-muted">{formatDate(file.release.releasedAt)}</div>
                </div>
              </header>
              {file.release.changelog ? (
                <p className="mt-3 whitespace-pre-wrap text-[.92rem]">{file.release.changelog}</p>
              ) : (
                <p className="mt-3 text-[.92rem] text-muted">Pas de notes de version.</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill border-[1.5px] px-[1em] py-[.5em] text-[.86rem] font-medium",
        active ? "border-accent bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-accent-text" : "border-line text-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
