import type { LicenseDetailResponse } from "@fondamental/shared";
import { apiFetch } from "./client";

/**
 * Détail d'une licence et libération d'installation (#25, docs/api-front.md §4). L'URL porte
 * l'identifiant interne de la licence (`id` de `GET /me/licenses`), jamais la clé (#91).
 */
export function getLicenseDetail(id: string): Promise<LicenseDetailResponse> {
  return apiFetch<LicenseDetailResponse>(`/me/licenses/${encodeURIComponent(id)}`);
}

export function releaseActivation(id: string, installationId: string, csrfToken: string): Promise<void> {
  return apiFetch<void>(`/me/licenses/${encodeURIComponent(id)}/activations/${encodeURIComponent(installationId)}`, {
    method: "DELETE",
    csrfToken,
  });
}
