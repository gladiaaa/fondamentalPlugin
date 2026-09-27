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
  const response = await fetch(`/api${path}`, {
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
