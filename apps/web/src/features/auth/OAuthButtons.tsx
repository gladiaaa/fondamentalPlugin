"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

const PROVIDERS = ["Microsoft", "Discord", "Google"];

/**
 * Connexion par service tiers (`.oa-g` de la maquette) : en façade, la vraie
 * connexion OAuth arrive avec #18. Pas de logo de marque : ils ne sont pas
 * dans nos assets (`docs/front/charte`), et un logo approximatif serait pire
 * qu'un bouton texte.
 */
export function OAuthButtons() {
  return (
    <div className="grid gap-2">
      {PROVIDERS.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="secondary"
          fullWidth
          onClick={() => toast.info(`Connexion avec ${provider} : bientôt disponible.`)}
        >
          Continuer avec {provider}
        </Button>
      ))}
    </div>
  );
}
