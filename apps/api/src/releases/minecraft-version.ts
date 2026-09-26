/**
 * `1.21.4`, `26.1`, `26.1.2` : de deux à trois nombres de un à deux chiffres, séparés par des points.
 * Couvre l'ancienne numérotation (1.x) et la nouvelle, par année (26.x depuis 2026) : aucune version à déclarer.
 */
export const MINECRAFT_VERSION = /^\d{1,2}\.\d{1,2}(\.\d{1,2})?$/;

/**
 * Rang d'une version de Minecraft pour trier de la plus ancienne à la plus récente :
 * `1.21.4` → 12104, `1.21.11` → 12111, `26.1` → 260100, `26.1.2` → 260102.
 * Le calcul ne dépend d'aucune liste : toute version future se range toute seule.
 */
export function minecraftSortOrder(version: string): number {
  if (!MINECRAFT_VERSION.test(version)) throw new Error(`Version de Minecraft invalide : ${version}`);
  const [major, minor, patch] = version.split('.').map(Number) as [number, number, number | undefined];
  return major * 10_000 + minor * 100 + (patch ?? 0);
}
