import type { ProductResponse, ReleaseFileResponse } from "@fondamental/shared";
import { apiFetch, ApiRequestError } from "./client";

/** Les 4 plugins, dans l'ordre d'affichage choisi par l'API (docs/api-front.md §4). */
export function getProducts(): Promise<ProductResponse[]> {
  return apiFetch<ProductResponse[]>("/products");
}

/** `null` si le plugin n'existe pas ou n'est plus en vente (404) : à traduire en `notFound()` côté page. */
export async function getProduct(slug: string): Promise<ProductResponse | null> {
  try {
    return await apiFetch<ProductResponse>(`/products/${slug}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.statusCode === 404) return null;
    throw error;
  }
}

/** Versions de Minecraft ayant au moins un fichier, de la plus récente à la plus ancienne : contenu du sélecteur. */
export function getMinecraftVersions(slug: string): Promise<string[]> {
  return apiFetch<string[]>(`/products/${slug}/minecraft-versions`);
}

/**
 * Tous les fichiers du plugin, du plus récent au plus ancien. Pas de filtre
 * par version ici : chaque fichier porte déjà ses `minecraftVersions`, le
 * filtrage se fait côté client (sélecteur de version) sans repasser par
 * l'API.
 */
export function getFiles(slug: string): Promise<ReleaseFileResponse[]> {
  return apiFetch<ReleaseFileResponse[]>(`/products/${slug}/files`);
}
