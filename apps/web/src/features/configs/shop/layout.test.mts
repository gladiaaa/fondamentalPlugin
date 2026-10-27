// Lancé par `npm test` (node --test) : placement identique à gui/ShopMenus.java de FondamentalShop.
import assert from "node:assert/strict";
import test from "node:test";
import { articleProblem, categoryLayout, commandLayout, inner, moveArticle, newArticleKey } from "./layout.ts";

test("cases intérieures d'un menu de 3 lignes", () => {
  assert.deepEqual(inner(3), [10, 11, 12, 13, 14, 15, 16]);
});

test("catégorie : cases fixes, puis placement automatique et boutons du plugin", () => {
  const layout = categoryLayout(
    {
      rows: 3,
      display: "<accent>Ressources",
      items: {
        fer: { material: "IRON_INGOT", buy: 20 },
        diamant: { material: "DIAMOND", buy: 400, slot: 10 },
        vide: { material: "STONE" },
      },
    },
    0,
  );
  assert.equal(layout.slots.length, 27);
  assert.equal(layout.slots[10].key, "diamant");
  assert.equal(layout.slots[10].fixed, true);
  assert.equal(layout.slots[11].key, "fer");
  assert.equal(layout.slots[0].material, "PURPLE_STAINED_GLASS_PANE");
  assert.equal(layout.slots[22].material, "ARROW");
  assert.equal(layout.slots[23].material, "PLAYER_HEAD");
  // Article sans prix : le plugin l'ignore, il n'a pas de case.
  assert.ok(!layout.slots.some((s) => s.key === "vide"));
  assert.equal(layout.pages, 1);
});

test("catégorie : pages quand les cases intérieures ne suffisent pas", () => {
  const items = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`a${i}`, { material: "STONE", buy: 1 }]));
  const first = categoryLayout({ rows: 3, items }, 0);
  assert.equal(first.pages, 2);
  assert.equal(first.slots[25].material, "SPECTRAL_ARROW");
  const second = categoryLayout({ rows: 3, items }, 1);
  assert.equal(second.slots[10].key, "a7");
  assert.equal(second.slots[19].material, "SPECTRAL_ARROW");
});

test("commande : catégories et boutons solde, fermer, revendre", () => {
  const layout = commandLayout({ rows: 3 }, [
    { id: "blocs", values: { icon: "GRASS_BLOCK" } },
    { id: "grades", values: { icon: "DIAMOND_CHESTPLATE", slot: 13 } },
  ]);
  assert.equal(layout.slots[13].key, "grades");
  assert.equal(layout.slots[10].key, "blocs");
  assert.deepEqual(
    [21, 22, 23].map((i) => layout.slots[i].material),
    ["PLAYER_HEAD", "BARRIER", "HOPPER"],
  );
});

test("déplacer un article échange les cases fixes", () => {
  const items = { a: { slot: 10 }, b: { slot: 11 }, c: {} };
  assert.deepEqual(moveArticle(items, "a", 11), {
    a: { slot: 11 },
    b: { slot: 10 },
    c: {},
  });
  assert.deepEqual(moveArticle(items, "c", 10), {
    a: {},
    b: { slot: 11 },
    c: { slot: 10 },
  });
});

test("règles de chargement des articles", () => {
  assert.equal(articleProblem({ type: "info" }), null);
  assert.equal(articleProblem({ type: "rank", sell: 5, group: "vip" }), "ni prix d’achat ni prix de revente");
  assert.equal(articleProblem({ type: "rank", buy: 5 }), "champ « group » manquant");
  assert.equal(newArticleKey({ diamond: {} }, "minecraft:DIAMOND"), "diamond_2");
});

test("article incomplet avec sa case : visible, sans prendre la place des autres", () => {
  const layout = categoryLayout(
    {
      rows: 3,
      items: {
        neuf: { material: "DIAMOND", slot: 10 },
        fer: { material: "IRON_INGOT", buy: 1 },
      },
    },
    0,
  );
  assert.equal(layout.slots[10].key, "fer");
  const seul = categoryLayout({ rows: 3, items: { neuf: { material: "DIAMOND", slot: 12 } } }, 0);
  assert.equal(seul.slots[12].problem, "ni prix d’achat ni prix de revente");
});

test("commande : catégorie sans fichier montrée en « ? » à sa place dans l'ordre", () => {
  const layout = commandLayout({ rows: 3 }, [
    { id: "blocs", values: { icon: "GRASS_BLOCK" } },
    { id: "cultures", values: {}, missing: true },
  ]);
  assert.equal(layout.slots[11].key, "cultures");
  assert.equal(layout.slots[11].missing, true);
  assert.equal(layout.slots[11].material, "?");
});
