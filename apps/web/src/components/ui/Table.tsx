import type { ReactNode, TableHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Tableau générique (`.tw`/`.tb` de la maquette) : défile horizontalement
 * dans son propre conteneur, jamais la page (brief §7). Composer avec des
 * `<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` normaux.
 */
export function Table({ className, children, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-card">
      <table
        className={cn(
          "w-full min-w-[520px] border-collapse text-[.92rem]",
          "[&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-line [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-mono [&_th]:text-[.68rem] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-[.08em] [&_th]:text-muted",
          "[&_td]:border-b [&_td]:border-line [&_td]:px-4 [&_td]:py-[13px] [&_td]:align-middle",
          "[&_tr:last-child_td]:border-b-0",
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export interface ComparisonRow {
  label: ReactNode;
  /** Une entrée par édition (Gratuit, Premium...), dans l'ordre des colonnes. */
  values: Array<boolean | string>;
}

/**
 * Tableau Gratuit/Premium (`.tb.cmp`). Une coche seule ne suffit pas pour un
 * lecteur d'écran (brief §11) : chaque cellule porte aussi un texte
 * (« Inclus », « Non inclus », ou la valeur donnée si ce n'est pas booléen).
 */
export function ComparisonTable({ columns, rows }: { columns: string[]; rows: ComparisonRow[] }) {
  return (
    <Table className="[&_td:not(:first-child)]:text-center [&_th:not(:first-child)]:text-center">
      <thead>
        <tr>
          <th scope="col" />
          {columns.map((col) => (
            <th key={col} scope="col">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {/* `!` force la priorité sur les règles [&_th] posées par Table, qui ciblent les
                en-têtes de colonne (majuscules, mono) : celui-ci est un en-tête de ligne. */}
            <th scope="row" className="!text-left !font-body !text-text !normal-case !tracking-normal !text-[.92rem] !font-normal">
              {row.label}
            </th>
            {row.values.map((value, j) => (
              <td key={j}>
                {typeof value === "boolean" ? (
                  <span className={value ? "text-success" : "text-muted"}>
                    {value ? "Inclus" : "Non inclus"}
                  </span>
                ) : (
                  value
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
