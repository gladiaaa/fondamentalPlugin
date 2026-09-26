/**
 * Champs masqués dans les logs (`[masqué]` à la place de la valeur) : identifiants de session,
 * jeton anti-CSRF, mots de passe et jetons. Toute nouvelle donnée secrète qui transite dans une
 * requête doit être ajoutée ici.
 */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
];

export const LOG_REDACT = { paths: LOG_REDACT_PATHS, censor: '[masqué]' };
