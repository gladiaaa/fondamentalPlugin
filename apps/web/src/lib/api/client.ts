import type { ApiError } from "@fondamental/shared";

/**
 * Point d'entrée unique vers l'API (voir CLAUDE.md, section « Site »).
 * Aucun composant ne doit appeler `fetch` directement sur `/api/*` :
 * tout passe par ici, pour que le jour où une route « prévue » devient
 * réelle, seul ce fichier (ou son mock MSW) change.
 */

export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly code?: ApiError["code"];

  constructor(body: ApiError) {
    super(Array.isArray(body.message) ? body.message.join(" ") : body.message);
    this.statusCode = body.statusCode;
    this.code = body.code;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /**
   * Jeton anti-CSRF, obligatoire pour POST/PUT/PATCH/DELETE sur une route de
   * session (docs/api-front.md §3). Gardé en mémoire par l'appelant, jamais
   * lu depuis localStorage ou une URL.
   */
  csrfToken?: string;
}

/**
 * Un `fetch` avec un chemin relatif (`/api/...`) ne fonctionne que dans le
 * navigateur : côté serveur (Server Component), Node n'a pas de page
 * d'origine à compléter et lève une `TypeError`. `API_INTERNAL_URL` (jamais
 * `NEXT_PUBLIC_*` : ne doit pas finir dans le bundle client) donne l'adresse
 * de l'API à joindre directement depuis le serveur Next, sans passer par le
 * `rewrites()` de next.config.ts (qui ne relaie que les requêtes déjà reçues
 * par Next, pas les appels sortants de ses propres Server Components) ni par
 * nginx (qui n'intercepte que les requêtes venues du navigateur). Doit être
 * fixée dans l'environnement de déploiement ; vaut l'adresse locale de l'API
 * par défaut, pour que `npm run dev` fonctionne sans rien configurer.
 */
const SERVER_API_BASE = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api";

/**
 * `fetch` vers `/api/*`, avec les en-têtes et le format d'erreur imposés par
 * l'API (docs/api-front.md §3 et §5). À appeler :
 * - côté serveur (Server Component) uniquement pour les données publiques ;
 * - côté navigateur (composant client) pour tout ce qui dépend de la
 *   session, pour que le cookie et l'`Origin` partent tout seuls.
 */
export async function apiFetch<T>(
  path: string,
  { body, csrfToken, headers, ...init }: ApiFetchOptions = {},
): Promise<T> {
  const url = typeof window === "undefined" ? `${SERVER_API_BASE}${path}` : `/api${path}`;
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiRequestError(
      data ?? { statusCode: response.status, message: response.statusText },
    );
  }

  return data as T;
}
