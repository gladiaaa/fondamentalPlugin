import { createHash } from 'node:crypto';
import { matchesRange, PwnedPasswordsService } from './pwned-passwords.service.js';

const sha1 = (value: string) => createHash('sha1').update(value).digest('hex').toUpperCase();

describe('matchesRange', () => {
  const body = ['0018A45C4D1DEF81644B54AB7F969B88D65:3', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0', 'ABCDEF:12'].join('\r\n');

  it('trouve un suffixe présent avec un nombre positif', () => {
    expect(matchesRange(body, 'ABCDEF')).toBe(true);
    expect(matchesRange(body, '0018A45C4D1DEF81644B54AB7F969B88D65')).toBe(true);
  });

  it('ignore les lignes de remplissage (nombre à 0) et les suffixes absents', () => {
    expect(matchesRange(body, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(false);
    expect(matchesRange(body, 'ZZZZZZ')).toBe(false);
    expect(matchesRange('', 'ABCDEF')).toBe(false);
  });
});

describe('PwnedPasswordsService', () => {
  const service = new PwnedPasswordsService();
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("n'envoie que les 5 premiers caractères de l'empreinte SHA-1 (k-anonymat)", async () => {
    fetchMock.mockResolvedValue(new Response('0000000000000000000000000000000000A:1', { status: 200 }));
    await service.isPwned('un-mot-de-passe-secret');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const hash = sha1('un-mot-de-passe-secret');
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
    expect(url).not.toContain(hash.slice(5));
    expect(init.headers).toMatchObject({ 'Add-Padding': 'true' });
  });

  it('signale un mot de passe présent dans la réponse', async () => {
    const hash = sha1('password123456');
    fetchMock.mockResolvedValue(new Response(`${hash.slice(5)}:9999\r\n`, { status: 200 }));
    await expect(service.isPwned('password123456')).resolves.toBe(true);
  });

  it('accepte un mot de passe absent de la réponse', async () => {
    fetchMock.mockResolvedValue(new Response('0000000000000000000000000000000000A:5', { status: 200 }));
    await expect(service.isPwned('un-mot-de-passe-secret')).resolves.toBe(false);
  });

  it("si le service répond une erreur ou ne répond pas, n'empêche pas de s'inscrire", async () => {
    fetchMock.mockResolvedValueOnce(new Response('erreur', { status: 503 }));
    await expect(service.isPwned('un-mot-de-passe-secret')).resolves.toBe(false);

    fetchMock.mockRejectedValueOnce(new DOMException('délai dépassé', 'TimeoutError'));
    await expect(service.isPwned('un-mot-de-passe-secret')).resolves.toBe(false);
  });
});
