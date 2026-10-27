import type { ConfigValue, ConfigValues } from "@fondamental/shared";

/**
 * Placement des menus de FondamentalShop, recopié de `gui/ShopMenus.java` (1.1.0) : cadre de vitres,
 * cases fixes (`slot`) d'abord, puis le reste dans les cases intérieures libres, page par page, et les
 * boutons du plugin (retour, pages, solde…) par-dessus. À tenir à jour si le plugin change sa mise en page.
 */

export type SlotKind = "frame" | "fill" | "control" | "entry";

export interface Slot {
  kind: SlotKind;
  /** Identifiant Minecraft (`DIAMOND`, `minecraft:diamond`, `itemsadder:…`). */
  material: string;
  /** Nom et description en MiniMessage, pour l'infobulle. */
  name?: string;
  lore?: string[];
  /** Clé de l'article ou identifiant de la catégorie (`kind: "entry"`). */
  key?: string;
  /** L'entrée a sa propre case (`slot`) plutôt qu'une place automatique. */
  fixed?: boolean;
  /** Article que le plugin ignorerait (et pourquoi) : montré dans l'éditeur seulement, à sa case. */
  problem?: string;
  /** Catégorie listée par la commande dont le fichier shops/<id>.yml n'est pas dans l'éditeur. */
  missing?: boolean;
  /** Bouton du plugin qui ramène au menu précédent (cliquable dans l'éditeur, comme en jeu). */
  back?: boolean;
}

export interface MenuLayout {
  rows: number;
  title: string;
  slots: Slot[];
  page: number;
  pages: number;
}

export interface Panes {
  border: string;
  accent: string;
}

export const DEFAULT_PANES: Panes = {
  border: "BLACK_STAINED_GLASS_PANE",
  accent: "PURPLE_STAINED_GLASS_PANE",
};

/** Textes des boutons du plugin (messages_fr.yml livré). */
const CONTROL = {
  back: { material: "ARROW", name: "<texte>Retour" },
  close: { material: "BARRIER", name: "<erreur>Fermer" },
  previous: { material: "SPECTRAL_ARROW", name: "<accent>Page précédente" },
  next: { material: "SPECTRAL_ARROW", name: "<accent>Page suivante" },
  balance: { material: "PLAYER_HEAD", name: "<accent>Votre solde" },
  sell: { material: "HOPPER", name: "<accent>Revendre" },
  rotation: { material: "CLOCK", name: "<accent>Boutique du moment" },
};

const DEFAULT_ICON: Record<string, string> = {
  rank: "DIAMOND",
  permission: "PAPER",
  tag: "NAME_TAG",
  "crate-key": "TRIPWIRE_HOOK",
  info: "BOOK",
};

const str = (v: ConfigValue | undefined) => (typeof v === "string" ? v : undefined);
const num = (v: ConfigValue | undefined) => (typeof v === "number" ? v : undefined);
const strings = (v: ConfigValue | undefined) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const isValues = (v: unknown): v is ConfigValues => typeof v === "object" && v !== null && !Array.isArray(v);

export const clampRows = (rows: ConfigValue | undefined, fallback: number) => Math.max(3, Math.min(6, num(rows) ?? fallback));

/** Cases intérieures (hors cadre) d'un menu de `rows` lignes. */
export function inner(rows: number): number[] {
  const out: number[] = [];
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < 8; c++) out.push(r * 9 + c);
  return out;
}

function frame(rows: number, panes: Panes): (Slot | null)[] {
  const size = rows * 9;
  const slots: (Slot | null)[] = Array.from({ length: size }, () => null);
  const edge: Slot = { kind: "frame", material: panes.border };
  for (let i = 0; i < size; i++) if (i < 9 || i >= size - 9 || i % 9 === 0 || i % 9 === 8) slots[i] = edge;
  for (const i of [0, 8, size - 9, size - 1]) slots[i] = { kind: "frame", material: panes.accent };
  return slots;
}

