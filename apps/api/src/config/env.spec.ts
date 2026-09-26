import { validateEnv } from './env.js';

const DATABASE_URL = 'postgresql://user:secret@localhost:5432/fondamental';

describe('validateEnv', () => {
  it('applique les valeurs par défaut', () => {
    const env = validateEnv({ DATABASE_URL });
    expect(env).toMatchObject({ APP_ENV: 'local', APP_VERSION: 'local', PORT: 4000, LOG_LEVEL: 'info' });
  });

  it('convertit le port en nombre', () => {
    expect(validateEnv({ DATABASE_URL, PORT: '4100' }).PORT).toBe(4100);
  });

  it('refuse de démarrer sans DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it("refuse une base qui n'est pas PostgreSQL", () => {
    expect(() => validateEnv({ DATABASE_URL: 'mysql://user:secret@localhost:3306/minecraft' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("n'affiche jamais la valeur d'une variable dans l'erreur", () => {
    expect(() => validateEnv({ DATABASE_URL: 'mysql://user:tres-secret@localhost/db' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('tres-secret') }),
    );
  });

  it('refuse un environnement inconnu', () => {
    expect(() => validateEnv({ DATABASE_URL, APP_ENV: 'staging' })).toThrow(/APP_ENV/);
  });

  describe('SITE_URL', () => {
    it.each([
      ['local', 'http://localhost:3000'],
      ['dev', 'https://dev.fondamentalplugin.fr'],
      ['prod', 'https://fondamentalplugin.fr'],
    ])('est déduite de APP_ENV=%s', (APP_ENV, expected) => {
      expect(validateEnv({ DATABASE_URL, APP_ENV }).SITE_URL).toBe(expected);
    });

    it('peut être fixée, sans « / » final', () => {
      expect(validateEnv({ DATABASE_URL, SITE_URL: 'https://exemple.test//' }).SITE_URL).toBe('https://exemple.test');
    });

    it('refuse une adresse invalide', () => {
      expect(() => validateEnv({ DATABASE_URL, SITE_URL: 'pas-une-url' })).toThrow(/SITE_URL/);
    });
  });

  describe("envoi d'e-mails", () => {
    it("RESEND_API_KEY est facultative : sans elle, l'API démarre", () => {
      expect(validateEnv({ DATABASE_URL, APP_ENV: 'prod' }).RESEND_API_KEY).toBeUndefined();
    });

    it('une variable vide équivaut à une variable absente', () => {
      const env = validateEnv({ DATABASE_URL, RESEND_API_KEY: '', SITE_URL: '', MAIL_FROM: '' });
      expect(env.RESEND_API_KEY).toBeUndefined();
      expect(env.SITE_URL).toBe('http://localhost:3000');
      expect(env.MAIL_FROM).toBe('Fondamental <noreply@fondamentalplugin.fr>');
    });
  });
});
