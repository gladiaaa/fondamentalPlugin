"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useSession } from "@/lib/session/SessionContext";
import { Configurator } from "./Configurator";

const POINTS = [
  { title: "Votre clé déjà remplie", text: "Le fichier téléchargé contient votre clé de licence : rien à copier." },
  { title: "Aperçu en couleurs", text: "Tags animés, noms de crates, messages : vous voyez le rendu avant de le mettre en jeu." },
  { title: "Le fichier du plugin, commenté", text: "Seuls vos réglages changent : le reste du fichier et ses commentaires sont gardés." },
];

/** `/configurateur` : présentation pour un visiteur, configurateur pour un compte connecté (#30). */
export function ConfiguratorPage() {
  const { status } = useSession();

  return (
    <section className="px-4 py-[clamp(24px,4vw,48px)] sm:px-8">
      <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-6">
        <header className="grid gap-2">
          <p className="font-mono text-[.72rem] uppercase tracking-[.12em] text-accent-text">Configurateur</p>
          <h1 className="font-display text-[clamp(1.6rem,3vw,2.3rem)] font-semibold tracking-[-.03em]">
            Réglez vos plugins sans ouvrir un fichier
          </h1>
          <p className="max-w-[70ch] text-[.98rem] text-muted">
            Choisissez un plugin et un fichier, modifiez ce qui vous intéresse, puis téléchargez le fichier à déposer dans
            le dossier du plugin.
          </p>
        </header>

        {status === "loading" && (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        )}

        {status === "anonymous" && (
          <div className="grid gap-6 rounded-card-lg border border-line bg-surface p-6 sm:p-8">
            <ul className="grid gap-4 sm:grid-cols-3">
              {POINTS.map((p) => (
                <li key={p.title} className="grid gap-1">
                  <span className="font-display text-[1.05rem] font-semibold">{p.title}</span>
                  <span className="text-[.9rem] text-muted">{p.text}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2.5">
              <Button asChild>
                <Link href={`/connexion?retour=${encodeURIComponent("/configurateur")}`}>Se connecter</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/plugins">Voir les plugins</Link>
              </Button>
            </div>
            <p className="text-[.85rem] text-muted">Réservé aux détenteurs d’une licence du plugin.</p>
          </div>
        )}

        {status === "authenticated" && <Configurator />}
      </div>
    </section>
  );
}
