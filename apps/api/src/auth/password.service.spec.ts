import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  beforeAll(() => service.onModuleInit());

  it('hache en argon2id avec les paramètres OWASP, sans jamais contenir le mot de passe', async () => {
    const hash = await service.hash('un-mot-de-passe-secret');
    const [, algorithm, version, params] = hash.split('$');
    expect(algorithm).toBe('argon2id');
    expect(version).toBe('v=19');
    // Les paramètres, dans l'ordre où la bibliothèque les écrit.
    expect(params.split(',').sort()).toEqual(['m=19456', 'p=1', 't=2']);
    expect(hash).not.toContain('un-mot-de-passe-secret');
  });

  it('deux hachages du même mot de passe diffèrent (sel aléatoire)', async () => {
    const [a, b] = await Promise.all([service.hash('meme-mot-de-passe'), service.hash('meme-mot-de-passe')]);
    expect(a).not.toBe(b);
  });

  it('vérifie le bon mot de passe, refuse les autres', async () => {
    const hash = await service.hash('un-mot-de-passe-secret');
    await expect(service.verify(hash, 'un-mot-de-passe-secret')).resolves.toBe(true);
    await expect(service.verify(hash, 'un-mot-de-passe-secreT')).resolves.toBe(false);
    await expect(service.verify(hash, '')).resolves.toBe(false);
  });

  it('une empreinte illisible est refusée sans lever d’erreur', async () => {
    await expect(service.verify('pas-une-empreinte', 'x')).resolves.toBe(false);
    await expect(service.verify('', 'x')).resolves.toBe(false);
  });

  it("burn() dépense un vrai calcul, sans erreur (temps constant pour les comptes inconnus)", async () => {
    const start = performance.now();
    await service.burn('n-importe-quoi');
    // Un calcul argon2id réel prend plusieurs millisecondes ; un simple `return` prendrait ~0.
    expect(performance.now() - start).toBeGreaterThan(2);
  });
});
