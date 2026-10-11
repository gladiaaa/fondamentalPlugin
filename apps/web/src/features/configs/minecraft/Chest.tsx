"use client";

import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { Pixelify_Sans } from "next/font/google";
import { cn } from "@/lib/cn";
import { parseMiniMessage, plainText, type Segment } from "../minimessage";
import { Segments } from "../MiniMessagePreview";
import type { MenuLayout, Slot } from "../shop/layout";
import { ATLAS_URL, vanillaId, type McItems } from "./items";

const pixel = Pixelify_Sans({ subsets: ["latin"], weight: ["400", "500"] });

/** Type MIME interne du glisser-déposer : un objet de la palette ou une entrée du coffre. */
export const DRAG_TYPE = "application/x-fondamental-mc";
export type DragData = { material?: string; key?: string };

export function dragData(e: DragEvent): DragData | null {
  try {
    return JSON.parse(e.dataTransfer.getData(DRAG_TYPE)) as DragData;
  } catch {
    return null;
  }
}

/** Icône d'un objet ; un objet inconnu (ItemsAdder, Oraxen, faute de frappe…) devient « ? ». */
export function McItem({ material, items, size = 32, className }: { material: string; items: McItems | null; size?: number; className?: string }) {
  const id = vanillaId(material);
  const index = id ? items?.byId.get(id) : undefined;
  if (!items) return <span className={cn("inline-block", className)} style={{ width: size, height: size }} />;
  if (index === undefined) {
    return (
      <span
        className={cn("grid place-items-center rounded-[2px] bg-[#5a3d8a] font-bold text-white", className)}
        style={{ width: size, height: size, fontSize: size * 0.55 }}
        title={material}
      >
        ?
      </span>
    );
  }
  const scale = size / items.size;
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `url(${ATLAS_URL})`,
    backgroundSize: `${items.columns * items.size * scale}px auto`,
    backgroundPosition: `${-(index % items.columns) * size}px ${-Math.floor(index / items.columns) * size}px`,
    imageRendering: "pixelated",
  };
  return <span className={cn("inline-block", className)} style={style} />;
}

/** Titre d'inventaire : gris foncé par défaut, comme en jeu. */
function titleSegments(title: string): Segment[] {
  return parseMiniMessage(title).map((s) => (s.color === "#FFFFFF" ? { ...s, color: "#404040" } : s));
}

/**
 * Infobulle façon Minecraft (fond sombre, liseré violet), au premier plan de la page : rendue hors du
 * coffre (portail), elle passe par-dessus les panneaux voisins au lieu d'être coupée par eux.
 */
function Tooltip({ slot, anchor }: { slot: Slot; anchor: HTMLElement }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const a = anchor.getBoundingClientRect();
    const t = ref.current!.getBoundingClientRect();
    // À droite de la case, sinon à gauche ; toujours dans la fenêtre.
    const left = a.right + 8 + t.width <= window.innerWidth - 8 ? a.right + 8 : Math.max(8, a.left - 8 - t.width);
    setPos({ left, top: Math.max(8, Math.min(a.top, window.innerHeight - t.height - 8)) });
  }, [anchor]);
  return createPortal(
    <span
      ref={ref}
      role="tooltip"
      className={cn(
        pixel.className,
        "pointer-events-none fixed z-[1000] grid w-max max-w-[300px] justify-items-start gap-0.5 rounded-[3px] px-2 py-1.5 text-left text-[15px] leading-tight",
      )}
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? 0,
        background: "rgba(16, 0, 16, .96)",
        boxShadow: "inset 0 0 0 2px #2d0a6e, 0 0 0 1px #100010",
      }}
    >
      <span>
        <Segments segments={parseMiniMessage(slot.name ?? slot.material)} />
      </span>
      {slot.lore?.map((line, i) => (
        <span key={i}>
          <Segments segments={parseMiniMessage(line)} />
        </span>
      ))}
      {slot.problem && <span className="text-[#FF5555]">Ignoré par le plugin : {slot.problem}</span>}
    </span>,
    document.body,
  );
}

/**
 * Coffre Minecraft : les cases d'un menu (`MenuLayout`), avec infobulles. Les entrées (articles,
 * catégories) se choisissent au clic et se déplacent au glisser-déposer ; on y dépose aussi les objets
 * de la palette. Les boutons du plugin (retour, pages, solde…) ne reçoivent rien.
 */
