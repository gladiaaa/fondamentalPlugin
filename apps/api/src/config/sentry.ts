import * as Sentry from '@sentry/node';
import type { ErrorEvent } from '@sentry/node';
import type { Env } from './env.js';

/**
 * Retire ce qui ne doit jamais quitter le serveur avant d'envoyer un événement à Sentry : cookies,
 * en-têtes d'autorisation et de session, mêmes champs que `LOG_REDACT_PATHS` des logs pino.
 */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      const headers = { ...event.request.headers };
      delete headers['authorization'];
      delete headers['Authorization'];
      delete headers['cookie'];
      delete headers['Cookie'];
      delete headers['x-csrf-token'];
      delete headers['X-CSRF-Token'];
      event.request.headers = headers;
    }
  }
  return event;
}

/**
 * Sans `SENTRY_DSN`, ne fait rien : l'API tourne normalement, simplement sans remontée d'erreurs.
 * À appeler une seule fois, avant `NestFactory.create` (recommandation Sentry).
 */
export function initSentry(env: Pick<Env, 'SENTRY_DSN' | 'APP_ENV' | 'APP_VERSION'>): void {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV,
    release: env.APP_VERSION,
    // Suivi des erreurs seulement : pas de traces de performance ni de sessions rejouées.
    tracesSampleRate: 0,
    beforeSend: (event) => scrubSentryEvent(event),
  });
}
