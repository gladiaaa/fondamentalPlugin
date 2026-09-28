"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PanierIcon } from "@/components/icons";
import { useSession } from "@/lib/session/SessionContext";
import { checkout } from "@/lib/api/orders";
import { ApiRequestError } from "@/lib/api/client";

/** Erreurs de `POST /checkout` que le client peut comprendre (docs/api-front.md §4 et §5). */
const CHECKOUT_ERRORS: Record<string, { title: string; message: string }> = {
  EMAIL_NOT_VERIFIED: {
    title: "Adresse e-mail à confirmer",
    message: "La clé de licence est envoyée par e-mail : confirmez d'abord votre adresse avec le lien reçu.",
  },
  PRODUCT_NOT_PURCHASABLE: {
    title: "Plugin indisponible",
    message: "Ce plugin n'est pas en vente pour le moment.",
  },
  PAYMENT_UNAVAILABLE: {
    title: "Paiement indisponible",
    message: "Le paiement est momentanément indisponible. Réessayez dans quelques minutes.",
  },
};

const UNKNOWN_ERROR = {
  title: "Achat impossible",
  message: "Une erreur inattendue s'est produite. Réessayez dans un instant.",
};

/**
 * « Acheter la licence » (#99) : connecté, crée la commande et part chez Stripe
 * Checkout ; visiteur, passe par la connexion puis revient sur la fiche.
 */
export function BuyButton({ productSlug }: { productSlug: string }) {
  const router = useRouter();
  const { status, csrfToken } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const loginHref = `/connexion?retour=${encodeURIComponent(`/plugins/${productSlug}`)}`;

  if (status === "anonymous") {
    return (
      <>
        <Button asChild fullWidth size="lg">
          <Link href={loginHref}>
            <PanierIcon width={18} height={18} /> Acheter la licence
          </Link>
        </Button>
        <p className="text-[.85rem] text-muted">Vous serez invité à vous connecter avant le paiement.</p>
      </>
    );
  }

  async function handleBuy() {
    if (!csrfToken) return;
    setError(null);
    setPending(true);
    try {
      const { url } = await checkout(productSlug, csrfToken);
      // Page Stripe : navigation complète, pas le routeur Next (autre domaine).
      window.location.assign(url);
    } catch (err) {
      setPending(false);
      if (err instanceof ApiRequestError && err.statusCode === 401) {
        // Session expirée entre le chargement et le clic : repasser par la connexion.
        router.push(loginHref);
        return;
      }
      setError((err instanceof ApiRequestError && err.code && CHECKOUT_ERRORS[err.code]) || UNKNOWN_ERROR);
    }
  }

  return (
    <>
      <Button fullWidth size="lg" loading={status === "loading" || pending} onClick={handleBuy}>
        <PanierIcon width={18} height={18} /> Acheter la licence
      </Button>
      {error && (
        <Alert variant="error" title={error.title}>
          {error.message}
        </Alert>
      )}
    </>
  );
}
