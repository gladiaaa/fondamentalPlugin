import { apiFetch } from "./client";

/**
 * Détail d'une licence et libération d'installation (#25 complet) : routes
 * « prévues » (docs/api-front.md §7), simulées par MSW (src/mocks/handlers.ts)
 * tant qu'elles ne sont pas livrées. Types locaux, pas de `@fondamental/shared` :
 * le contrat n'est qu'indicatif.
 *
 * Note : le contrat indicatif utilise la clé en clair comme paramètre d'URL
 * (`:key`), ce que le brief interdit explicitement (jamais la clé complète
 * dans une URL) — signalé côté back (issue #91). Ce fichier suit le contrat
 * tel qu'il existe aujourd'hui ; à corriger ici quand #91 sera tranchée.
 */

export interface LicenseActivation {
  id: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface LicenseDetail {
  key: string;
  product: { slug: string; name: string };
  status: "ACTIVE" | "REVOKED";
  purchasedAt: string;
  activationsUsed: number;
  activationsMax: number;
  activations: LicenseActivation[];
}

export function getLicenseDetail(key: string): Promise<LicenseDetail> {
  return apiFetch<LicenseDetail>(`/me/licenses/${encodeURIComponent(key)}`);
}

export function releaseActivation(key: string, installationId: string, csrfToken: string): Promise<void> {
  return apiFetch<void>(`/me/licenses/${encodeURIComponent(key)}/activations/${encodeURIComponent(installationId)}`, {
    method: "DELETE",
    csrfToken,
  });
}
