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
});
