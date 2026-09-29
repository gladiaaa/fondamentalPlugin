import Link from "next/link";
import type { ProductResponse } from "@fondamental/shared";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Faq } from "@/components/ui/Faq";
import { ValiderIcon, TelechargerIcon, RapideIcon, SupportIcon, FiableIcon, GenerateurIcon, CleIcon } from "@/components/icons";
import { Logo } from "@/components/brand/Logo";
import { HeroChat } from "@/features/home/HeroChat";
import { PluginShowcase } from "@/features/home/PluginShowcase";
import { LatestReleases } from "@/features/home/LatestReleases";
import { TagPreview } from "@/features/configs/MiniMessagePreview";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import { getProducts } from "@/lib/api/products";

// Prix, prérequis et versions lus à chaque visite : jamais figés au build (l'API n'y est pas
// joignable, voir /plugins).
export const dynamic = "force-dynamic";

/** Ce avec quoi les plugins fonctionnent (vérifié dans leur code, voir le wiki). */
const COMPATIBLE = ["Paper 1.21.4+", "Java 21", "PlaceholderAPI", "LuckPerms", "Vault", "MySQL", "BungeeCord et Velocity"];

/** Les liaisons entre plugins (wiki, « La gamme ensemble »). */
const LINKS: Array<{ from: string; to: string; text: string }> = [
  { from: "crate", to: "tag", text: "Une crate peut faire gagner un tag, à vie ou pour 7 jours." },
  { from: "crate", to: "bedwars", text: "Une crate peut donner un cosmétique Bedwars ; déjà possédé, il devient des coins." },
  { from: "pass", to: "tag", text: "Un palier du pass peut offrir un tag, une quête aussi." },
  { from: "pass", to: "crate", text: "Un palier du pass peut donner des clés de crate." },
  { from: "bedwars", to: "pass", text: "Les parties font avancer les quêtes : victoires, kills, lits détruits." },
  { from: "crate", to: "pass", text: "Chaque ouverture de crate fait avancer les quêtes du pass." },
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
    text: "Ou laissez le configurateur la remplir pour vous. Rechargez le plugin : il passe en Premium.",
  },
];

const FEATURES = [
  { Icon: RapideIcon, title: "Mises à jour incluses", text: "Chaque version est détaillée dans ses notes de version, sans supplément." },
  { Icon: SupportIcon, title: "Documentation complète", text: "Un wiki par plugin : installation, commandes, fichiers et guides pas à pas." },
  {
    Icon: FiableIcon,
    title: "Tient en cas de panne",
    text: "La licence est gardée en mémoire 72 heures : votre serveur reste en Premium si le nôtre tombe.",
  },
  { Icon: CleIcon, title: "Licence à vie", text: "Un seul paiement par plugin, pas d’abonnement. La clé suit votre serveur." },
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
      "Vous collez votre clé dans config.yml (ou le configurateur la remplit pour vous). Au démarrage, le plugin la vérifie auprès de notre serveur de licences, puis passe en Premium.",
  },
  {
    question: "Sur combien de serveurs puis-je l'utiliser ?",
    answer:
      "Chaque licence a un nombre maximal d'installations, visible dans votre espace client. Une installation correspond à un serveur Minecraft ; vous pouvez en libérer une depuis votre compte.",
  },
  {
    question: "Quelles versions de Minecraft sont prises en charge ?",
    answer: "Paper 1.21.4 ou plus, avec Java 21. La fiche de chaque plugin donne les prérequis exacts.",
  },
  {
    question: "Les plugins fonctionnent-ils sur un réseau de serveurs ?",
    answer:
      "Oui, en Premium : Tag, Crate et Pass partagent leurs données en MySQL, et Pass garde la même progression d'un serveur à l'autre sans rien perdre.",
  },
];

const CONFIG_EXAMPLE = `# plugins/FondamentalBedwars/config.yml
license:
  key: "FBW-XXXX-XXXX-XXXX"`;

/** Le tag montré dans la mise en avant du configurateur (repris du tags.yml livré). */
const CONFIG_TAG = {
  text: "Fondateur",
  style: "smallcaps",
  effect: "shine",
  colors: ["#FFF3B0", "#FFC837", "#FF8008"],
  bold: true,
  format: "<color:#FFD54F>♛</color> {text}",
};

async function catalogue(): Promise<ProductResponse[] | null> {
  try {
    return await getProducts();
  } catch {
    return null;
  }
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="grid gap-2.5 justify-items-start">
      <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">{eyebrow}</p>
      <h2 className="font-display text-[clamp(1.5rem,3.6vw,2.2rem)] font-semibold tracking-[-.04em]">{title}</h2>
      {text && <p className="max-w-[60ch] text-[1.05rem] text-muted">{text}</p>}
    </div>
  );
}

