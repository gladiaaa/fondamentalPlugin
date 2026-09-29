/**
 * Aperçu MiniMessage (https://docs.advntr.dev/minimessage/format.html) côté site : assez pour voir un
 * tag, un nom de crate ou une ligne d'hologramme comme en jeu. Couleurs nommées et hexadécimales,
 * dégradés, arc-en-ciel, décorations, balises de la charte Fondamental et codes « & » (Bedwars).
 * Les balises inconnues (clics, survols, placeholders <player>…) restent affichées telles quelles.
 */

export interface Segment {
  text: string;
  color: string;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
}

interface Style {
  color: string;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  /** Dégradé en cours : couleurs, et nombre de lettres qu'il couvre. */
  gradient?: { colors: string[]; length: number; index: number };
}

export const NAMED_COLORS: Record<string, string> = {
  black: "#000000",
  dark_blue: "#0000AA",
  dark_green: "#00AA00",
  dark_aqua: "#00AAAA",
  dark_red: "#AA0000",
  dark_purple: "#AA00AA",
  gold: "#FFAA00",
  gray: "#AAAAAA",
  grey: "#AAAAAA",
  dark_gray: "#555555",
  dark_grey: "#555555",
  blue: "#5555FF",
  green: "#55FF55",
  aqua: "#55FFFF",
  red: "#FF5555",
  light_purple: "#FF55FF",
  yellow: "#FFFF55",
  white: "#FFFFFF",
};

/** Balises de la charte Fondamental (valeurs par défaut de `colors:` dans config.yml). */
const CHARTE: Record<string, string> = {
  texte: "#9A90B3",
  fort: "#F0ECF8",
  accent: "#B7A0FF",
  discret: "#6A5D94",
  ok: "#7ED6A0",
  erreur: "#F07A7A",
  alerte: "#F0C36A",
  info: "#8FB8FF",
};
const CHARTE_DEGRADE = ["#B7A0FF", "#6A5D94"];

const LEGACY: Record<string, string> = {
  "0": "black",
  "1": "dark_blue",
  "2": "dark_green",
  "3": "dark_aqua",
  "4": "dark_red",
  "5": "dark_purple",
  "6": "gold",
  "7": "gray",
  "8": "dark_gray",
  "9": "blue",
  a: "green",
  b: "aqua",
  c: "red",
  d: "light_purple",
  e: "yellow",
  f: "white",
};

const DEFAULT_COLOR = "#FFFFFF";

export function toHex(color: string): string | null {
  const c = color.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(c)) return c;
  return NAMED_COLORS[c] ?? CHARTE[c] ?? null;
}

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

/** Couleur au point `t` (0 à 1) d'un dégradé à plusieurs couleurs. */
export function gradientAt(colors: string[], t: number): string {
  if (colors.length === 0) return DEFAULT_COLOR;
  if (colors.length === 1) return colors[0];
  const scaled = Math.min(Math.max(t, 0), 1) * (colors.length - 1);
  const i = Math.min(Math.floor(scaled), colors.length - 2);
  const local = scaled - i;
  const [a, b] = [hexToRgb(colors[i]), hexToRgb(colors[i + 1])];
  return rgbToHex(a.map((v, k) => v + (b[k] - v) * local));
}

/** Arc-en-ciel : teinte `t` (0 à 1). */
export function rainbowAt(t: number): string {
  const h = ((t % 1) + 1) % 1;
  const f = (n: number) => {
    const k = (n + h * 6) % 6;
    return 255 * (1 - Math.max(0, Math.min(k, 4 - k, 1)));
  };
  return rgbToHex([f(5), f(3), f(1)]);
}

/** Nombre de lettres visibles d'un morceau de MiniMessage (pour étaler un dégradé). */
function visibleLength(source: string): number {
  return source.replace(/<[^<>]*>/g, "").replace(/&[0-9a-fk-or]/gi, "").length;
}

