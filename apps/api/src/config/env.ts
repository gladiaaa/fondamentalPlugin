import { z } from 'zod';

// Variables d'environnement de l'API. Validées au démarrage : une variable
// manquante ou invalide empêche l'API de démarrer, avec un message explicite.
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** Environnement fonctionnel : `local` (poste de dev), `dev` ou `prod` (VPS). */
  APP_ENV: z.enum(['local', 'dev', 'prod']).default('local'),
  /** Version déployée, `<branche>-<commit court>`, injectée au build de l'image. */
  APP_VERSION: z.string().min(1).default('local'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

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