export function Chest({
  layout,
  items,
  selected,
  onSelect,
  onDrop,
  onBack,
  footer,
}: {
  layout: MenuLayout;
  items: McItems | null;
  selected?: string;
  onSelect?: (key: string) => void;
  onDrop?: (slot: number, data: DragData) => void;
  /** Clic sur la flèche « Retour » du plugin : remonter au menu de la commande. */
  onBack?: () => void;
  footer?: React.ReactNode;
}) {
  const [hover, setHover] = useState<{ i: number; el: HTMLElement } | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const title = useMemo(() => titleSegments(layout.title), [layout.title]);

  return (
    <div
      className={cn(pixel.className, "grid w-max gap-1.5 rounded-[4px] p-[7px] text-[#404040]")}
      style={{
        background: "#C6C6C6",
        boxShadow: "inset 2px 2px 0 #FFFFFF, inset -2px -2px 0 #555555, 0 0 0 2px #000",
      }}
    >
      <p className="truncate px-0.5 text-[15px] leading-none" aria-label={`Titre du menu : ${plainText(layout.title)}`}>
        <Segments segments={title} />
      </p>
      <ul className="grid grid-cols-[repeat(9,36px)]" aria-label={`Menu de ${layout.rows} lignes`}>
        {layout.slots.map((slot, i) => {
          const entry = slot.kind === "entry" && slot.key !== undefined;
          const droppable = !!onDrop && slot.kind !== "control";
          const cell = (
            <>
              <McItem material={slot.material} items={items} className={cn(slot.kind === "fill" && "opacity-90")} />
              {hover?.i === i && (slot.kind === "entry" || slot.kind === "control") && <Tooltip slot={slot} anchor={hover.el} />}
            </>
          );
          return (
            <li
              key={i}
              className={cn(
                "relative grid h-9 w-9 place-items-center",
                target === i && "outline outline-2 -outline-offset-2 outline-white",
                entry && selected === slot.key && "outline outline-2 -outline-offset-2 outline-[#B7A0FF]",
              )}
              style={{
                background: "#8B8B8B",
                boxShadow: "inset 1px 1px 0 #373737, inset -1px -1px 0 #FFFFFF",
              }}
              onMouseEnter={(e) => setHover({ i, el: e.currentTarget })}
              onMouseLeave={() => setHover(null)}
              onDragOver={(e) => {
                if (!droppable || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
                e.preventDefault();
                setTarget(i);
              }}
              onDragLeave={() => setTarget((t) => (t === i ? null : t))}
              onDrop={(e) => {
                setTarget(null);
                const data = dragData(e);
                if (droppable && data) {
                  e.preventDefault();
                  onDrop(i, data);
                }
              }}
            >
              {entry ? (
                <button
                  type="button"
                  draggable={!!onDrop}
                  aria-pressed={selected === slot.key}
                  aria-label={`${plainText(slot.name ?? slot.key!)}, case ${i}${slot.fixed ? "" : " (placement automatique)"}${slot.problem ? `, ignoré : ${slot.problem}` : ""}`}
                  onClick={() => onSelect?.(slot.key!)}
                  onFocus={(e) => setHover({ i, el: e.currentTarget })}
                  onBlur={() => setHover(null)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ key: slot.key } satisfies DragData));
                    e.dataTransfer.effectAllowed = "move";
                    setHover(null);
                  }}
                  className={cn(
                    "relative grid h-full w-full cursor-grab place-items-center hover:bg-white/25 focus-visible:bg-white/25",
                    slot.problem && "bg-[#FF5555]/45",
                  )}
                >
                  {cell}
                  {!slot.fixed && (
                    <span aria-hidden className="absolute bottom-0 right-0.5 text-[10px] leading-none text-white [text-shadow:1px_1px_0_#3f3f3f]">
                      A
                    </span>
                  )}
                </button>
              ) : slot.back && onBack ? (
                <button
                  type="button"
                  aria-label="Retour au menu de la commande"
                  onClick={onBack}
                  onFocus={(e) => setHover({ i, el: e.currentTarget })}
                  onBlur={() => setHover(null)}
                  className="relative grid h-full w-full place-items-center hover:bg-white/25 focus-visible:bg-white/25"
                >
                  {cell}
                </button>
              ) : (
                <span aria-hidden className="relative grid h-full w-full place-items-center">
                  {cell}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {footer}
    </div>
  );
}
