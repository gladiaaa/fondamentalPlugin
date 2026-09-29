import { expect, test } from "@playwright/test";
import { E2E_EMAIL, e2ePassword, seConnecter } from "./compte";

test("inscription : le formulaire refuse deux mots de passe différents", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByLabel("Adresse e-mail").fill(E2E_EMAIL);
  await page.getByLabel("Mot de passe", { exact: true }).fill("UnMotDePasseSolide123");
  await page.getByLabel("Confirmer le mot de passe").fill("UnAutreMotDePasse456");
  // Le formulaire vérifie d'abord la case des CGV, puis seulement la concordance des mots de passe.
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByText("Les mots de passe ne correspondent pas.")).toBeVisible();
});

test("inscription : une adresse déjà inscrite reçoit la même réponse qu'une nouvelle", async ({ page }) => {
  // L'API ne révèle jamais si un compte existe : elle répond comme pour une inscription réussie
  // (et prévient la boîte de test de Resend, qui ne délivre rien).
  await page.goto("/inscription");
  await page.getByLabel("Adresse e-mail").fill(E2E_EMAIL);
  await page.getByLabel("Mot de passe", { exact: true }).fill(e2ePassword());
  await page.getByLabel("Confirmer le mot de passe").fill(e2ePassword());
  await page.getByRole("checkbox").check();
  const response = page.waitForResponse((r) => r.url().endsWith("/api/auth/register"));
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  expect((await response).status()).toBe(202);
});

test("connexion, espace client, déconnexion", async ({ page }) => {
  await seConnecter(page);
  await page.goto("/compte/licences");
  await expect(page.getByRole("heading", { name: "Mes licences" })).toBeVisible();

  await page.getByRole("button", { name: "Menu du compte" }).click();
  await page.getByRole("menuitem", { name: /Déconnexion/ }).click();
  await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
});

test("configurateur : la clé de licence du compte est pré-remplie", async ({ page }) => {
  // Le compte de test possède des licences FondamentalTag (parcours d'achat).
  await seConnecter(page, "/configurateur");
  await expect(page.getByRole("heading", { level: 1, name: /Réglez vos plugins/ })).toBeVisible();
  await page.getByRole("button", { name: "FondamentalTag" }).click();
  await page.getByRole("tab", { name: /config\.yml/ }).click();
  const fichier = page.locator("pre code");
  await expect(fichier).toContainText("Généré sur fondamentalplugin.fr", { timeout: 15_000 });
  // license.key : une vraie clé, pas la valeur vide livrée avec le plugin.
  await expect(fichier).toContainText(/key: "[A-Za-z0-9._-]{4,}"/);
});

test("l'ancienne adresse du générateur mène au configurateur", async ({ page }) => {
  await seConnecter(page, "/compte/config");
  await expect(page).toHaveURL(/\/configurateur$/);
});

test("un visiteur est renvoyé vers la connexion depuis l'espace client", async ({ page }) => {
  await page.goto("/compte/licences");
  await expect(page).toHaveURL(/\/connexion/);
});
