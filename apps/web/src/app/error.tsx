"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SystemPage } from "@/features/system/SystemPage";
import { signalerErreur } from "@/lib/supervision";

/** 500 (convention Next.js : app/error.tsx, limite d'erreur racine — doit être un composant client). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => signalerErreur(error), [error]);

  return (
    <SystemPage
      code="500"
      title="Une erreur est survenue de notre côté"
      description="Réessayez dans un instant. Si le problème persiste, prévenez-nous sur Discord."
    >
      <Button onClick={reset}>Réessayer</Button>
      <Button asChild variant="secondary">
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </SystemPage>
  );
}
