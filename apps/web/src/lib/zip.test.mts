// Lancé par `npm test` (node --test).
import assert from "node:assert/strict";
import test from "node:test";
import { crc32, zip } from "./zip.ts";

test("crc32 : valeur de référence", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});

test("archive : en-têtes, nombre de fichiers et contenu lisible tel quel", () => {
  const files = [
    { name: "FondamentalShop/config.yml", content: "language: fr\n" },
    { name: "FondamentalShop/shops/blocs.yml", content: 'display: "<accent>Blocs"\n' },
  ];
  const out = zip(files, new Date(2026, 9, 27, 12, 0, 0));
  const view = new DataView(out.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  const end = out.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50);
  assert.equal(view.getUint16(end + 10, true), 2);
  // Sans compression : le texte se retrouve tel quel dans l'archive.
  assert.ok(new TextDecoder().decode(out).includes('display: "<accent>Blocs"'));
});
