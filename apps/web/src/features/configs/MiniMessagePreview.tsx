"use client";

import { useEffect, useMemo, useState } from "react";
import type { ConfigValues } from "@fondamental/shared";
import { cn } from "@/lib/cn";
import { parseMiniMessage, plainText, type Segment } from "./minimessage";
import { renderTag } from "./tag-effects";

/** Fond façon chat Minecraft : l'aperçu garde des couleurs vraies quel que soit le thème du site. */
const CHAT_BG = "rgba(16, 12, 24, 0.92)";

export function Segments({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) => (
        <span
          key={i}
          style={{
            color: s.color,
            fontWeight: s.bold ? 700 : undefined,
            fontStyle: s.italic ? "italic" : undefined,
            textDecoration: [s.underlined && "underline", s.strikethrough && "line-through"].filter(Boolean).join(" ") || undefined,
          }}
        >
          {s.text}
        </span>
      ))}
    </>
  );
}

/** Aperçu d'un texte MiniMessage sous son champ (noms, lignes d'hologramme, messages…). */
export function MiniMessagePreview({ value, className }: { value: string; className?: string }) {
  const segments = useMemo(() => parseMiniMessage(value), [value]);
  if (value.trim() === "") return null;
  return (
    <div
      className={cn("rounded-field px-3 py-1.5 font-mono text-[.88rem] leading-snug whitespace-pre-wrap break-words", className)}
      style={{ background: CHAT_BG }}
      aria-label={`Aperçu : ${plainText(value)}`}
    >
      <Segments segments={segments} />
    </div>
  );
}

/**
 * Aperçu d'un tag de tags.yml, animé comme en jeu (effets, images), puis dans une ligne de chat
 * et au-dessus de la tête.
 */
export function TagPreview({ tag, player = "Steve" }: { tag: ConfigValues; player?: string }) {
  const [frame, setFrame] = useState(0);
  const current = renderTag(tag, frame);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (current.delay === null || reduceMotion) return;
    const timer = setTimeout(() => setFrame((f) => (f + 1) % 100_000), current.delay);
    return () => clearTimeout(timer);
  }, [current.delay, frame, reduceMotion]);

  const empty = current.segments.length === 0;
  return (
    <div className="grid gap-3 rounded-card border border-line p-4" style={{ background: CHAT_BG }}>
      <div className="flex min-h-12 items-center justify-center font-mono text-[1.6rem] leading-none" aria-live="off">
        {empty ? <span className="text-[.9rem] text-white/50">Le tag s’affichera ici.</span> : <Segments segments={current.segments} />}
      </div>
      {!empty && (
        <div className="grid gap-1.5 border-t border-white/10 pt-3 font-mono text-[.85rem] text-white/85">
          <span>
            <Segments segments={current.segments} /> <span className="text-white">{player}</span>
            <span className="text-white/40"> » </span>
            <span className="text-white/70">Salut tout le monde !</span>
          </span>
          <span className="text-[.75rem] text-white/45">Aperçu approximatif : le rendu final est celui du plugin en jeu.</span>
        </div>
      )}
    </div>
  );
}
