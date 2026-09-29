import { expect, test, type Page } from "@playwright/test";
import { seConnecter } from "./compte";

/**
 * Remplit la page Stripe Checkout hébergée (mode test uniquement) avec la carte 4242. Les champs
 * facultatifs selon le pays détecté (code postal) ou la configuration (accordéon des moyens de
 * paiement) ne sont remplis que s'ils apparaissent.
 */
async function payerAvecCarteDeTest(page: Page): Promise<void> {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  // Garde-fou : jamais une session Stripe réelle (les sessions du mode test commencent par cs_test_).
  expect(page.url(), "session Stripe en mode test uniquement").toContain("cs_test_");

  // Moyens de paiement en accordéon (carte, Klarna…) : ouvrir la carte si elle n'est pas déjà dépliée.
  await page.locator("#cardNumber").or(page.getByRole("button", { name: /Payer par carte|Pay with card/ })).first().waitFor();
  const carte = page.getByRole("button", { name: /Payer par carte|Pay with card/ });
  if (await carte.isVisible().catch(() => false)) await carte.click();

  await page.locator("#cardNumber").fill("4242424242424242");
  await page.locator("#cardExpiry").fill("12 / 34");
  await page.locator("#cardCvc").fill("123");
  await page.locator("#billingName").fill("Parcours Automatique");

  const codePostal = page.locator("#billingPostalCode");
  if (await codePostal.isVisible().catch(() => false)) await codePostal.fill("75001");

  // Case obligatoire : CGV et renonciation au droit de rétractation (contenu numérique).
  await page.getByRole("checkbox", { name: /renoncez expressément|droit de rétractation/ }).check();
  await page.getByRole("button", { name: /^(Payer|Pay)$/ }).click();
}

test("achat avec la carte de test : paiement Stripe, clé affichée sur /merci et dans le compte", async ({ page }) => {
  await seConnecter(page, "/plugins/tag");
  await expect(page).toHaveURL(/\/plugins\/tag/);

  await page.getByRole("button", { name: /Acheter la licence/ }).click();
  await payerAvecCarteDeTest(page);

  // Retour sur le site : le webhook crée la licence, /merci interroge l'API jusqu'à ce qu'elle soit prête.
  await page.waitForURL(/\/merci\?session_id=/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Votre licence .* est prête/ })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Paiement confirmé")).toBeVisible();

  await page.goto("/compte/licences");
  await expect(page.getByRole("heading", { name: "Mes licences" })).toBeVisible();
  await expect(page.getByText("Aucune licence")).toHaveCount(0);
});
