import { makePluginJar, makeZip } from '../../test/support/zip.js';
import { isPluginJar, listZipEntries } from './jar.js';

describe('listZipEntries', () => {
  it('liste les fichiers d’une archive zip', () => {
    const zip = makeZip({ 'plugin.yml': 'a', 'fr/x/Main.class': 'b', 'META-INF/MANIFEST.MF': 'c' });
    expect(listZipEntries(zip)).toEqual(['plugin.yml', 'fr/x/Main.class', 'META-INF/MANIFEST.MF']);
  });

  it('lit une archive avec un commentaire de fin', () => {
    const zip = makeZip({ 'plugin.yml': 'a' });
    zip.writeUInt16LE(5, zip.length - 2);
    expect(listZipEntries(Buffer.concat([zip, Buffer.from('hello')]))).toEqual(['plugin.yml']);
  });

  it.each([
    ['vide', Buffer.alloc(0)],
    ['trop court', Buffer.from('PK')],
    ['du texte', Buffer.from('ceci n’est pas un jar '.repeat(10))],
    ['un exécutable', Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)])],
  ])('refuse : %s', (_label, buffer) => {
    expect(listZipEntries(buffer)).toBeNull();
  });

  it('refuse une archive tronquée (répertoire central coupé)', () => {
    const zip = makeZip({ 'plugin.yml': 'a', 'b.txt': 'b' });
    expect(listZipEntries(zip.subarray(0, zip.length - 40))).toBeNull();
  });

  it('refuse un répertoire central qui pointe hors de l’archive', () => {
    const zip = makeZip({ 'plugin.yml': 'a' });
    zip.writeUInt32LE(0x7fffffff, zip.length - 6);
    expect(listZipEntries(zip)).toBeNull();
  });

  it('refuse un nombre d’entrées qui dépasse le contenu réel', () => {
    const zip = makeZip({ 'plugin.yml': 'a' });
    zip.writeUInt16LE(50, zip.length - 12);
    expect(listZipEntries(zip)).toBeNull();
  });
});

describe('isPluginJar', () => {
  it('accepte un jar avec plugin.yml ou paper-plugin.yml à la racine', () => {
    expect(isPluginJar(makePluginJar())).toBe(true);
    expect(isPluginJar(makeZip({ 'paper-plugin.yml': 'x' }))).toBe(true);
  });

  it('refuse un zip sans descripteur de plugin, ou avec un descripteur dans un sous-dossier', () => {
    expect(isPluginJar(makeZip({ 'readme.txt': 'x' }))).toBe(false);
    expect(isPluginJar(makeZip({ 'dossier/plugin.yml': 'x' }))).toBe(false);
  });

  it('refuse ce qui n’est pas un zip', () => {
    expect(isPluginJar(Buffer.from('plugin.yml'))).toBe(false);
  });
});
