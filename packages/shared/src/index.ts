// Types partagés entre le site et l'API : contrats des réponses JSON.

/** Réponse de `GET /api/health`, vérifiée après chaque déploiement. */
export interface HealthResponse {
  ok: boolean;
  /** Version en ligne, de la forme `<branche>-<commit court>` (`local` en développement). */
  version: string;
}
