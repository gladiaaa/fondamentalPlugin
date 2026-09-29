import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Faq } from "@/components/ui/Faq";
import { PluginCard } from "@/features/plugins/PluginCard";
import {
  ValiderIcon,
  TelechargerIcon,
  RapideIcon,
  SupportIcon,
  ServeurIcon,
  FiableIcon,
  ImageIcon,
  BedwarsContourIcon,
  TagContourIcon,
  CrateContourIcon,
  PassContourIcon,
} from "@/components/icons";
import { Logo } from "@/components/brand/Logo";
import { HeroChat } from "@/features/home/HeroChat";
import { getProducts } from "@/lib/api/products";

// Accroches courtes de la page d'accueil ; les prix viennent du catalogue de l'API (mêmes chiffres
// que /plugins et les fiches), jamais écrits ici.
const PLUGINS = [
  {
    slug: "bedwars",
    name: "FondamentalBedwars",
    description: "Bedwars complet : des équipes, un lit à défendre, un classé Elo et 82 cosmétiques.",
    Icon: BedwarsContourIcon,
  },
  {
    slug: "tag",
    name: "FondamentalTag",
    description: "Des tags de joueur animés dans le chat, au-dessus de la tête et dans la liste TAB.",
    Icon: TagContourIcon,
  },
  {
    slug: "crate",
    name: "FondamentalCrate",
    description: "Des crates animées, des clés physiques ou virtuelles et un éditeur entièrement en jeu.",
    Icon: CrateContourIcon,
  },
  {
    slug: "pass",
    name: "FondamentalPass",
    description: "Un pass de saison et des quêtes, avec la même progression sur tout votre réseau.",
    Icon: PassContourIcon,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Téléchargez le plugin",
    text: "La version gratuite est ouverte à tous. Sans clé de licence, le plugin démarre en version gratuite.",
  },
  {
    n: "02",
    title: "Achetez une licence",
    text: "Le paiement passe par Stripe. Votre clé apparaît tout de suite dans votre compte et par e-mail.",
  },
  {
    n: "03",
    title: "Collez la clé dans config.yml",
    text: "Redémarrez le serveur : le plugin passe en Premium.",
  },
];

const FEATURES = [
  { Icon: RapideIcon, title: "Mises à jour suivies", text: "Chaque version publiée est détaillée dans le changelog." },
  { Icon: SupportIcon, title: "Support sur Discord", text: "Une question, un bug : l'équipe et la communauté répondent." },
  {
    Icon: ServeurIcon,
    title: "Paper 1.21 et Java 21",
    text: "Les quatre plugins ciblent Paper 1.21. Chaque fiche précise la version minimale et les dépendances.",
  },
  {
    Icon: FiableIcon,
    title: "Tient en cas de panne",
    text: "La licence est gardée en mémoire environ 72 heures : votre serveur reste en Premium si le nôtre tombe.",
  },
];

const FAQ_ENTRIES = [
  {
    question: "Puis-je essayer avant d'acheter ?",
    answer:
      "Oui. Chaque plugin se télécharge gratuitement et démarre en version gratuite. Vous achetez une licence seulement si vous voulez les fonctions Premium.",
  },
  {
    question: "Comment la clé de licence fonctionne-t-elle ?",
    answer:
      "Vous collez votre clé dans config.yml. Au démarrage, le plugin la vérifie auprès de notre serveur de licences, puis passe en Premium.",
  },
  {
    question: "Sur combien de serveurs puis-je l'utiliser ?",
    answer:
      "Chaque licence a un nombre maximal d'installations, visible dans votre espace client. Une installation correspond à un serveur Minecraft.",
  },
  {
    question: "Quelles versions de Minecraft sont prises en charge ?",
    answer:
      "Paper 1.21 ou plus, avec Java 21. Bedwars et Pass demandent la 1.21.4. La fiche de chaque plugin donne les prérequis exacts.",
  },
];

const CONFIG_EXAMPLE = `# plugins/FondamentalBedwars/config.yml
license:
  key: "FBW-XXXX-XXXX-XXXX"`;

// Prix lus à chaque visite : jamais figés au build (l'API n'y est pas joignable, voir /plugins).
export const dynamic = "force-dynamic";

/** Prix Premium en centimes par plugin ; `undefined` si le catalogue ne répond pas (prix masqués). */
async function premiumPrices(): Promise<Record<string, number | null> | undefined> {
  try {
    const products = await getProducts();
    return Object.fromEntries(products.map((p) => [p.slug, p.price?.amountCents ?? null]));
  } catch {
    return undefined;
  }
}

