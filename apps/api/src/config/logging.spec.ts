import { Writable } from 'node:stream';
import pino from 'pino';
import { LOG_REDACT } from './logging.js';

/** Journalise `entry` avec la vraie configuration de masquage et renvoie la ligne écrite. */
function logLine(entry: Record<string, unknown>): string {
  let output = '';
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output += String(chunk);
      callback();
    },
  });
  pino({ redact: LOG_REDACT }, stream).info(entry);
  return output;
}

describe('masquage des logs', () => {
  it('masque les secrets des en-têtes de requête et de réponse', () => {
    const line = logLine({
      req: {
        method: 'POST',
        headers: {
          cookie: '__Host-session=jeton-de-session',
          authorization: 'Bearer jeton-admin',
          'x-csrf-token': 'jeton-csrf',
          origin: 'https://fondamentalplugin.fr',
        },
      },
      res: { statusCode: 200, headers: { 'set-cookie': ['__Host-session=nouveau-jeton; HttpOnly'] } },
    });
    for (const secret of ['jeton-de-session', 'jeton-admin', 'jeton-csrf', 'nouveau-jeton']) {
      expect(line).not.toContain(secret);
    }
    // Le reste reste lisible : on masque les secrets, pas toute la ligne.
    expect(line).toContain('https://fondamentalplugin.fr');
    expect(line).toContain('[masqué]');
  });

  it('masque les mots de passe et jetons d’un objet journalisé', () => {
    const line = logLine({ body: { password: 'mot-de-passe', token: 'jeton-de-lien', email: 'ada@example.com' } });
    expect(line).not.toContain('mot-de-passe');
    expect(line).not.toContain('jeton-de-lien');
    expect(line).toContain('ada@example.com');
  });
});
