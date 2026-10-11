"use client";

import { useEffect, useState } from "react";

/**
 * Icônes des objets Minecraft 1.21.4 : une seule image (`public/minecraft/items-1.21.4.png`, 32 px par
 * objet, dans l'ordre de l'inventaire créatif) et son index. Générées depuis le paquet npm
 * `minecraft-textures` (destruc7i0n) ; les images appartiennent à Mojang Studios.
 */
export const ATLAS_URL = "/minecraft/items-1.21.4.png";
const INDEX_URL = "/minecraft/items-1.21.4.json";

export interface McItems {
  size: number;
  columns: number;
  /** [identifiant sans « minecraft: », nom anglais], dans l'ordre de l'atlas. */
  items: [string, string][];
  byId: Map<string, number>;
}

let loading: Promise<McItems> | null = null;

function load(): Promise<McItems> {
  loading ??= fetch(INDEX_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<Omit<McItems, "byId">>;
    })
    .then((data) => ({
      ...data,
      byId: new Map(data.items.map(([id], i) => [id, i])),
    }))
    .catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
}

/** Index des objets, chargé une fois pour toute la page ; `null` tant qu'il arrive (ou s'il manque). */
export function useMcItems(): McItems | null {
  const [items, setItems] = useState<McItems | null>(null);
  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => !cancelled && setItems(data))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return items;
}

/** `DIAMOND`, `minecraft:diamond` → `diamond` ; `itemsadder:…` et autres espaces de noms → `null`. */
export function vanillaId(material: string): string | null {
  const [ns, id] = material.includes(":") ? material.split(":", 2) : ["minecraft", material];
  return ns.toLowerCase() === "minecraft" && id ? id.toLowerCase() : null;
}
