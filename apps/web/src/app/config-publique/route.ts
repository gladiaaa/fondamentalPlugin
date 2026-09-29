// Réglages du navigateur lus au démarrage du serveur, pas à la construction de l'image (la même image
// sert en dev et en prod, un NEXT_PUBLIC_* y serait figé). Rien de secret : un DSN Sentry et un
// identifiant Umami sont faits pour être publics.
export const dynamic = "force-dynamic";

export type ConfigPublique = {
  environment: string;
  release: string | null;
  sentryDsn: string | null;
  umami: { scriptUrl: string; websiteId: string } | null;
};

export function GET() {
  const umamiUrl = process.env.UMAMI_URL;
  const umamiId = process.env.UMAMI_WEBSITE_ID;
  const config: ConfigPublique = {
    environment: process.env.APP_ENV ?? "local",
    release: process.env.APP_VERSION ?? null,
    sentryDsn: process.env.SENTRY_DSN || null,
    umami: umamiUrl && umamiId ? { scriptUrl: `${umamiUrl.replace(/\/$/, "")}/script.js`, websiteId: umamiId } : null,
  };
  return Response.json(config, { headers: { "Cache-Control": "public, max-age=300" } });
}
