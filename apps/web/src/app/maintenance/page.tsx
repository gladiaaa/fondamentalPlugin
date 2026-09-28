import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SystemPage } from "@/features/system/SystemPage";
import { ServeurIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Maintenance — Fondamental Plugins" };

/**
 * `/maintenance` : pas de bascule automatique (une redirection nginx/nombre
 * de lignes de déploiement dépasse le front, #92 ne pose que la page).
 */
export default function MaintenancePage() {
  return (
    <SystemPage
      code={<ServeurIcon width={32} height={32} />}
      title="Maintenance en cours"
      description="Le site revient dans quelques minutes. Vos serveurs Minecraft ne sont pas affectés : la licence est gardée en mémoire environ 72 heures."
    >
      <Button asChild variant="secondary">
        <Link href="/support">Suivre sur Discord</Link>
      </Button>
    </SystemPage>
  );
}
