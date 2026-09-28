import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SystemPage } from "@/features/system/SystemPage";

/** 404 (convention Next.js : app/not-found.tsx, appelée par `notFound()` ou une route inconnue). */
export default function NotFound() {
  return (
    <SystemPage code="404" title="Cette page est introuvable" description="Le lien est peut-être incorrect, ou la page a été déplacée.">
      <Button asChild>
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
      <Button asChild variant="secondary">
        <Link href="/plugins">Voir les plugins</Link>
      </Button>
    </SystemPage>
  );
}
