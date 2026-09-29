import { expect, type Page } from "@playwright/test";

/**
 * Compte de test dédié, créé et confirmé une fois sur dev (voir README). Son adresse est une boîte de
 * test de Resend (`delivered@resend.dev`) : les e-mails envoyés pendant les parcours ne partent chez
 * personne et n'abîment pas la réputation du domaine d'envoi.
 */
export const E2E_EMAIL = process.env.E2E_EMAIL ?? "delivered@resend.dev";

export function e2ePassword(): string {
  const password = process.env.E2E_PASSWORD;
  if (!password) throw new Error("E2E_PASSWORD absent (secret de l'environnement dev)");
  return password;
}

/** Connexion par le formulaire, puis retour éventuel sur `retour`. */
export async function seConnecter(page: Page, retour?: string): Promise<void> {
  await page.goto(retour ? `/connexion?retour=${encodeURIComponent(retour)}` : "/connexion");
  await page.getByLabel("Adresse e-mail").fill(E2E_EMAIL);
  await page.getByLabel("Mot de passe", { exact: true }).fill(e2ePassword());
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("button", { name: "Menu du compte" })).toBeVisible();
}
