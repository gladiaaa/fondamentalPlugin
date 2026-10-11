"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useSession } from "@/lib/session/SessionContext";
import { ShopEditor } from "./ShopEditor";

/** `/configurateur/boutique` : l'éditeur visuel des menus de FondamentalShop, pour un compte connecté. */
export function ShopEditorPage() {
  const { status } = useSession();

  return (
    <section className="px-4 py-[clamp(24px,4vw,48px)] sm:px-8">
      <div className="mx-auto grid max-w-[1560px] grid-cols-[minmax(0,1fr)] gap-6">
        <header className="grid gap-2">
          <nav aria-label="Fil d’Ariane" className="text-[.85rem] text-muted">
            <Link href="/configurateur" className="hover:text-text">
              Configurateur
            </Link>{" "}
            / <span className="text-text">Menus de FondamentalShop</span>
          </nav>
          <h1 className="font-display text-[clamp(1.6rem,3vw,2.3rem)] font-semibold tracking-[-.03em]">Vos menus de boutique, comme en jeu</h1>
          <p className="max-w-[72ch] text-[.98rem] text-muted">
            Glissez les objets dans le coffre, placez vos articles et vos catégories, puis téléchargez les fichiers à déposer dans{" "}
            <span className="font-mono">plugins/FondamentalShop/</span>.
          </p>
        </header>

        {status === "loading" && (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        )}
        {status === "anonymous" && (
          <div className="flex flex-wrap items-center gap-3 rounded-card-lg border border-line bg-surface p-6">
            <p className="text-muted">Connectez-vous avec le compte qui détient votre licence FondamentalShop.</p>
            <Button asChild>
              <Link href={`/connexion?retour=${encodeURIComponent("/configurateur/boutique")}`}>Se connecter</Link>
            </Button>
          </div>
        )}
        {status === "authenticated" && <ShopEditor />}
      </div>
    </section>
  );
}
