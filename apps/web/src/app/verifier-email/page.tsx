"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { StateIcon } from "@/features/auth/StateIcon";
import { EnveloppeIcon, ValiderIcon, ErreurIcon } from "@/components/icons";
import { verifyEmail, resendVerification } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";

const RESEND_COOLDOWN_S = 45;

export default function VerifierEmailPage() {
  return (
    <Suspense
      fallback={
        <section className="grid place-items-center px-4 py-[clamp(48px,10vw,96px)]">
          <Spinner />
        </section>
      }
    >
      <VerifierEmailContent />
    </Suspense>
  );
}

function VerifierEmailContent() {
  const searchParams = useSearchParams();
  // Lu une seule fois : le jeton est retiré de l'URL juste après (voir plus bas).
  const [token] = useState(() => searchParams.get("token"));
  const email = searchParams.get("email");

  const [state, setState] = useState<"checking" | "waiting" | "ok" | "error">(token ? "checking" : "waiting");
  const [cooldown, setCooldown] = useState(0);
  const verifiedOnce = useRef(false);

  useEffect(() => {
    if (!token || verifiedOnce.current) return;
    verifiedOnce.current = true;
    // Retire le jeton de l'URL dès qu'il est lu : jamais dans l'historique
    // ni un lien copié (docs/api-front.md §4).
    window.history.replaceState(null, "", "/verifier-email");
    verifyEmail(token)
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [token]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleResend() {
    if (!email || cooldown > 0) return;
    try {
      await resendVerification(email);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (error) {
      // 429 (déjà envoyé récemment) : on relance quand même le décompte, le
      // message générique suffit, pas besoin d'exposer le détail.
      if (error instanceof ApiRequestError) setCooldown(RESEND_COOLDOWN_S);
    }
  }

  if (state === "checking") {
    return (
      <section className="grid place-items-center px-4 py-[clamp(48px,10vw,96px)]">
        <Spinner />
      </section>
    );
  }

  if (state === "ok") {
    return (
      <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
        <div className="mx-auto grid max-w-[440px] gap-4 rounded-card-lg border border-line bg-surface p-8 text-center">
          <StateIcon variant="success">
            <ValiderIcon width={28} height={28} />
          </StateIcon>
          <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Adresse confirmée</h1>
          <p className="text-muted">Votre compte est prêt. Vous pouvez acheter une licence ou télécharger un plugin.</p>
          <Button asChild size="lg" fullWidth>
            <Link href="/connexion">Se connecter</Link>
          </Button>
          <Button asChild variant="secondary" fullWidth>
            <Link href="/plugins">Voir les plugins</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
        <div className="mx-auto grid max-w-[440px] gap-4 rounded-card-lg border border-line bg-surface p-8 text-center">
          <StateIcon variant="error">
            <ErreurIcon width={28} height={28} />
          </StateIcon>
          <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Ce lien n&apos;est plus valable</h1>
          <p className="text-muted">Il a expiré ou a déjà été utilisé. Connectez-vous pour en redemander un.</p>
          <Button asChild size="lg" fullWidth>
            <Link href="/connexion">Retour à la connexion</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[440px] gap-4 rounded-card-lg border border-line bg-surface p-8 text-center">
        <StateIcon variant="neutral">
          <EnveloppeIcon width={28} height={28} />
        </StateIcon>
        <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Vérifiez votre boîte mail</h1>
        <p className="text-muted">
          Nous avons envoyé un lien de confirmation {email ? <>à <b className="text-text">{email}</b></> : "à votre adresse"}.
          Il est valable une heure.
        </p>
        {email && (
          <>
            <Button type="button" variant="secondary" fullWidth onClick={handleResend} disabled={cooldown > 0}>
              {cooldown > 0 ? `Renvoyer l'e-mail (${cooldown}s)` : "Renvoyer l'e-mail"}
            </Button>
            <p className="text-[.85rem] text-muted">Pensez à regarder dans vos courriers indésirables.</p>
          </>
        )}
        <Link href="/inscription" className="text-[.88rem] text-accent-text">
          Changer d&apos;adresse e-mail
        </Link>
      </div>
    </section>
  );
}