export default async function Home() {
  const products = await catalogue();

  return (
    <>
      {/* ─── Accroche ─────────────────────────────────────────── */}
      <section className="px-4 py-[clamp(36px,7vw,84px)] sm:px-8">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="grid gap-5 justify-items-start">
            <Badge variant="accent">Plugins premium pour serveurs Minecraft</Badge>
            <h1 className="text-balance font-display text-[clamp(2.1rem,6vw,3.7rem)] font-semibold leading-[1.02] tracking-[-.05em]">
              Le socle de votre <span className="font-light text-accent-text">serveur.</span>
            </h1>
            <p className="max-w-[48ch] text-[1.05rem] text-muted">
              Bedwars, tags animés, crates, pass de saison : quatre plugins qui se parlent entre eux, simples à
              installer, documentés, et gratuits pour commencer.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button size="lg" asChild>
                <Link href="#plugins">Découvrir les plugins</Link>
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

      {/* ─── Compatibilités ───────────────────────────────────── */}
      <section aria-label="Compatibilités" className="border-y border-line bg-surface px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[.88rem] text-muted">
          <span className="font-mono text-[.7rem] uppercase tracking-[.1em]">Fonctionne avec</span>
          {COMPATIBLE.map((c) => (
            <span key={c} className="font-medium text-text">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* ─── Les plugins en action ────────────────────────────── */}
      <section id="plugins" className="scroll-mt-20 px-4 py-[clamp(40px,7vw,80px)] sm:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-8">
          <SectionTitle
            eyebrow="Les plugins"
            title="Quatre plugins, vus en action"
            text="Chacun existe en version gratuite, et en version Premium débloquée par une clé de licence à vie."
          />
          <PluginShowcase products={products} />
          <Link href="/plugins" className="justify-self-start font-medium text-accent-text hover:underline">
            Comparer les quatre plugins →
          </Link>
        </div>
      </section>

      {/* ─── Ensemble ─────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface px-4 py-[clamp(40px,7vw,80px)] sm:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-8">
          <SectionTitle
            eyebrow="La gamme"
            title="Ensemble, ils vont plus loin"
            text="Installés sur le même serveur, les plugins se reconnaissent tout seuls : aucune dépendance entre eux, rien à compiler."
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LINKS.map(({ from, to, text }) => {
              const From = PLUGIN_ICONS[from];
              const To = PLUGIN_ICONS[to];
              return (
                <li key={`${from}-${to}`} className="grid gap-2.5 rounded-card-lg border border-line bg-bg p-5">
                  <span className="flex items-center gap-2" aria-label={`${from} vers ${to}`}>
                    {From && <From width={30} height={30} />}
                    <span aria-hidden className="text-accent-text">
                      →
                    </span>
                    {To && <To width={30} height={30} />}
                  </span>
                  <p className="text-muted">{text}</p>
                </li>
              );
            })}
          </ul>
          <Link href="/wiki/gamme" className="justify-self-start font-medium text-accent-text hover:underline">
            Toutes les liaisons et les commandes pour votre boutique →
          </Link>
        </div>
      </section>

      {/* ─── Configurateur ────────────────────────────────────── */}
      <section className="px-4 py-[clamp(40px,7vw,80px)] sm:px-8">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-2">
          <div className="grid gap-5 justify-items-start">
            <SectionTitle
              eyebrow="Configurateur"
              title="Réglez vos plugins sans ouvrir un fichier"
              text="Choisissez un tag, une crate, une quête : un formulaire clair, l’aperçu en couleurs, et le fichier prêt à déposer, votre clé de licence déjà remplie."
            />
            <ul className="grid gap-2">
              {[
                "Aperçu animé des tags et des textes colorés",
                "Palettes de couleurs toutes faites",
                "Le fichier du plugin gardé tel quel, commentaires compris",
              ].map((f) => (
                <li key={f} className="flex gap-2.5">
                  <ValiderIcon className="mt-0.5 shrink-0 text-success" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild>
              <Link href="/configurateur">
                <GenerateurIcon /> Ouvrir le configurateur
              </Link>
            </Button>
          </div>
          <div aria-hidden="true">
            <TagPreview tag={CONFIG_TAG} player="Gladiaa" />
          </div>
        </div>
      </section>

      {/* ─── Comment ça marche ────────────────────────────────── */}
      <section className="border-y border-line bg-surface px-4 py-[clamp(40px,7vw,80px)] sm:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-8">
          <SectionTitle eyebrow="Comment ça marche" title="Trois étapes, aucune configuration cachée" />
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="grid content-start gap-2.5 rounded-card-lg border border-line bg-bg p-[22px]">
                <span className="font-mono text-[.8rem] tracking-[.1em] text-accent-text">{step.n}</span>
                <h3 className="font-display text-[1.08rem] font-semibold tracking-[-.02em]">{step.title}</h3>
                <p className="text-muted">{step.text}</p>
                {step.n === "03" && <CodeBlock code={CONFIG_EXAMPLE} copyLabel="Extrait" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── Dernières mises à jour ───────────────────────────── */}
      {products && products.length > 0 && (
        <section className="px-4 py-[clamp(40px,7vw,80px)] sm:px-8">
          <div className="mx-auto grid max-w-[1180px] gap-8">
            <SectionTitle
              eyebrow="Mises à jour"
              title="Des plugins qui avancent"
              text="Les dernières versions publiées, incluses dans votre licence."
            />
            <LatestReleases products={products} />
            <Link href="/changelog" className="justify-self-start font-medium text-accent-text hover:underline">
              Tout l’historique des versions →
            </Link>
          </div>
        </section>
      )}

      {/* ─── Points forts ─────────────────────────────────────── */}
      <section className="border-y border-line bg-surface px-4 py-[clamp(40px,7vw,80px)] sm:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-8">
          <SectionTitle eyebrow="Points forts" title="Pensé pour tourner sans surveillance" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ Icon, title, text }) => (
              <div key={title} className="grid content-start gap-2">
                <Icon width={26} height={26} className="text-accent-text" />
                <h3 className="font-display text-[1.08rem] font-semibold tracking-[-.02em]">{title}</h3>
                <p className="text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Questions ────────────────────────────────────────── */}
      <section className="px-4 py-[clamp(40px,7vw,80px)] sm:px-8">
        <div className="mx-auto grid max-w-[800px] gap-8">
          <SectionTitle eyebrow="Questions fréquentes" title="Avant de vous lancer" />
          <Faq entries={FAQ_ENTRIES} />
        </div>
      </section>

      {/* ─── Appel final ──────────────────────────────────────── */}
      <section className="px-4 pb-[clamp(40px,7vw,80px)] sm:px-8">
        <div className="mx-auto max-w-[1180px]">
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