/** Transforme du MiniMessage (et des codes « & ») en morceaux de texte stylés. */
export function parseMiniMessage(input: string): Segment[] {
  const segments: Segment[] = [];
  const stack: Style[] = [{ color: DEFAULT_COLOR }];
  const top = () => stack[stack.length - 1];

  const push = (text: string) => {
    for (const char of text) {
      const style = top();
      let color = style.color;
      if (style.gradient) {
        const g = style.gradient;
        color = g.colors[0] === "rainbow" ? rainbowAt(g.index / Math.max(g.length, 1)) : gradientAt(g.colors, g.length <= 1 ? 0 : g.index / (g.length - 1));
        g.index++;
      }
      const last = segments[segments.length - 1];
      const same =
        last &&
        last.color === color &&
        !!last.bold === !!style.bold &&
        !!last.italic === !!style.italic &&
        !!last.underlined === !!style.underlined &&
        !!last.strikethrough === !!style.strikethrough;
      if (same) last.text += char;
      else
        segments.push({
          text: char,
          color,
          bold: style.bold,
          italic: style.italic,
          underlined: style.underlined,
          strikethrough: style.strikethrough,
        });
    }
  };

  // Une couleur remplace le dégradé en cours ; une décoration (gras…) le garde, lettre après lettre.
  const open = (patch: Partial<Style>) => stack.push({ ...top(), gradient: undefined, ...patch });
  const decorate = (patch: Partial<Style>) => stack.push({ ...top(), ...patch });
  const close = () => stack.length > 1 && stack.pop();

  let i = 0;
  while (i < input.length) {
    const char = input[i];
    // Codes « & » (legacy) : &a, &l, &r…
    if (char === "&" && i + 1 < input.length && /[0-9a-fk-or]/i.test(input[i + 1])) {
      const code = input[i + 1].toLowerCase();
      if (LEGACY[code]) stack.splice(1, stack.length, { color: NAMED_COLORS[LEGACY[code]] });
      else if (code === "l") decorate({ bold: true });
      else if (code === "o") decorate({ italic: true });
      else if (code === "n") decorate({ underlined: true });
      else if (code === "m") decorate({ strikethrough: true });
      else if (code === "r") stack.splice(1);
      i += 2;
      continue;
    }
    if (char === "<") {
      const end = input.indexOf(">", i);
      if (end === -1) {
        push(input.slice(i));
        break;
      }
      const raw = input.slice(i + 1, end);
      const closing = raw.startsWith("/");
      const [name, ...args] = (closing ? raw.slice(1) : raw).split(":");
      const tag = name.toLowerCase();
      const known = handleTag(tag, args, closing, input, end);
      if (known) {
        i = end + 1;
        continue;
      }
      push(`<${raw}>`);
      i = end + 1;
      continue;
    }
    push(char);
    i++;
  }
  return segments;

  function handleTag(tag: string, args: string[], closing: boolean, source: string, end: number): boolean {
    const decorations: Record<string, keyof Style> = {
      b: "bold",
      bold: "bold",
      i: "italic",
      em: "italic",
      italic: "italic",
      u: "underlined",
      underlined: "underlined",
      st: "strikethrough",
      strikethrough: "strikethrough",
    };
    if (tag === "reset") {
      stack.splice(1);
      return true;
    }
    if (decorations[tag] || tag === "color" || tag === "c" || tag === "gradient" || tag === "rainbow" || tag === "degrade" || toHex(tag)) {
      if (closing) {
        close();
        return true;
      }
    } else {
      return false;
    }
    if (decorations[tag]) {
      decorate({ [decorations[tag]]: true } as Partial<Style>);
      return true;
    }
    // Longueur de texte jusqu'à la balise fermante correspondante (pour étaler un dégradé).
    const closer = source.indexOf(`</${tag}`, end);
    const span = visibleLength(source.slice(end + 1, closer === -1 ? undefined : closer));
    if (tag === "gradient" || tag === "degrade") {
      const colors = tag === "degrade" ? CHARTE_DEGRADE : args.map(toHex).filter((c): c is string => c !== null);
      open({ gradient: { colors: colors.length ? colors : [DEFAULT_COLOR], length: span, index: 0 } });
      return true;
    }
    if (tag === "rainbow") {
      open({ gradient: { colors: ["rainbow"], length: span, index: 0 } });
      return true;
    }
    const hex = tag === "color" || tag === "c" ? toHex(args.join(":")) : toHex(tag);
    open({ color: hex ?? top().color });
    return true;
  }
}

/** Texte sans aucune mise en forme (pour les lecteurs d'écran). */
export function plainText(input: string): string {
  return parseMiniMessage(input)
    .map((s) => s.text)
    .join("");
}
