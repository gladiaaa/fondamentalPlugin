"use client";

import { useEffect, useState } from "react";
import type { ConfigValues } from "@fondamental/shared";
import { Segments } from "@/features/configs/MiniMessagePreview";
import { parseMiniMessage } from "@/features/configs/minimessage";
import { renderTag } from "@/features/configs/tag-effects";
import { cn } from "@/lib/cn";

/**
 * Démonstrations animées de la page d'accueil, une par plugin. Contenus repris des fichiers livrés
 * avec les plugins (tags.yml, crates.yml, season.yml, config.yml de Bedwars) ; mise en scène
 * simplifiée, pas une capture du jeu. Immobiles si l'utilisateur réduit les animations.
 */

/** Fond sombre façon Minecraft, identique en thème clair et sombre. */
const SCREEN = "rounded-card-lg border border-[#2A2338] bg-[#08060D] p-4 font-mono text-[#D8D2E6] sm:p-5";

function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduce;
}

/** Compteur qui avance toutes les `ms` millisecondes (figé si les animations sont réduites). */
function useTick(ms: number): number {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(timer);
  }, [ms, reduce]);
  return tick;
}

function MM({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      <Segments segments={parseMiniMessage(text)} />
    </span>
  );
}

// ─── FondamentalTag : des tags animés côte à côte ─────────────────

const DEMO_TAGS: Array<{ label: string; tag: ConfigValues }> = [
  { label: "Reflet", tag: { text: "Fondateur", style: "smallcaps", effect: "shine", colors: ["#FFF3B0", "#FFC837", "#FF8008"], bold: true, format: "<color:#FFD54F>♛</color> {text}" } },
  { label: "Arc-en-ciel", tag: { text: "Légende", effect: "rainbow", spread: 1.5, bold: true, format: "<dark_gray>[</dark_gray>{text}<dark_gray>]</dark_gray>" } },
  { label: "Néon", tag: { text: "Streamer", effect: "flicker", colors: ["#EA80FC", "#7C4DFF"], bold: true, format: "<color:#FF1744>●</color> {text}" } },
  { label: "Vague", tag: { text: "Océan", effect: "wave", colors: ["#40E0FF", "#5B7CFF", "#B266FF"], bold: true, format: "<dark_gray>[</dark_gray>{text}<dark_gray>]</dark_gray>" } },
  { label: "Flammes", tag: { text: "Brasier", effect: "fire", colors: ["#FF5555", "#FFA040", "#FFE55C"], bold: true, style: "fraktur", format: "<dark_gray>[</dark_gray>{text}<dark_gray>]</dark_gray>" } },
  { label: "Scintillement", tag: { text: "Étoile", effect: "sparkle", colors: ["#B7A0FF", "#6A5D94"], highlight: "#FFFFFF", bold: true, format: "<color:#FFD700>✦</color> {text}" } },
];

export function TagDemo() {
  const frame = useTick(100);
  return (
    <div className={cn(SCREEN, "grid gap-3")}>
      <span className="text-[.66rem] uppercase tracking-[.12em] text-[#8A8199]">Menu des tags</span>
      <ul className="grid grid-cols-2 gap-2">
        {DEMO_TAGS.map(({ label, tag }) => (
          <li key={label} className="grid gap-1 rounded-[8px] border border-white/5 bg-black/40 px-3 py-2.5">
            <span className="truncate text-[1.02rem] leading-tight">
              <Segments segments={renderTag(tag, frame).segments} />
            </span>
            <span className="text-[.68rem] text-[#8A8199]">{label}</span>
          </li>
        ))}
      </ul>
      <p className="text-[.8rem] leading-snug">
        <Segments segments={renderTag(DEMO_TAGS[0].tag, frame).segments} /> <span className="text-white">Gladiaa</span>
        <span className="text-[#555555]"> » </span>
        <span className="text-[#AAAAAA]">animé jusque dans le chat</span>
      </p>
    </div>
  );
}

// ─── FondamentalCrate : la roulette ──────────────────────────────

const RARITY = {
  common: { name: "<gray>Commun", color: "#AAAAAA" },
  rare: { name: "<aqua>Rare", color: "#00BFFF" },
  epic: { name: "<light_purple>Épique", color: "#AA00FF" },
  legendary: { name: "<gradient:#FFD700:#FF8C00>Légendaire</gradient>", color: "#FFD700" },
} as const;

type Lot = { name: string; icon: string; rarity: keyof typeof RARITY };

