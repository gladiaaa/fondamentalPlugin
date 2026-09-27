/** Langues gérées pour les e-mails transactionnels. Le reste du site n'est pour l'instant qu'en français. */
export type MailLocale = 'fr' | 'en';

/**
 * Langue déduite de l'en-tête `Accept-Language` à l'inscription : `en` si le navigateur la préfère,
 * `fr` dans tous les autres cas (y compris en l'absence de l'en-tête). Ne gère que les deux langues
 * proposées : un visiteur espagnol reçoit ses e-mails en français, pas dans une langue approximative.
 */
export function parseMailLocale(acceptLanguage?: string): MailLocale {
  return acceptLanguage?.trim().toLowerCase().startsWith('en') ? 'en' : 'fr';
}
