import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFiles, getMinecraftVersions, getProduct } from "@/lib/api/products";
import { PluginFiche } from "@/features/plugins/PluginFiche";

// Voir app/plugins/page.tsx : sans ça, `next build` tente de prérendre cette
// route (et échoue, l'API n'étant pas joignable en CI/Docker au build).
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return { title: `${product.name} — Fondamental Plugins`, description: product.description };
}

/** Fiche d'un plugin (`/plugins/[slug]`). Données publiques : lu côté serveur. */
export default async function PluginFichePage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [versions, files] = await Promise.all([getMinecraftVersions(slug), getFiles(slug)]);

  return <PluginFiche product={product} versions={versions} files={files} />;
}
