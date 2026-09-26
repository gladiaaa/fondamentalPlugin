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

// ─── Comptes ────────────────────────────────────────────────────

/** Le compte tel que l'API le montre au navigateur. */
export interface AuthUser {
  id: string;
  email: string;
  /** Date ISO 8601. */
  createdAt: string;
}

/**
 * Réponse de `POST /api/auth/login` et `GET /api/auth/me`.
 * `csrfToken` doit être renvoyé dans l'en-tête `X-CSRF-Token` de chaque requête
 * qui modifie des données (POST, PUT, PATCH, DELETE) tant qu'on est connecté.
 */
export interface SessionResponse {
  user: AuthUser;
  csrfToken: string;
}

/** Réponse des routes qui n'indiquent volontairement rien de plus (inscription, mot de passe oublié…). */
export interface MessageResponse {
  message: string;
}

/** Corps d'erreur de l'API. `code` est présent pour les erreurs que le site doit distinguer. */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  code?: "EMAIL_NOT_VERIFIED" | "PASSWORD_COMPROMISED" | "INVALID_LINK" | "CURRENT_PASSWORD_INVALID" | "NO_PASSWORD" | "SAME_PASSWORD";
}
