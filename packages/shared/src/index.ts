// Types partagés entre le site et l'API : contrats des réponses JSON.
// Uniquement des types (import type) : l'API est compilée par tsc et ne peut pas
// exécuter le TypeScript de ce package.

/** Réponse de `GET /api/health`, vérifiée après chaque déploiement. */
export interface HealthResponse {
  ok: boolean;
  /** Version en ligne, de la forme `<branche>-<commit court>` (`local` en développement). */
  version: string;
}

/** Réponse de `GET /api/health` côté API : ajoute l'état de la base. */
export interface ApiHealthResponse extends HealthResponse {
  database: "up" | "down";
}
