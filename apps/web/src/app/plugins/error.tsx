"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/**
 * Limite d'erreur du segment (convention Next.js) : capture l'échec de
 * `getProducts()` dans `page.tsx`. Doit être un composant client.
 */
export default function PluginsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[1120px] gap-4">
        <Alert variant="error" title="Le catalogue n'a pas pu être chargé">
          Réessayez dans un instant. Si le problème continue, revenez plus tard.
        </Alert>
        <Button onClick={reset} className="justify-self-start">
          Réessayer
        </Button>
      </div>
    </section>
  );
}
