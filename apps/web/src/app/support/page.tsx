import type { Metadata } from "next";
import { Faq } from "@/components/ui/Faq";
import { Button } from "@/components/ui/Button";
import { EnveloppeIcon, SupportIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Support — Fondamental Plugins",
  description: "Une question, un blocage ? La FAQ répond aux questions les plus fréquentes sur les licences.",
};

// Réservé aux clés créées avant la boutique et aux questions générales : pas
// un formulaire de mot de passe, jamais de collecte de mot de passe ici.
const SUPPORT_EMAIL = "support@fondamentalplugin.fr";

const FAQ_ENTRIES = [
  {
    question: "Où trouver ma clé de licence ?",
    answer: "Dans votre espace client, sous « Mes licences ». Elle vous est aussi envoyée par e-mail après l'achat.",
  },
  {
    question: "Mon plugin reste en version gratuite.",
    answer: "Vérifiez que la clé est bien collée dans config.yml, sans espace, puis redémarrez le serveur.",
  },
  {
    question: "Où télécharger le plugin ?",
    answer: "Sur la fiche du plugin, onglet « Téléchargements ». Le fichier Premium est réservé aux titulaires d'une licence.",
  },
  {
    question: "Combien d'installations par licence ?",
    answer: "Chaque licence a un nombre maximal d'installations, indiqué dans votre espace client. Une installation correspond à un serveur Minecraft.",
  },
  {
    question: "Puis-je changer de serveur ?",
    answer: "Oui. Libérez une installation depuis « Mes licences », puis activez la même clé sur le nouveau serveur.",
  },
  {
    question: "Puis-je être remboursé ?",
    answer: "Les plugins sont livrés immédiatement : vous renoncez à votre droit de rétractation au moment de l'achat. En cas de problème, écrivez-nous.",
  },
  {
    question: "Que se passe-t-il si votre serveur de licences est en panne ?",
    answer: "Le plugin garde la dernière réponse en mémoire environ 72 heures : votre serveur reste en Premium. Une clé révoquée repasse en Free tout de suite.",
  },
];

/**
 * Support (`/support`, `#support` de la maquette). Pas de formulaire « Écrire
 * à l'équipe » ni de bouton Discord actif : aucune route ni URL réelle à ce
 * jour (issue #81 côté back pour le formulaire).
 */
export default function SupportPage() {
  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[760px] gap-8">
        <div className="grid gap-2.5 justify-items-start">
          <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Support</p>
          <h1 className="font-display text-[clamp(1.8rem,4.2vw,2.2rem)] font-semibold tracking-[-.04em]">
            Une question, un blocage ?
          </h1>
          <p className="text-[1.05rem] text-muted">
            La FAQ répond aux questions les plus fréquentes. Sinon, écrivez-nous.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 rounded-card-lg border border-line bg-surface p-5">
            <EnveloppeIcon width={22} height={22} className="text-accent-text" />
            <b className="font-display">Nous écrire</b>
            <p className="text-[.9rem] text-muted">Pour une question sur une licence ou un plugin.</p>
            <Button asChild variant="secondary" fullWidth className="mt-1 justify-self-start">
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </Button>
          </div>
          <div className="grid gap-2 rounded-card-lg border border-line bg-surface p-5">
            <SupportIcon width={22} height={22} className="text-accent-text" />
            <b className="font-display">Discord</b>
            <p className="text-[.9rem] text-muted">Posez vos questions, suivez les nouveautés.</p>
            <Button disabled fullWidth className="mt-1 justify-self-start">
              Bientôt disponible
            </Button>
          </div>
        </div>

        <div className="grid gap-2.5">
          <h2 className="font-display text-[1.1rem] font-semibold">Questions fréquentes</h2>
          <Faq entries={FAQ_ENTRIES} />
        </div>
      </div>
    </section>
  );
}