const LOTS: Lot[] = [
  { name: "<aqua>8 Diamants", icon: "💎", rarity: "common" },
  { name: "<green>16 Émeraudes", icon: "🟩", rarity: "common" },
  { name: "<gold>Clé Légendaire", icon: "🗝️", rarity: "rare" },
  { name: "<white>Tag <aqua><bold>Frost", icon: "🏷️", rarity: "epic" },
  { name: "<yellow>Pomme dorée ×4", icon: "🍎", rarity: "common" },
  { name: "<gradient:#FFD700:#FF8C00><bold>Épée légendaire</bold></gradient>", icon: "🗡️", rarity: "legendary" },
  { name: "<light_purple>Clé Mythique", icon: "🔮", rarity: "epic" },
  { name: "<gray>Fer ×32", icon: "⛓️", rarity: "common" },
];

/** Un tour : 34 crans qui ralentissent, puis le gain reste affiché ~2,5 s. */
const SPIN_STEPS = 34;
const HOLD_STEPS = 18;

export function CrateDemo() {
  const tick = useTick(90);
  const round = Math.floor(tick / (SPIN_STEPS + HOLD_STEPS));
  const inRound = tick % (SPIN_STEPS + HOLD_STEPS);
  // Ralentissement : de plus en plus de ticks par cran vers la fin.
  const eased = Math.round(SPIN_STEPS * (1 - Math.pow(1 - Math.min(inRound, SPIN_STEPS) / SPIN_STEPS, 2.2)));
  const offset = round * 7 + eased;
  const winner = LOTS[(offset + 2) % LOTS.length];
  const done = inRound >= SPIN_STEPS;
  const visible = Array.from({ length: 5 }, (_, i) => LOTS[(offset + i) % LOTS.length]);

  return (
    <div className={cn(SCREEN, "grid gap-4")}>
      <div className="flex items-center justify-between">
        <MM text="<gradient:#00FFFF:#1E90FF><bold>Crate Vote</bold></gradient>" className="text-[.95rem]" />
        <span className="text-[.66rem] uppercase tracking-[.12em] text-[#8A8199]">Animation roulette</span>
      </div>
      <div className="relative grid grid-cols-5 gap-1.5">
        {visible.map((lot, i) => (
          <div
            key={i}
            className={cn(
              "grid aspect-square place-items-center rounded-[6px] border-2 bg-black/50 text-[1.6rem] transition-transform",
              i === 2 && done && "scale-110",
            )}
            style={{ borderColor: RARITY[lot.rarity].color + (i === 2 ? "" : "66") }}
          >
            <span aria-hidden>{lot.icon}</span>
          </div>
        ))}
        <span aria-hidden className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-[.8rem] text-[#FFD700]">▼</span>
      </div>
      <div className={cn("min-h-[3.2rem] rounded-[8px] bg-black/40 px-3 py-2 text-center transition-opacity", done ? "opacity-100" : "opacity-0")}>
        <MM text={RARITY[winner.rarity].name} className="block text-[.72rem] uppercase tracking-[.1em]" />
        <MM text={winner.name} className="block text-[.95rem]" />
      </div>
      <p className="text-[.72rem] text-[#8A8199]">
        Tirage fait avant l’animation · chances affichées = chances réelles · aucune clé perdue
      </p>
    </div>
  );
}

// ─── FondamentalPass : la piste du pass de saison ─────────────────

const TIERS = [
  { n: 1, free: "💰 100", premium: "🗝️ Clé Vote" },
  { n: 2, free: "🍎 ×8", premium: "" },
  { n: 3, free: "💰 250", premium: "🏷️ Pionnier" },
  { n: 4, free: "", premium: "✨ Boost" },
  { n: 5, free: "🗝️ Clé Vote", premium: "💰 1 000" },
  { n: 6, free: "💎 ×5", premium: "🔮 Mythique" },
];

export function PassDemo() {
  const tick = useTick(120);
  const cycle = tick % 70;
  // XP totale : de 0 au palier 5 et demi, puis repart.
  const progress = Math.min(cycle / 55, 1) * 5.5;
  const level = Math.floor(progress);
  const inTier = progress - level;

  return (
    <div className={cn(SCREEN, "grid gap-3")}>
      <div className="flex items-center justify-between gap-2">
        <MM text="<gradient:#B7A0FF:#6A5D94>Saison 1</gradient> <dark_gray>·</dark_gray> <white>Les Origines" className="text-[.9rem]" />
        <span className="text-[.7rem] text-[#8A8199]">
          Palier <span className="text-white">{level}</span>/30
        </span>
      </div>
      {/* Sur petit écran, la piste défile plutôt que d'écraser ses cases. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="grid min-w-[460px] grid-cols-[auto_repeat(6,minmax(0,1fr))] items-center gap-1.5 text-[.72rem]">
        <span className="pr-1 text-[#7ED6A0]">Gratuit</span>
        {TIERS.map((t) => (
          <Cell key={`f${t.n}`} reward={t.free} unlocked={level >= t.n} />
        ))}
        <span />
        {TIERS.map((t) => (
          <span key={`n${t.n}`} className={cn("text-center", level >= t.n ? "text-[#B7A0FF]" : "text-[#5E5673]")}>
            {t.n}
          </span>
        ))}
        <span className="pr-1 text-[#FFC837]">Premium</span>
        {TIERS.map((t) => (
          <Cell key={`p${t.n}`} reward={t.premium} unlocked={level >= t.n} premium />
        ))}
      </div>
      </div>
      <div className="grid gap-1">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-[#B7A0FF] to-[#6A5D94] transition-[width] duration-100" style={{ width: `${Math.round(inTier * 100)}%` }} />
        </div>
        <span className="text-[.7rem] text-[#8A8199]">
          {Math.round(inTier * 1000)} / 1 000 XP · quêtes du jour, de la semaine et de saison
        </span>
      </div>
      <MM
        text={level >= 1 ? `<gradient:#B7A0FF:#6A5D94>[FPass]</gradient> <gradient:#B7A0FF:#6A5D94>Palier atteint !</gradient> <gray>Tu es au palier <white>${level}</white>.` : "<gray>Termine des quêtes pour gagner de l'XP."}
        className="text-[.78rem]"
      />
    </div>
  );
}

function Cell({ reward, unlocked, premium }: { reward: string; unlocked: boolean; premium?: boolean }) {
  return (
    <span
      className={cn(
        "grid min-h-11 place-items-center rounded-[6px] border px-0.5 text-center leading-tight transition-colors",
        reward === "" ? "border-white/5 text-transparent" : unlocked ? (premium ? "border-[#FFC837]/60 bg-[#FFC837]/10" : "border-[#7ED6A0]/60 bg-[#7ED6A0]/10") : "border-white/10 bg-black/40 opacity-50",
      )}
    >
      {reward || "·"}
    </span>
  );
}

// ─── FondamentalBedwars : le scoreboard d'une partie ──────────────

const TEAMS = [
  { letter: "R", name: "Rouge", color: "#FF5555" },
  { letter: "B", name: "Bleu", color: "#5555FF" },
  { letter: "V", name: "Vert", color: "#55FF55" },
  { letter: "J", name: "Jaune", color: "#FFFF55" },
];

export function BedwarsDemo() {
  const tick = useTick(1000);
  const cycle = tick % 40;
  // Diamants II à 6:00 : le compte à rebours part de 1:20 ; le lit vert tombe à 12 s, le jaune à 26 s.
  const left = Math.max(80 - cycle * 2, 0);
  const greenBed = cycle < 12;
  const yellowBed = cycle < 26;
  const events = [
    cycle >= 12 && "&6★ Alex &7a détruit le lit de l'équipe &aVert&7 !",
    cycle >= 26 && "&6★ Sam &7a détruit le lit de l'équipe &eJaune&7 !",
    cycle >= 32 && "&c&lKILL FINAL &7Luna a été éliminée.",
  ].filter(Boolean) as string[];

  return (
    <div className={cn(SCREEN, "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]")}>
      <div className="flex min-h-[180px] flex-col justify-end gap-1 text-[.76rem]">
        {events.length === 0 && <span className="text-[#8A8199]">La partie commence : défendez votre lit !</span>}
        {events.map((e) => (
          <MM key={e} text={e} className="animate-[chat-in_.45s_ease-out] rounded-[6px] bg-black/35 px-2 py-1" />
        ))}
      </div>
      <div className="grid min-w-[170px] content-start gap-0.5 rounded-[6px] bg-black/55 px-3 py-2.5 text-[.8rem]">
        <span className="text-center font-bold tracking-[.08em] text-[#FFFF55]">BED WARS</span>
        <span className="mb-1 text-center text-[.68rem] text-[#AAAAAA]">Duos · Lighthouse</span>
        <span>
          <span className="text-white">Diamants II</span> <span className="text-[#AAAAAA]">dans</span>{" "}
          <span className="text-[#55FF55]">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </span>
        </span>
        <span className="mb-1" />
        {TEAMS.map((t) => {
          const bed = t.name === "Vert" ? greenBed : t.name === "Jaune" ? yellowBed : true;
          return (
            <span key={t.name}>
              <span style={{ color: t.color }} className="font-bold">
                {t.letter}
              </span>{" "}
              <span className="text-white">{t.name}</span>{" "}
              {bed ? <span className="text-[#55FF55]">✔</span> : <span className="text-[#FF5555]">✘</span>}
              {t.name === "Rouge" && <span className="text-[#AAAAAA]"> (vous)</span>}
            </span>
          );
        })}
        <span className="mt-1 text-center text-[.68rem] text-[#FFFF55]">fondamentalplugin.fr</span>
      </div>
    </div>
  );
}
