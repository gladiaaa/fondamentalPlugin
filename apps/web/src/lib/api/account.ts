import type { OwnedLicenseResponse } from "@fondamental/shared";
import { apiFetch } from "./client";

/**
 * Tout ce qui dépend de la session (`/me/*`, `/auth/change-password`,
 * `/auth/logout-all`) : à appeler uniquement depuis le navigateur, jamais
 * depuis un Server Component (docs/api-front.md §8).
 */

export function changePassword(currentPassword: string, newPassword: string, csrfToken: string): Promise<void> {
  return apiFetch<void>("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
    csrfToken,
  });
}

/** Ferme toutes les sessions du compte, y compris celle qui appelle. */
export function logoutAll(csrfToken: string): Promise<void> {
  return apiFetch<void>("/auth/logout-all", { method: "POST", csrfToken });
}

export function getLicenses(): Promise<OwnedLicenseResponse[]> {
  return apiFetch<OwnedLicenseResponse[]>("/me/licenses");
}

/**
 * Réponse volontairement identique pour une clé inconnue, révoquée ou déjà
 * rattachée (`400 LICENSE_CLAIM_INVALID`, docs/api-front.md §4) : ne pas
 * essayer de deviner laquelle dans le message affiché.
 */
export function claimLicense(key: string, csrfToken: string): Promise<void> {
  return apiFetch<void>("/me/licenses/claim", { method: "POST", body: { key }, csrfToken });
}

export function deleteAccount(password: string, csrfToken: string): Promise<void> {
  return apiFetch<void>("/me", { method: "DELETE", body: { password }, csrfToken });
}

/**
 * `GET /me/export` renvoie directement le fichier à télécharger : un `fetch`
 * classique puis un lien `<a download>` généré à la volée (docs/api-front.md
 * §"Mes données"), pas de navigation directe qui perdrait les en-têtes de
 * session côté navigateur.
 */
export async function downloadAccountExport(): Promise<void> {
  const blob = await apiFetch<Blob>("/me/export", { raw: true });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mes-donnees-fondamental.json";
  link.click();
  URL.revokeObjectURL(url);
}
