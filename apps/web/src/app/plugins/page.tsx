import type { Metadata } from "next";
import { getProducts } from "@/lib/api/products";
import { PluginCard } from "@/features/plugins/PluginCard";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanierIcon } from "@/components/icons";

// Sans ça, Next.js tente de prérendre la page en statique au build, ce qui
// suppose l'API jointe à ce moment-là — faux en CI et dans l'image Docker
// (`npm run build`, sans base ni API qui tourne : ECONNREFUSED). En rendu
// dynamique, l'appel se fait à la requête, une fois l'API vraiment là.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Les plugins — Fondamental Plugins",
  description: "Quatre plugins pour votre serveur. Chacun se télécharge gratuitement, la clé de licence débloque le Premium.",
};

/** Catalogue (`/plugins`, `#plugins.pub` de la maquette). Données publiques : lu côté serveur. */
export default async function PluginsPage() {
  const products = await getProducts();

  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[1120px] gap-8">
        <div className="grid gap-2.5 justify-items-start">
          <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Boutique</p>
          <h1 className="font-display text-[clamp(1.8rem,4.2vw,2.6rem)] font-semibold tracking-[-.04em]">
            Les plugins
          </h1>
          <p className="max-w-[56ch] text-[1.05rem] text-muted">
            Quatre plugins pour votre serveur. Chacun se télécharge gratuitement, la clé de licence
            débloque le Premium.
          </p>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={<PanierIcon width={28} height={28} />}
            title="Aucun plugin pour l'instant"
            description="La boutique se prépare : revenez bientôt."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <PluginCard
                key={product.slug}
                slug={product.slug}
                name={product.name}
                description={product.description}
                priceCents={product.price?.amountCents ?? null}
                // Chaque plugin démarre en version gratuite sans clé de licence
                // (docs/api-front.md §4, brief §9) : toujours vrai, quel que
                // soit le plugin.
                freeAvailable
                Icon={PLUGIN_ICONS[product.slug] ?? PanierIcon}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
