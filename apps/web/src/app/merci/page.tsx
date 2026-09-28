"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { LicenseKey } from "@/features/account/LicenseKey";
import { getOrderBySession, type OrderStatus } from "@/lib/api/orders";
import { RapideIcon } from "@/components/icons";

// docs/api-front.md §7 : interroger toutes les 2 s tant que la licence n'est
// pas prête. Au-delà d'une minute sans réponse, on arrête d'insister : le
// paiement est enregistré, pas la peine de faire tourner l'onglet indéfiniment.
const POLL_INTERVAL_MS = 2000;
const GIVE_UP_AFTER_MS = 60_000;

export default function MerciPage() {
  return (
    <Suspense
      fallback={
        <section className="grid place-items-center px-4 py-[clamp(48px,10vw,96px)]">
          <Spinner />
        </section>
      }
    >
      <MerciContent />
    </Suspense>
  );
}

function MerciContent() {
  const searchParams = useSearchParams();
  const [sessionId] = useState(() => searchParams.get("session_id"));
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    startedAt.current = Date.now();
    let cancelled = false;

    async function poll() {
      try {
        const result = await getOrderBySession(sessionId!);
        if (cancelled) return;
        setOrder(result);
        if (result.status === "licensed" || result.status === "refunded") return;
        if (Date.now() - (startedAt.current ?? Date.now()) > GIVE_UP_AFTER_MS) {
          setTimedOut(true);
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setTimedOut(true);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
        <div className="mx-auto grid max-w-[440px] gap-4 rounded-card-lg border border-line bg-surface p-8 text-center">
          <Alert variant="error" title="Paiement introuvable">
            Aucune commande à afficher ici. Si vous venez de payer, vérifiez le lien reçu par e-mail.
          </Alert>
          <Button asChild fullWidth>
            <Link href="/plugins">Voir les plugins</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (timedOut && (!order || order.status !== "licensed")) {
    return (
      <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
        <div className="mx-auto grid max-w-[480px] gap-4 rounded-card-lg border border-line bg-surface p-8 text-center">
          <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Votre licence tarde à arriver</h1>
          <p className="text-muted">
            Votre paiement est bien enregistré, vous n&apos;avez rien à refaire. La création de la clé peut prendre
            quelques minutes.
          </p>
          <Alert variant="warning" title={`Référence : ${sessionId}`}>
            Gardez-la si vous contactez le support.
          </Alert>
          <div className="flex flex-wrap justify-center gap-2.5">
            <Button
              onClick={() => {
                setTimedOut(false);
                startedAt.current = Date.now();
              }}
            >
              <RapideIcon width={18} height={18} /> Actualiser
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/support">Contacter le support</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (order?.status === "licensed" && order.licenseKey) {
    const configExample = `# plugins/${order.product.name}/config.yml\nlicense:\n  key: "${order.licenseKey}"`;
    return (
      <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
        <div className="mx-auto grid max-w-[520px] gap-4 rounded-card-lg border border-line bg-surface p-8">
          <Alert variant="success">Paiement confirmé</Alert>
          <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">
            Votre licence {order.product.name} est prête
          </h1>
          <div className="grid gap-1.5">
            <small className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">Votre clé de licence</small>
            <LicenseKey value={order.licenseKey} />
          </div>
          <div className="grid gap-1.5">
            <p className="font-semibold">Collez-la dans config.yml</p>
            <CodeBlock code={configExample} />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild>
              <Link href={`/plugins/${order.product.slug}`}>Télécharger le plugin</Link>
            </Button>
            <Button variant="secondary" disabled>
              Générer mon config.yml (bientôt disponible)
            </Button>
          </div>
          <p className="text-[.85rem] text-muted">Un e-mail avec votre clé vous a aussi été envoyé.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[440px] gap-4 rounded-card-lg border border-line bg-surface p-8 text-center">
        <Spinner className="mx-auto" />
        <h1 className="font-display text-[1.3rem] font-semibold tracking-[-.03em]">
          Paiement reçu, génération de votre licence…
        </h1>
        <p className="text-muted">Cela prend quelques secondes. Ne fermez pas cette page.</p>
      </div>
    </section>
  );
}
