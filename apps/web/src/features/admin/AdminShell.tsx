"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session/SessionContext";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { AdminNav } from "./AdminNav";
import { TwoFactorGate } from "./TwoFactorGate";

/**
 * Garde du back-office (#106) : visiteur -> connexion (retour ici), client -> refus, admin -> 2FA puis
 * pages. Comme l'espace client, la session n'est connue qu'après le `GET /auth/me` du navigateur ; l'API
 * refuse de toute façon chaque route admin sans rôle ni 2FA : ce n'est qu'un confort d'affichage.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { status, user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/connexion?retour=%2Fadmin");
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return (
      <section className="grid place-items-center px-4 py-[clamp(48px,10vw,96px)]">
        <Spinner />
      </section>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <section className="px-4 py-[clamp(48px,10vw,96px)]">
        <EmptyState title="Accès réservé" description="Cette partie du site est réservée aux administrateurs." />
      </section>
    );
  }

  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <TwoFactorGate>
        <div className="mx-auto grid max-w-[1200px] gap-6 md:grid-cols-[220px_1fr]">
          <AdminNav />
          <div className="min-w-0">{children}</div>
        </div>
      </TwoFactorGate>
    </section>
  );
}
