/**
 * Supervision côté navigateur (#33) : erreurs vers Sentry, audience vers Umami (sans cookies). Les
 * deux ne s'activent que si le serveur les a configurés (voir `/config-publique`) ; sinon ces
 * fonctions ne font rien.
 */

type Umami = { track: (event: string, data?: Record<string, string | number>) => void };

declare global {
  interface Window {
    umami?: Umami;
  }
}

/**
 * Événement d'audience (clic d'achat, achat confirmé…). Aucune donnée personnelle dans `data`. Le
 * script Umami arrive juste après le chargement de la page : on l'attend quelques secondes au plus.
 */
export function suivreEvenement(event: string, data?: Record<string, string | number>, essais = 20): void {
  if (window.umami) window.umami.track(event, data);
  else if (essais > 0) setTimeout(() => suivreEvenement(event, data, essais - 1), 500);
}

/**
 * Erreur attrapée par une limite d'erreur React (sinon Sentry ne la voit jamais). Une erreur avec
 * `digest` vient du rendu serveur : elle est déjà remontée par `instrumentation.ts`.
 */
export function signalerErreur(error: Error & { digest?: string }): void {
  if (error.digest) return;
  void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
}
