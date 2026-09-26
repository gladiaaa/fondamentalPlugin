import type { CookieOptions } from 'express';
import type { Env } from '../config/env.js';

/** Cookie `Secure` partout sauf en développement local (http://localhost). */
export function isSecureEnv(appEnv: Env['APP_ENV']): boolean {
  return appEnv !== 'local';
}

/** Préfixe `__Host-` : le navigateur refuse alors tout cookie de ce nom posé par un sous-domaine ou sans `Secure`. */
export function sessionCookieName(secure: boolean): string {
  return secure ? '__Host-session' : 'session';
}

export function sessionCookieOptions(secure: boolean, expires: Date): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/', expires };
}

/** Options pour effacer le cookie : les mêmes attributs, sinon le navigateur ne le supprime pas. */
export function clearedSessionCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/' };
}

/** Lit un cookie dans l'en-tête `Cookie` (`nom=valeur; nom2=valeur2`). */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const raw = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
