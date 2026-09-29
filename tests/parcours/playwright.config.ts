import { defineConfig, devices } from "@playwright/test";

/**
 * Parcours bout en bout sur le site déployé (#34). Par défaut dev ; `PARCOURS_URL` pour un autre site.
 * Jamais la prod : l'achat y serait réel.
 */
const baseURL = process.env.PARCOURS_URL ?? "https://dev.fondamentalplugin.fr";
if (baseURL.replace(/\/+$/, "") === "https://fondamentalplugin.fr") {
  throw new Error("Les parcours achètent avec une carte de test : jamais sur la prod.");
}

// Préproduction protégée par mot de passe (deploy/nginx/api-dev.conf) : identifiants envoyés
// seulement au site testé, jamais à Stripe ni ailleurs.
const httpCredentials = process.env.PREPROD_USER
  ? { username: process.env.PREPROD_USER, password: process.env.PREPROD_PASSWORD ?? "", origin: new URL(baseURL).origin }
  : undefined;

export default defineConfig({
  testDir: "./specs",
  // Un seul compte de test : les parcours qui s'y connectent ne doivent pas se marcher dessus.
  fullyParallel: false,
  workers: 1,
  // Réseau et page Stripe hébergée : un second essai avant de déclarer un parcours cassé.
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    httpCredentials,
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
