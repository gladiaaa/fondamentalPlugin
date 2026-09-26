import { z } from 'zod';

/** Adresse publique du site selon l'environnement : celle des liens des e-mails et des origines autorisées. */
const DEFAULT_SITE_URL = {
  local: 'http://localhost:3000',
  dev: 'https://dev.fondamentalplugin.fr',
  prod: 'https://fondamentalplugin.fr',
} as const;

// Une variable présente mais vide (`RESEND_API_KEY=` dans un fichier .env) équivaut à une variable absente.
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

// Variables d'environnement de l'API. Validées au démarrage : une variable
// manquante ou invalide empêche l'API de démarrer, avec un message explicite.
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Environnement fonctionnel : `local` (poste de dev), `dev` ou `prod` (VPS). */
    APP_ENV: z.enum(['local', 'dev', 'prod']).default('local'),
    /** Version déployée, `<branche>-<commit court>`, injectée au build de l'image. */
    APP_VERSION: z.string().min(1).default('local'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    /** Adresse publique du site (sans `/` final). Déduite de APP_ENV si absente. */
    SITE_URL: optional(z.url()),
    /** Clé Resend. Sans elle, hors développement local, l'inscription et la réinitialisation répondent 503. */
    RESEND_API_KEY: optional(z.string().min(1)),
    /** Expéditeur des e-mails. Le domaine doit être vérifié chez Resend (voir #26). */
    MAIL_FROM: optional(z.string().min(3)).default('Fondamental <noreply@fondamentalplugin.fr>'),
    /** Dossier des jars publiés (un sous-dossier par plugin et par version). Chemin relatif au dossier de lancement, ou absolu. */
    RELEASES_DIR: optional(z.string().min(1)).default('./data/releases'),
    /**
     * Préfixe d'une location nginx `internal` qui pointe sur RELEASES_DIR (ex. `/protected-releases`).
     * Si présent, l'API répond aux téléchargements par `X-Accel-Redirect` et nginx sert le fichier.
     * Sinon l'API envoie elle-même le fichier.
     */
    DOWNLOADS_ACCEL_PREFIX: optional(z.string().regex(/^\/[A-Za-z0-9_\-/]*[A-Za-z0-9_-]$/)),
    /**
     * Jeton de la CI des plugins pour publier une version (`Authorization: Bearer …`). Sans lui, la
     * publication est refusée pour tout le monde. Au moins 32 caractères : `openssl rand -base64 32`.
     */
    RELEASES_TOKEN: optional(z.string().min(32)),
    /** Taille maximale d'un jar envoyé à la publication, en Mo. */
    RELEASES_MAX_UPLOAD_MB: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.coerce.number().int().min(1).max(200).default(50),
    ),
  })
  .transform((env) => ({
    ...env,
    SITE_URL: (env.SITE_URL ?? DEFAULT_SITE_URL[env.APP_ENV]).replace(/\/+$/, ''),
  }));

export type Env = z.output<typeof envSchema>;

/** Utilisé par `ConfigModule.forRoot({ validate })`. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    // Noms des variables en cause uniquement : jamais leurs valeurs (secrets).
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join('.')} : ${issue.message}`)
      .join('\n');
    throw new Error(`Configuration invalide :\n${details}`);
  }
  return result.data;
}