function finish(slots: (Slot | null)[], panes: Panes): Slot[] {
  return slots.map((s) => s ?? { kind: "fill", material: panes.border });
}

/** Un article est-il chargé par le plugin ? Sinon, la raison (il est alors ignoré, sans case). */
export function articleProblem(article: ConfigValues): string | null {
  const type = str(article.type) ?? "item";
  if (type === "item" && !str(article.material)) return "aucun objet à livrer";
  const required: Record<string, string> = {
    permission: "node",
    rank: "group",
    tag: "tag",
    "crate-key": "crate",
  };
  if (required[type] && !str(article[required[type]])) return `champ « ${required[type]} » manquant`;
  if (type === "command" && strings(article.commands).length === 0) return "aucune commande";
  if (type === "info") return null;
  // « sell » ne compte que pour les objets (type item).
  if (num(article.buy) === undefined && (type !== "item" || num(article.sell) === undefined)) return "ni prix d’achat ni prix de revente";
  return null;
}

export function articleIcon(article: ConfigValues): string {
  const type = str(article.type) ?? "item";
  return str(article.icon) || (type === "item" ? str(article.material) : undefined) || DEFAULT_ICON[type] || "CHEST";
}

function priceLore(article: ConfigValues): string[] {
  const lines: string[] = [];
  const buy = num(article.buy);
  const sell = num(article.sell);
  if (buy !== undefined) lines.push(`<texte>Achat : <fort>${buy}`);
  if (sell !== undefined) lines.push(`<texte>Revente : <fort>${sell}`);
  return lines;
}

const validSlot = (slot: ConfigValue | undefined, size: number) => {
  const n = num(slot);
  return n !== undefined && n >= 0 && n < size ? n : null;
};

/** Menu d'une catégorie (`shops/<id>.yml`), ouvert depuis une commande de boutique. */
export function categoryLayout(category: ConfigValues, page: number, panes: Panes = DEFAULT_PANES): MenuLayout {
  const rows = clampRows(category.rows, 6);
  const size = rows * 9;
  const slots = frame(rows, panes);
  const items = isValues(category.items) ? category.items : {};
  const articles = Object.entries(items).filter((e): e is [string, ConfigValues] => isValues(e[1]) && articleProblem(e[1]) === null);
  const rotation = isValues(category.rotation) ? num(category.rotation.count) : undefined;
  const rotating = rotation !== undefined && rotation < articles.length;

  const toSlot = (key: string, a: ConfigValues, fixed: boolean): Slot => ({
    kind: "entry",
    key,
    fixed,
    material: articleIcon(a),
    name: str(a.name) ?? key,
    lore: [...strings(a.lore), ...priceLore(a)],
  });

  const auto: [string, ConfigValues][] = [];
  const fixedSlots = new Set<number>();
  for (const [key, a] of articles) {
    const slot = rotating ? null : validSlot(a.slot, size);
    if (slot !== null) {
      fixedSlots.add(slot);
      slots[slot] = toSlot(key, a, true);
    } else auto.push([key, a]);
  }
  const free = inner(rows).filter((s) => !fixedSlots.has(s));
  const perPage = Math.max(1, free.length);
  const pages = Math.max(1, Math.ceil(auto.length / perPage));
  const current = Math.max(0, Math.min(page, pages - 1));
  for (let i = 0; i < perPage; i++) {
    const entry = auto[current * perPage + i];
    if (!entry) break;
    slots[free[i]] = toSlot(entry[0], entry[1], false);
  }

  // Articles incomplets ayant leur case : visibles pour l'éditeur, sans rien déplacer (en jeu, la case reste libre).
  for (const [key, a] of Object.entries(items)) {
    if (!isValues(a)) continue;
    const problem = articleProblem(a);
    const slot = validSlot(a.slot, size);
    if (problem && slot !== null && slots[slot]?.kind !== "entry") slots[slot] = { ...toSlot(key, a, true), problem };
  }

  slots[size - 5] = { kind: "control", ...CONTROL.back, back: true };
  if (current > 0) slots[size - 8] = { kind: "control", ...CONTROL.previous };
  if (current < pages - 1) slots[size - 2] = { kind: "control", ...CONTROL.next };
  if (rotating) slots[size - 6] = { kind: "control", ...CONTROL.rotation };
  slots[size - 4] = { kind: "control", ...CONTROL.balance };

  return {
    rows,
    title: `<degrade>Boutique</degrade> <discret>› ${str(category.display) ?? ""}`,
    slots: finish(slots, panes),
    page: current,
    pages,
  };
}

