import type { Metadata } from "next";
import { getProducts, getFiles } from "@/lib/api/products";
import { ChangelogList, type ChangelogEntry } from "@/features/changelog/ChangelogList";
import { EmptyState } from "@/components/ui/EmptyState";
import { RapideIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Changelog — Fondamental Plugins",
  description: "Toutes les versions publiées, plugin par plugin.",
};

// Voir app/plugins/page.tsx : évite que next build tente de prérender cette
// page en statique (l'API n'est pas joignable à ce moment-là en CI/Docker).
export const dynamic = "force-dynamic";

/** Changelog global (`/changelog`, `#changelog` de la maquette) : une entrée par version publiée, tous plugins confondus. */
export default async function ChangelogPage() {
  const products = await getProducts();
  const filesByProduct = await Promise.all(products.map((product) => getFiles(product.slug)));

  const entries: ChangelogEntry[] = products.flatMap((product, i) => {
    // Un même numéro de version peut avoir deux fichiers (Gratuit + Premium,
    // distribution FREE_PREMIUM_JARS) : une seule entrée de changelog par version.
    const seen = new Set<string>();
    return filesByProduct[i]
      .filter((file) => {
        if (seen.has(file.release.version)) return false;
        seen.add(file.release.version);
        return true;
      })
      .map((file) => ({ product: { slug: product.slug, name: product.name }, file }));
  });

  entries.sort((a, b) => Date.parse(b.file.release.releasedAt) - Date.parse(a.file.release.releasedAt));

  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[760px] gap-8">
        <div className="grid gap-2.5 justify-items-start">
          <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Mises à jour</p>
          <h1 className="font-display text-[clamp(1.8rem,4.2vw,2.2rem)] font-semibold tracking-[-.04em]">
            Changelog
          </h1>
          <p className="text-[1.05rem] text-muted">Toutes les versions publiées, plugin par plugin.</p>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={<RapideIcon width={26} height={26} />}
            title="Aucune version publiée pour l'instant"
            description="Revenez après la première publication d'un plugin."
          />
        ) : (
          <ChangelogList entries={entries} products={products} />
        )}
      </div>
    </section>
  );
}
