"use client";

import { useEffect, useState } from "react";
import type { ConfigValues } from "@fondamental/shared";
import { Segments } from "@/features/configs/MiniMessagePreview";
import { parseMiniMessage } from "@/features/configs/minimessage";
import { renderTag } from "@/features/configs/tag-effects";

/**
 * Chat de serveur de la page d'accueil : les messages des quatre plugins arrivent un à un, en boucle.
 * Rien d'inventé : textes repris des messages.yml des plugins, tags repris du tags.yml livré avec
 * FondamentalTag (animés par le même moteur que le configurateur).
 */

const TAGS: Record<string, ConfigValues> = {
  fondateur: {
    text: "Fondateur",
    style: "smallcaps",
    effect: "shine",
    colors: ["#FFF3B0", "#FFC837", "#FF8008"],
    bold: true,
    format: "<color:#FFD54F>♛</color> {text}",
  },
  legende: { text: "Légende", effect: "rainbow", spread: 1.5, bold: true, format: "<dark_gray>[</dark_gray>{text}<dark_gray>]</dark_gray>" },
  vipPlus: {
    text: "VIP+",
    effect: "shine",
    colors: ["#00E5FF", "#2979FF"],
    bold: true,
    format: "<dark_gray>[</dark_gray>{text}<dark_gray>]</dark_gray>",
  },
  streamer: { text: "Streamer", effect: "flicker", colors: ["#EA80FC", "#7C4DFF"], bold: true, format: "<color:#FF1744>●</color> {text}" },
};

type Line =
  | { kind: "player"; tag: keyof typeof TAGS; player: string; message: string }
  | { kind: "plugin"; text: string };

const CRATE = "<degrade>[FCrate]</degrade> ";
const PASS = "<degrade>[FPass]</degrade> ";

const LINES: Line[] = [
  { kind: "player", tag: "fondateur", player: "Gladiaa", message: "Bienvenue à tous, la saison 1 commence !" },
  {
    kind: "plugin",
    text: `${PASS}<degrade>Palier atteint !</degrade> <texte>Tu es au palier <fort>12</fort><discret>/</discret><fort>30</fort>. <accent>/pass</accent> <texte>pour récupérer tes récompenses.`,
  },
  {
    kind: "plugin",
    text: `${CRATE}<fort>Alex</fort> <texte>vient de sortir</texte> <gradient:#FFD700:#FF8C00>Tag Légende</gradient> <texte>de</texte> <gradient:#00FFFF:#1E90FF><bold>Crate Vote</bold></gradient><texte> !`,
  },
  { kind: "player", tag: "legende", player: "Alex", message: "enfin, 50 ouvertures pour lui !" },
  { kind: "plugin", text: "&6★ Sam &7a détruit le lit de l'équipe &cRouge&7 !" },
  { kind: "player", tag: "vipPlus", player: "Sam", message: "on fonce au centre ?" },
  { kind: "plugin", text: `${PASS}<ok>Quête terminée : <fort>Bûcheron</fort><ok> ! <accent>+150 XP` },
  { kind: "player", tag: "streamer", player: "Luna", message: "le live commence, venez !" },
];

/** Charte Fondamental par défaut, comme dans les plugins (couleurs des balises <texte>, <fort>…). */
const CHAT_FORMAT = { arrow: "#555555", player: "#FFFFFF", message: "#AAAAAA" };

const VISIBLE = 6;
const NEXT_LINE_MS = 1900;
const FRAME_MS = 100;

function ChatLine({ line, frame }: { line: Line; frame: number }) {
  if (line.kind === "plugin") return <Segments segments={parseMiniMessage(line.text)} />;
  return (
    <>
      <Segments segments={renderTag(TAGS[line.tag], frame).segments} />{" "}
      <span style={{ color: CHAT_FORMAT.player }}>{line.player}</span>
      <span style={{ color: CHAT_FORMAT.arrow }}> » </span>
      <span style={{ color: CHAT_FORMAT.message }}>{line.message}</span>
    </>
  );
}

export function HeroChat() {
  // Nombre de messages arrivés depuis le début (le chat montre les derniers, en boucle).
  const [count, setCount] = useState(3);
  const [frame, setFrame] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const lines = setInterval(() => setCount((c) => c + 1), NEXT_LINE_MS);
    const frames = setInterval(() => setFrame((f) => (f + 1) % 100_000), FRAME_MS);
    return () => {
      clearInterval(lines);
      clearInterval(frames);
    };
  }, [reduceMotion]);

  const shown = reduceMotion ? LINES.slice(0, VISIBLE).map((line, i) => ({ line, id: i })) : Array.from({ length: Math.min(count, VISIBLE) }, (_, i) => {
    const id = count - Math.min(count, VISIBLE) + i;
    return { line: LINES[id % LINES.length], id };
  });

  return (
    <div
      aria-hidden="true"
      className="grid gap-3 rounded-card-lg border border-[#2A2338] bg-[#08060D] p-4 shadow-[0_24px_60px_-30px_rgba(183,160,255,.45)] sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[.66rem] uppercase tracking-[.12em] text-[#8A8199]">Chat du serveur</span>
        <span className="font-mono text-[.66rem] text-[#8A8199]">Bedwars · Tag · Crate · Pass</span>
      </div>
      <ul className="flex min-h-[248px] flex-col justify-end gap-1.5 font-mono text-[.82rem] leading-[1.55] sm:min-h-[264px]">
        {shown.map(({ line, id }) => (
          <li key={id} className="animate-[chat-in_.45s_ease-out] rounded-[6px] bg-black/35 px-2 py-1 break-words">
            <ChatLine line={line} frame={frame} />
          </li>
        ))}
      </ul>
      <div className="rounded-[6px] border border-[#2A2338] px-2.5 py-1.5 font-mono text-[.78rem] text-[#5E5673]">
        Appuyez sur T pour discuter…
      </div>
    </div>
  );
}
