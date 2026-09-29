"use client";

import { Button } from "@/components/ui/Button";
import { gradientAt } from "./minimessage";

/** Palettes toutes faites, pour qui ne sait pas quelles couleurs associer. */
const PALETTES: Array<{ name: string; colors: string[] }> = [
  { name: "Or", colors: ["#FFF3B0", "#FFC837", "#FF8008"] },
  { name: "Feu", colors: ["#FF5555", "#FFA040", "#FFE55C"] },
  { name: "Océan", colors: ["#40E0FF", "#5B7CFF"] },
  { name: "Glace", colors: ["#FFFFFF", "#40E0FF"] },
  { name: "Forêt", colors: ["#6BFF6B", "#D4FF4F"] },
  { name: "Bonbon", colors: ["#FF7BD0", "#B266FF"] },
  { name: "Aurore", colors: ["#5CFFB0", "#40E0FF", "#B266FF"] },
  { name: "Crépuscule", colors: ["#FFA040", "#FF4FE0", "#7C5CFF"] },
  { name: "Royal", colors: ["#FFC837", "#B266FF"] },
  { name: "Sang", colors: ["#8B0000", "#FF3B3B"] },
  { name: "Nuit", colors: ["#7C5CFF", "#2B2250"] },
  { name: "Fondamental", colors: ["#B7A0FF", "#6A5D94"] },
];

const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Bande de couleur d'une palette (aperçu du dégradé). */
function Strip({ colors, className }: { colors: string[]; className?: string }) {
  const stops = colors.length === 1 ? [colors[0], colors[0]] : colors;
  return (
    <span
      aria-hidden
      className={className}
      style={{ background: `linear-gradient(90deg, ${stops.map((c, i) => `${c} ${Math.round((i / (stops.length - 1)) * 100)}%`).join(", ")})` }}
    />
  );
}

/**
 * Liste de couleurs (#RRGGBB) sans avoir à connaître les codes : des pastilles à cliquer (sélecteur
 * de couleur du navigateur), l'ajout et le retrait d'une couleur, et des palettes toutes faites.
 */
export function ColorListEditor({
  label,
  value,
  max = 10,
  onChange,
}: {
  label: string;
  value: string[];
  max?: number;
  onChange: (colors: string[]) => void;
}) {
  const colors = value.filter((c) => HEX.test(c));

  function setAt(index: number, color: string) {
    onChange(colors.map((c, i) => (i === index ? color.toUpperCase() : c)));
  }

  function add() {
    // Nouvelle couleur : prolonge le dégradé plutôt que de repartir du blanc.
    const last = colors[colors.length - 1] ?? "#B7A0FF";
    onChange([...colors, colors.length > 0 ? gradientAt([last, "#FFFFFF"], 0.35).toUpperCase() : last]);
  }

  return (
    <div className="grid gap-3">
      {colors.length > 0 && <Strip colors={colors} className="block h-3 rounded-pill" />}

      <div className="flex flex-wrap items-center gap-2">
        {colors.map((color, i) => (
          <span key={i} className="group relative">
            <label className="block cursor-pointer" title={`Couleur ${i + 1} : ${color} (cliquer pour changer)`}>
              <span className="block size-10 rounded-full border-2 border-line shadow-sm transition-transform group-hover:scale-105" style={{ background: color }} />
              <input
                type="color"
                value={color.toLowerCase()}
                aria-label={`${label} : couleur ${i + 1}`}
                onChange={(e) => setAt(i, e.target.value)}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              aria-label={`Retirer la couleur ${i + 1}`}
              onClick={() => onChange(colors.filter((_, j) => j !== i))}
              className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border border-line bg-surface text-[.7rem] leading-none text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              ×
            </button>
          </span>
        ))}
        {colors.length < max && (
          <Button size="sm" variant="secondary" onClick={add}>
            + Ajouter une couleur
          </Button>
        )}
      </div>
      <p className="text-[.8rem] text-muted">
        Cliquez sur une pastille pour changer sa couleur. Une couleur = unie ; plusieurs = dégradé, dans l’ordre.
      </p>

      <div className="grid gap-1.5">
        <span className="text-[.8rem] font-medium">Ou partez d’une palette :</span>
        <div className="flex flex-wrap gap-1.5">
          {PALETTES.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onChange(p.colors.slice(0, max))}
              className="flex items-center gap-2 rounded-pill border border-line bg-surface-2 py-1 pr-3 pl-1 text-[.8rem] transition-colors hover:border-accent"
            >
              <Strip colors={p.colors} className="block h-5 w-10 rounded-pill" />
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
