import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { StateIcon } from "@/features/auth/StateIcon";
import { ErreurIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Paiement annulé — Fondamental Plugins" };

/** `/paiement-annule` : retour de Stripe Checkout après annulation (#23, pas de dépendance API). */
export default function PaiementAnnulePage() {
  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[440px] gap-4 rounded-card-lg border border-line bg-surface p-8 text-center">
        <StateIcon variant="neutral">
          <ErreurIcon width={28} height={28} />
        </StateIcon>
        <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Paiement annulé</h1>
        <p className="text-muted">Aucun montant n&apos;a été débité. Vous pouvez reprendre votre achat quand vous le souhaitez.</p>
        <Button asChild fullWidth>
          <Link href="/plugins">Retourner aux plugins</Link>
        </Button>
        <Button asChild variant="secondary" fullWidth>
          <Link href="/support">Une question ? Contactez-nous</Link>
        </Button>
      </div>
    </section>
  );
}
