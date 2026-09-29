import type { ConfigValues } from "@fondamental/shared";
import { gradientAt, parseMiniMessage, rainbowAt, toHex, type Segment } from "./minimessage";

/**
 * Aperçu d'un tag de FondamentalTag (tags.yml) tel qu'en jeu : écrit à la main (`display`), animé
 * image par image (`frames`) ou généré par un effet (`text` + `effect` + `colors` + `style`).
 * Approximation fidèle pour choisir couleurs et effets ; le rendu exact reste celui du plugin.
 */

// ─── Styles de lettres (vrais caractères Unicode, comme le plugin) ─────────

const SMALL_CAPS = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ";
const DOUBLE_HOLES: Record<string, string> = { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" };

/** Premiers points de code (majuscule, minuscule, chiffre) de chaque alphabet mathématique. */
const ALPHABETS: Record<string, [number, number, number | null]> = {
  bold: [0x1d400, 0x1d41a, 0x1d7ce],
  sans: [0x1d5d4, 0x1d5ee, 0x1d7ec],
  italic: [0x1d608, 0x1d622, null],
  script: [0x1d4d0, 0x1d4ea, null],
  fraktur: [0x1d56c, 0x1d586, null],
  double: [0x1d538, 0x1d552, 0x1d7d8],
  mono: [0x1d670, 0x1d68a, 0x1d7f6],
  fullwidth: [0xff21, 0xff41, 0xff10],
};

export function applyLetterStyle(text: string, style: string | undefined): string {
  if (!style || style === "none") return text;
  // Ces alphabets n'ont pas d'accents : le plugin les retire.
  const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (style === "smallcaps") {
    return [...plain].map((c) => (/[a-z]/i.test(c) ? SMALL_CAPS[c.toLowerCase().charCodeAt(0) - 97] : c)).join("");
  }
  const alphabet = ALPHABETS[style];
  if (!alphabet) return text;
  const [upper, lower, digit] = alphabet;
  return [...plain]
    .map((c) => {
      if (style === "double" && DOUBLE_HOLES[c]) return DOUBLE_HOLES[c];
      if (c >= "A" && c <= "Z") return String.fromCodePoint(upper + c.charCodeAt(0) - 65);
      if (c >= "a" && c <= "z") return String.fromCodePoint(lower + c.charCodeAt(0) - 97);
      if (digit !== null && c >= "0" && c <= "9") return String.fromCodePoint(digit + c.charCodeAt(0) - 48);
      return c;
    })
    .join("");
}

// ─── Effets ─────────────────────────────────────────────────────────

const WHITE = "#FFFFFF";

/** Pseudo-hasard stable (une même image donne le même résultat à chaque rendu). */
const noise = (i: number, frame: number) => {
  const x = Math.sin(i * 12.9898 + frame * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const mix = (a: string, b: string, t: number) => gradientAt([a, b], t);

/**
 * Couleur de la lettre `i` sur `n` à l'image `frame` (une image = `speed` ticks). `t` avance de 0 à 1
 * en boucle, sur environ 3 secondes.
 */
function effectColor(effect: string, colors: string[], highlight: string, spread: number, i: number, n: number, frame: number): string {
  const t = (frame % 60) / 60;
  const pos = n <= 1 ? 0 : i / (n - 1);
  const first = colors[0];
  const last = colors[colors.length - 1];
  switch (effect) {
    case "solid":
      return first;
    case "gradient":
      return gradientAt(colors, pos);
    case "wave": {
      const loop = [...colors, colors[0]];
      return gradientAt(loop, (((pos / Math.max(spread, 0.1)) - t) % 1 + 1) % 1);
    }
    case "rainbow":
      return rainbowAt(pos / Math.max(spread, 0.1) - t);
    case "shine": {
      const center = t * (n + 6) - 3;
      const d = Math.abs(i - center);
      return d < 1.5 ? mix(gradientAt(colors, pos), highlight, 1 - d / 1.5) : gradientAt(colors, pos);
    }
    case "pulse":
      return mix(gradientAt(colors, pos), highlight, (Math.sin(t * Math.PI * 2) + 1) / 2);
    case "flicker":
      return noise(0, frame) < 0.12 ? mix(first, "#000000", 0.6) : gradientAt(colors, pos);
    case "fade":
      return gradientAt([...colors, colors[0]], t);
    case "glitch":
      return noise(i, frame) < 0.08 ? last : gradientAt(colors, pos);
    case "sparkle":
      return noise(i, frame) < 0.15 ? highlight : gradientAt(colors, pos);
    case "fire":
      return gradientAt(colors, (Math.sin(pos * 6 + t * Math.PI * 4 + i) + 1) / 2);
    case "strobe":
      return frame % 8 < 4 ? first : last;
    default:
      return gradientAt(colors, pos);
  }
}

const isAnimatedEffect = (effect: string) => !["solid", "gradient"].includes(effect);

export interface TagFrame {
  segments: Segment[];
  /** Millisecondes avant l'image suivante ; `null` si le tag ne bouge pas. */
  delay: number | null;
}

/** Une image de l'aperçu d'un tag. */
export function renderTag(tag: ConfigValues, frame: number): TagFrame {
  const frames = Array.isArray(tag.frames) ? (tag.frames as string[]) : [];
  if (frames.length > 0) {
    const interval = typeof tag.interval === "number" ? tag.interval : 8;
    return { segments: parseMiniMessage(frames[frame % frames.length]), delay: interval * 50 };
  }
  if (typeof tag.text === "string" && tag.text !== "") {
    const effect = typeof tag.effect === "string" ? tag.effect : "gradient";
    const colors = (Array.isArray(tag.colors) ? (tag.colors as string[]) : []).map(toHex).filter((c): c is string => c !== null);
    const palette = colors.length > 0 ? colors : [WHITE];
    const highlight = (typeof tag.highlight === "string" && toHex(tag.highlight)) || WHITE;
    const spread = typeof tag.spread === "number" ? tag.spread : 1;
    const letters = [...applyLetterStyle(tag.text, typeof tag.style === "string" ? tag.style : undefined)];
    const generated: Segment[] = letters.map((char, i) => ({
      text: char,
      color: effectColor(effect, palette, highlight, spread, i, letters.length, frame),
      bold: tag.bold === true,
      italic: tag.italic === true,
    }));
    // `format` : du MiniMessage autour du texte généré ({text}).
    const format = typeof tag.format === "string" && tag.format.includes("{text}") ? tag.format : "{text}";
    const [before, after] = format.split("{text}");
    const segments = [...parseMiniMessage(before), ...generated, ...parseMiniMessage(after ?? "")];
    const speed = typeof tag.speed === "number" ? tag.speed : 2;
    return { segments, delay: isAnimatedEffect(effect) ? Math.max(speed, 1) * 50 : null };
  }
  const display = typeof tag.display === "string" ? tag.display : "";
  return { segments: parseMiniMessage(display), delay: null };
}
