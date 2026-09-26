import {
  clearedSessionCookieOptions,
  isSecureEnv,
  readCookie,
  sessionCookieName,
  sessionCookieOptions,
} from './session-cookie.js';

describe('cookie de session', () => {
  it('est sécurisé partout sauf en développement local', () => {
    expect(isSecureEnv('local')).toBe(false);
    expect(isSecureEnv('dev')).toBe(true);
    expect(isSecureEnv('prod')).toBe(true);
  });

  it('prend le préfixe __Host- quand il est sécurisé', () => {
    expect(sessionCookieName(true)).toBe('__Host-session');
    expect(sessionCookieName(false)).toBe('session');
  });

  it('en production : httpOnly, Secure, SameSite=Lax, valable sur tout le site, sans Domain', () => {
    const expires = new Date('2030-01-01T00:00:00Z');
    const options = sessionCookieOptions(true, expires);
    expect(options).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/', expires });
    // __Host- interdit l'attribut Domain : il ne doit jamais apparaître.
    expect(options).not.toHaveProperty('domain');
  });

  it("l'effacement reprend les mêmes attributs (sinon le navigateur ne supprime pas le cookie)", () => {
    expect(clearedSessionCookieOptions(true)).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  });

  describe('readCookie', () => {
    it('trouve un cookie parmi plusieurs', () => {
      expect(readCookie('a=1; session=abc; b=2', 'session')).toBe('abc');
      expect(readCookie('session=abc', 'session')).toBe('abc');
    });

    it('ne confond pas les noms proches', () => {
      expect(readCookie('xsession=1; session2=2', 'session')).toBeUndefined();
      expect(readCookie('__Host-session=abc', 'session')).toBeUndefined();
    });

    it('décode les valeurs et garde les "=" de la valeur', () => {
      expect(readCookie('session=a%20b', 'session')).toBe('a b');
      expect(readCookie('session=abc==', 'session')).toBe('abc==');
    });

    it('ignore les en-têtes absents ou mal formés', () => {
      expect(readCookie(undefined, 'session')).toBeUndefined();
      expect(readCookie('', 'session')).toBeUndefined();
      expect(readCookie('pas-de-egal', 'session')).toBeUndefined();
      expect(readCookie('session=%E0%A4%A', 'session')).toBeUndefined();
    });
  });
});
