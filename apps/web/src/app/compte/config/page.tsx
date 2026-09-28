import { EmptyState } from "@/components/ui/EmptyState";
import { ParametresIcon } from "@/components/icons";

/**
 * Générateur de config.yml (#30) : squelette uniquement, décision d'Océane
 * (2026-09-28). Pas de mock : le contrat (`GET /configs/:slug/:version/:file/schema`)
 * est signalé comme pas assez stable pour ça (src/mocks/handlers.ts).
 */
export default function ConfigPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Espace client</p>
        <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Générateur de config.yml</h1>
      </div>
      <div className="rounded-card-lg border border-line bg-surface p-5">
        <EmptyState
          icon={<ParametresIcon width={26} height={26} />}
          title="Bientôt disponible"
          description="Un formulaire par plugin pour générer votre config.yml, avec votre clé de licence déjà remplie (#30)."
        />
      </div>
    </div>
  );
}
