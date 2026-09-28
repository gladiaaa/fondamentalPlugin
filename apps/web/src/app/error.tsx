"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SystemPage } from "@/features/system/SystemPage";

/** 500 (convention Next.js : app/error.tsx, limite d'erreur racine — doit être un composant client). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
