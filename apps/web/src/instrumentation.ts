import * as Sentry from "@sentry/nextjs";

/**
 * Erreurs du serveur Next (rendu, actions, routes) remontées à Sentry (#33). Sans `SENTRY_DSN`, rien
 * n'est activé. La variable est lue au démarrage du serveur, pas à la construction : la même image
 * sert en dev et en prod.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.APP_ENV ?? "local",
    release: process.env.APP_VERSION,
    // Erreurs seulement, comme l'API : pas de traces de performance.
    tracesSampleRate: 0,
  });
}

export const onRequestError = Sentry.captureRequestError;
