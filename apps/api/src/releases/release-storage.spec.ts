import { resolve } from 'node:path';
import { resolveReleasePath } from './release-storage.js';

const BASE = '/data/releases';

describe('resolveReleasePath', () => {
  it('résout un chemin relatif dans le dossier des fichiers', () => {
    expect(resolveReleasePath(BASE, 'tag/2.2.0/fondamentaltag-free-2.2.0.jar')).toBe(
      resolve(BASE, 'tag/2.2.0/fondamentaltag-free-2.2.0.jar'),
    );
  });

  it.each([
    ['remontée de dossier', '../secret.jar'],
    ['remontée au milieu', 'tag/../../etc/passwd'],
    ['chemin absolu', '/etc/passwd'],
    ['segment « .. » seul', 'tag/../x.jar'],
    ['segment « . »', 'tag/./x.jar'],
    ['antislash', 'tag\\x.jar'],
    ['octet nul', 'tag/x\0.jar'],
    ['espace', 'tag/mon fichier.jar'],
    ['caractère encodé', 'tag/%2e%2e/x.jar'],
    ['vide', ''],
    ['double barre', 'tag//x.jar'],
    ['barre finale', 'tag/x.jar/'],
  ])('refuse : %s', (_label, path) => {
    expect(resolveReleasePath(BASE, path)).toBeNull();
  });
});
