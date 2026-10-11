"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { DRAG_TYPE, McItem, type DragData } from "./Chest";
import type { McItems } from "./items";

/** Nombre d'objets affichés à la fois : la recherche affine, la liste complète en compte 1 385. */
const SHOWN = 280;

/**
 * Palette des objets Minecraft : à glisser dans le coffre, ou à cliquer pour l'appliquer à l'entrée
 * choisie. Entrée dans la recherche = le premier résultat.
 */
export function ItemPalette({
  items,
  onPick,
  pickLabel,
  tall = false,
}: {
  items: McItems | null;
  onPick?: (material: string) => void;
  pickLabel?: string;
  /** Colonne pleine hauteur (éditeur de menus) : sans hauteur maximale, deux fois plus d'objets affichés. */
  tall?: boolean;
}) {
  const shown = tall ? SHOWN * 2 : SHOWN;
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const matches = useMemo(() => {
    if (!items) return [];
    const q = deferred.trim().toLowerCase().replace(/\s+/g, "_");
    const list = items.items.map(([id, name]) => ({ id, name }));
    return q ? list.filter((it) => it.id.includes(q) || it.name.toLowerCase().replace(/\s+/g, "_").includes(q)) : list;
  }, [items, deferred]);

  return (
    <div className="grid min-w-0 content-start gap-2.5">
      <Input
        type="search"
        value={query}
        placeholder="Chercher un objet (diamond, glass…)"
        aria-label="Chercher un objet Minecraft"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0] && onPick) {
            e.preventDefault();
            onPick(matches[0].id.toUpperCase());
          }
        }}
      />
      <p className="text-[.78rem] text-muted">{pickLabel ?? "Glissez un objet dans le coffre."}</p>
      <ul
        className={cn(
          "grid grid-cols-[repeat(auto-fill,36px)] gap-0.5 rounded-field border border-line bg-bg p-1.5",
          !tall && "max-h-[340px] overflow-y-auto",
        )}
        aria-label="Objets Minecraft"
      >
        {matches.slice(0, shown).map(({ id, name }) => (
          <li key={id}>
            <button
              type="button"
              tabIndex={-1}
              draggable
              title={`${name} (${id.toUpperCase()})`}
              aria-label={name}
              onClick={() => onPick?.(id.toUpperCase())}
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  DRAG_TYPE,
                  JSON.stringify({
                    material: id.toUpperCase(),
                  } satisfies DragData),
                );
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="grid h-9 w-9 cursor-grab place-items-center rounded-[4px] hover:bg-surface-2"
            >
              <McItem material={id} items={items} />
            </button>
          </li>
        ))}
      </ul>
      {matches.length > shown && <p className="text-[.78rem] text-muted">{matches.length - shown} autres : affinez la recherche.</p>}
      {items && matches.length === 0 && <p className="text-[.85rem] text-muted">Aucun objet ne correspond.</p>}
    </div>
  );
}
