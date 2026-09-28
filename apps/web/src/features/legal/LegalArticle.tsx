import { Alert } from "@/components/ui/Alert";
import type { LegalPageConfig } from "./pages";

/**
 * Squelette d'une page légale (#35, #92) : bandeau « brouillon », sections
 * numérotées avec un texte réservé, sans aucun contenu juridique inventé.
 * Reprend le motif de la maquette (`.prose`, `[À rédiger : ...]`).
 */
export function LegalArticle({ page, retractationNotice }: { page: LegalPageConfig; retractationNotice?: boolean }) {
  return (
    <article className="grid gap-4">
      <p className="font-mono text-[.7rem] uppercase tracking-[.08em] text-warning">Brouillon · à faire valider</p>
      <h1 className="font-display text-[1.6rem] font-semibold tracking-[-.03em]">{page.title}</h1>
      <p className="text-muted">Texte à rédiger.</p>

      {retractationNotice && (
        <Alert variant="warning" title="Clause de renonciation au droit de rétractation">
          Obligatoire pour les contenus numériques livrés immédiatement. Le texte exact est à faire valider.
        </Alert>
      )}

      <div className="grid gap-3">
        {page.sections.map((section, i) => (
          <div key={section}>
            <h2 className="font-display text-[1.05rem] font-semibold">
              {i + 1}. {section}
            </h2>
            <p className="italic text-muted">[À rédiger : {section.toLowerCase()}.]</p>
          </div>
        ))}
      </div>
    </article>
  );
}