/** Menu d'une commande de boutique (`config.yml > commands.<id>`) avec ses catégories. */
/**
 * `missing` : catégorie dont on n'a pas le fichier ; elle prend sa place dans l'ordre, en « ? » (sa case
 * et son icône sont dans son propre fichier, inconnu ici).
 */
export function commandLayout(
  command: ConfigValues,
  categories: { id: string; values: ConfigValues; missing?: boolean }[],
  panes: Panes = DEFAULT_PANES,
): MenuLayout {
  const rows = clampRows(command.rows, 5);
  const size = rows * 9;
  const slots = frame(rows, panes);
  const fixed = new Set<number>();
  for (const c of categories) {
    const slot = validSlot(c.values.slot, size);
    if (slot !== null) fixed.add(slot);
  }
  const free = inner(rows).filter((s) => !fixed.has(s));
  let next = 0;
  for (const c of categories) {
    let slot = validSlot(c.values.slot, size);
    const isFixed = slot !== null;
    if (slot === null) {
      if (next >= free.length) continue;
      slot = free[next++];
    }
    slots[slot] = {
      kind: "entry",
      key: c.id,
      fixed: isFixed,
      material: c.missing ? "?" : str(c.values.icon) || "CHEST",
      name: str(c.values.display) ?? c.id,
      lore: c.missing
        ? [`<texte>shops/${c.id}.yml n’est pas encore dans l’éditeur.`, "<texte>Importez-le pour voir son icône et sa case."]
        : strings(c.values.lore),
      ...(c.missing && { missing: true }),
    };
  }
  slots[size - 6] = { kind: "control", ...CONTROL.balance };
  slots[size - 5] = { kind: "control", ...CONTROL.close };
  slots[size - 4] = { kind: "control", ...CONTROL.sell };
  return {
    rows,
    title: str(command.title) || "<degrade>Boutique</degrade>",
    slots: finish(slots, panes),
    page: 0,
    pages: 1,
  };
}

/**
 * Nouvelles valeurs de `items` après avoir glissé l'article `key` dans la case `target` : il y prend
 * une case fixe ; l'article fixe qui l'occupait reprend l'ancienne case du premier, ou se place
 * automatiquement si le premier n'en avait pas.
 */
export function moveArticle(items: ConfigValues, key: string, target: number): ConfigValues {
  const moved = items[key];
  if (!isValues(moved)) return items;
  const from = num(moved.slot);
  const next: ConfigValues = { ...items, [key]: { ...moved, slot: target } };
  for (const [other, a] of Object.entries(items)) {
    if (other === key || !isValues(a) || num(a.slot) !== target) continue;
    const swapped = { ...a };
    if (from === undefined) delete swapped.slot;
    else swapped.slot = from;
    next[other] = swapped;
  }
  return next;
}

/** Identifiant libre pour un nouvel article créé depuis l'objet `material`. */
export function newArticleKey(items: ConfigValues, material: string): string {
  const base =
    material
      .replace(/^minecraft:/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_") || "article";
  if (!(base in items)) return base;
  let i = 2;
  while (`${base}_${i}` in items) i++;
  return `${base}_${i}`;
}

/** Fichier de catégorie (`shops/<id>.yml`) : son nom d'enregistrement en est l'identifiant. */
export const CATEGORY_FILE = "categorie.yml";
export const CATEGORY_ID = /^[A-Za-z0-9_-]{1,64}$/;
