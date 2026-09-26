/** `1.21.4`, `1.22` : de un à trois nombres de un à deux chiffres, séparés par des points. */
export const MINECRAFT_VERSION = /^\d{1,2}\.\d{1,2}(\.\d{1,2})?$/;

/**
 * Rang d'une version de Minecraft pour trier de la plus ancienne à la plus récente :
 * `1.21.4` → 12104, `1.21.11` → 12111, `1.22` → 12200.
 */
export function minecraftSortOrder(version: string): number {
  if (!MINECRAFT_VERSION.test(version)) throw new Error(`Version de Minecraft invalide : ${version}`);
  const [major, minor, patch] = version.split('.').map(Number) as [number, number, number | undefined];
  return major * 10_000 + minor * 100 + (patch ?? 0);
}
