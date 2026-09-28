"use client";

import { useState } from "react";
import type { AdminStatsResponse } from "@fondamental/shared";
import { formatPriceCents } from "@/lib/format";

type Point = AdminStatsResponse["salesLast30Days"][number];

const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/**
 * Ventes par jour sur 30 jours : une seule série, donc pas de légende (le titre la nomme). Barres fines
 * ancrées sur la ligne de base, coins arrondis en haut, infobulle au survol et au clavier, et tableau
 * équivalent pour les lecteurs d'écran.
 */
export function SalesChart({ points }: { points: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.revenueCents));
  const current = active === null ? null : points[active];

  return (
    <figure className="grid gap-3 rounded-card-lg border border-line bg-surface p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-[1rem] font-semibold">Chiffre d&apos;affaires par jour (30 jours)</span>
        <span className="text-[.85rem] text-muted" aria-live="polite">
          {current
            ? `${dayLabel(current.date)} : ${formatPriceCents(current.revenueCents)} · ${current.sales} vente${current.sales > 1 ? "s" : ""}`
            : "Survolez une barre pour le détail"}
        </span>
      </figcaption>

      <div className="relative h-40 border-b border-line" aria-hidden="true">
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {points.map((point, index) => (
            <div
              key={point.date}
              className="flex h-full flex-1 cursor-default items-end"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            >
              <div
                className="w-full rounded-t-[4px] bg-accent transition-opacity"
                style={{
                  height: point.revenueCents > 0 ? `${Math.max(2, (point.revenueCents / max) * 100)}%` : "0",
                  opacity: active === null || active === index ? 1 : 0.45,
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[.75rem] text-muted" aria-hidden="true">
        <span>{points[0] && dayLabel(points[0].date)}</span>
        <span>{points.at(-1) && dayLabel(points.at(-1)!.date)}</span>
      </div>

      <table className="sr-only">
        <caption>Chiffre d&apos;affaires et ventes par jour, 30 derniers jours</caption>
        <thead>
          <tr>
            <th scope="col">Jour</th>
            <th scope="col">Chiffre d&apos;affaires</th>
            <th scope="col">Ventes</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <td>{dayLabel(point.date)}</td>
              <td>{formatPriceCents(point.revenueCents)}</td>
              <td>{point.sales}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