export default async function Home() {
  const prices = await premiumPrices();
  return (
    <>
      <section className="px-4 py-[clamp(36px,7vw,84px)] sm:px-8">
        <div className="mx-auto grid max-w-[1120px] items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div className="grid gap-5 justify-items-start">
            <Badge variant="accent">Plugins pour serveurs Minecraft</Badge>
            <h1 className="text-balance font-display text-[clamp(2.1rem,6vw,3.7rem)] font-semibold leading-[1.02] tracking-[-.05em]">
              Le socle de votre <span className="font-light text-accent-text">serveur.</span>
            </h1>
            <p className="max-w-[46ch] text-[1.05rem] text-muted">
              Quatre plugins fiables, simples à installer et bien documentés, pour faire vivre
              votre communauté. Pour Paper 1.21 et Java 21.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button size="lg" asChild>
                <Link href="/plugins">Voir les plugins</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/plugins">
                  <TelechargerIcon /> Télécharger gratuitement
                </Link>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[.88rem] text-muted">
              {["Version gratuite de chaque plugin", "Licence à vie", "Mises à jour incluses"].map((f) => (
                <li key={f} className="flex items-center gap-1.5">
                  <ValiderIcon className="text-success" /> {f}
                </li>
              ))}
            </ul>
          </div>

          <HeroChat />
        </div>
      </section>

      <section className="border-y border-line bg-surface px-4 py-[clamp(36px,7vw,72px)] sm:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8">
          <div className="grid gap-2.5 justify-items-start">
            <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Les plugins</p>
            <h2 className="font-display text-[clamp(1.5rem,3.6vw,2.2rem)] font-semibold tracking-[-.04em]">
              Quatre plugins, un même socle
            </h2>
            <p className="max-w-[56ch] text-[1.05rem] text-muted">
              Chacun existe en version gratuite et en version Premium, débloquée par une clé de
              licence.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLUGINS.map((plugin) => (
              <PluginCard key={plugin.slug} {...plugin} priceCents={prices ? (prices[plugin.slug] ?? null) : undefined} freeAvailable />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-[clamp(36px,7vw,72px)] sm:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8">
          <div className="grid gap-2.5 justify-items-start">
            <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Comment ça marche</p>
            <h2 className="font-display text-[clamp(1.5rem,3.6vw,2.2rem)] font-semibold tracking-[-.04em]">
              Trois étapes, aucune configuration cachée
            </h2>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="grid gap-2.5 rounded-card-lg border border-line bg-surface p-[22px]">
                <span className="font-mono text-[.8rem] tracking-[.1em] text-accent-text">{step.n}</span>
                <h3 className="font-display text-[1.08rem] font-semibold tracking-[-.02em]">{step.title}</h3>
                <p className="text-muted">{step.text}</p>
                {step.n === "03" && <CodeBlock code={CONFIG_EXAMPLE} copyLabel="Extrait" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-line bg-surface px-4 py-[clamp(36px,7vw,72px)] sm:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8">
          <div className="grid gap-2.5 justify-items-start">
            <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Points forts</p>
            <h2 className="font-display text-[clamp(1.5rem,3.6vw,2.2rem)] font-semibold tracking-[-.04em]">
              Pensé pour tourner sans surveillance
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ Icon, title, text }) => (
              <div key={title} className="grid gap-2">
                <Icon width={26} height={26} className="text-accent-text" />
                <h3 className="font-display text-[1.08rem] font-semibold tracking-[-.02em]">{title}</h3>
                <p className="text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-[clamp(36px,7vw,72px)] sm:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-8">
          <div className="grid gap-2.5 justify-items-start">
            <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Sur de vrais serveurs</p>
            <h2 className="font-display text-[clamp(1.5rem,3.6vw,2.2rem)] font-semibold tracking-[-.04em]">
              Captures d&apos;écran et avis
            </h2>
            <p className="max-w-[56ch] text-[1.05rem] text-muted">
              Emplacements réservés : ajoutez ici des captures de parties et, plus tard, des avis
              de clients.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Bedwars · arène en cours", "Crate · ouverture d'une caisse", "Tag · menu des titres"].map((caption) => (
              <figure
                key={caption}
                className="grid min-h-[170px] place-items-center gap-2 rounded-field border-[1.5px] border-dashed border-line p-4 text-center text-muted"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(135deg, transparent 0 12px, color-mix(in srgb, var(--color-line) 55%, transparent) 12px 13px)",
                }}
              >
                <ImageIcon />
                <figcaption className="font-mono text-[.74rem] tracking-[.04em]">{caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface px-4 py-[clamp(36px,7vw,72px)] sm:px-8">
        <div className="mx-auto grid max-w-[800px] gap-8">
          <div className="grid gap-2.5 justify-items-start">
            <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Questions fréquentes</p>
            <h2 className="font-display text-[clamp(1.5rem,3.6vw,2.2rem)] font-semibold tracking-[-.04em]">
              Avant de vous lancer
            </h2>
          </div>
          <Faq entries={FAQ_ENTRIES} />
        </div>
      </section>

      <section className="px-4 py-[clamp(36px,7vw,72px)] sm:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid items-center gap-8 rounded-card-lg border border-line bg-surface p-[clamp(24px,5vw,48px)] sm:grid-cols-[auto_1fr]">
            <span className="grid place-items-center justify-self-center">
              <Logo withWordmark={false} size={87} />
            </span>
            <div className="grid gap-4">
              <h2 className="font-display text-[clamp(1.5rem,3.6vw,2.2rem)] font-semibold tracking-[-.04em]">
                Prêt à essayer ?
              </h2>
              <p className="max-w-[56ch] text-[1.05rem] text-muted">
                Téléchargez la version gratuite, passez en Premium quand vous le souhaitez.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button size="lg" asChild>
                  <Link href="/plugins">Voir les plugins</Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/wiki">Lire la documentation</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
