import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

const PLUGINS = ["FondamentalBedwars", "FondamentalTag", "FondamentalCrate", "FondamentalPass"];

test("l'accueil et le catalogue affichent les 4 plugins", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Fondamental/);

  await page.goto("/plugins");
  await expect(page.getByText("n'a pas pu être chargé")).toHaveCount(0);
  for (const name of PLUGINS) {
    await expect(page.getByRole("heading", { name }).first()).toBeVisible();
  }
});

test("fiche d'un plugin : prix, bouton d'achat et fichiers téléchargeables", async ({ page }) => {
  await page.goto("/plugins/tag");
  await expect(page.getByRole("heading", { level: 1, name: "FondamentalTag" })).toBeVisible();
  await expect(page.getByText(/\d+,\d{2}\s€/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Acheter la licence/ }).or(page.getByRole("button", { name: /Acheter la licence/ }))).toBeVisible();

  await page.getByRole("tab", { name: "Téléchargements" }).click();
  await expect(page.getByRole("link", { name: /Télécharger/ }).first()).toBeVisible();
});

test("le jar téléchargé correspond à l'empreinte SHA-256 annoncée", async ({ request }) => {
  const files = await (await request.get("/api/products/tag/files")).json();
  expect(files.length).toBeGreaterThan(0);
  const file = files[0];

  const download = await request.get(file.downloadUrl);
  expect(download.status()).toBe(200);
  const body = await download.body();
  expect(body.length).toBe(file.sizeBytes);
  expect(createHash("sha256").update(body).digest("hex")).toBe(file.sha256);
});

test("le wiki s'affiche, avec une section par plugin et sa recherche", async ({ page, request }) => {
  const response = await page.goto("/wiki");
  expect(response?.status()).toBeLessThan(400);
  for (const slug of ["bedwars", "tag", "crate", "pass"]) {
    const pageResponse = await page.goto(`/wiki/${slug}`);
    expect(pageResponse?.status(), `/wiki/${slug}`).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1, name: /^Fondamental/ })).toBeVisible();
  }
  // /wiki-recherche : hors de /api/*, envoyé à l'API par nginx.
  const results = await (await request.get("/wiki-recherche?query=licence")).json();
  expect(results.length).toBeGreaterThan(0);
});
