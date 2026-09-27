"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session/SessionContext";
import { Spinner } from "@/components/ui/Spinner";
import { AccountNav } from "@/features/account/AccountNav";

/**
 * Garde d'accès de l'espace client : la session n'est connue qu'après le
 * `GET /auth/me` du `SessionProvider` (layout.tsx racine), jamais côté
 * serveur (docs/api-front.md §8) — impossible de rediriger un visiteur
 * avant l'hydratation, d'où l'état `loading` intermédiaire plutôt qu'un
 * flash de contenu protégé.
 */
export default function CompteLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/connexion");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <section className="grid place-items-center px-4 py-[clamp(48px,10vw,96px)]">
        <Spinner />
      </section>
    );
  }

  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[1000px] gap-6 md:grid-cols-[220px_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
