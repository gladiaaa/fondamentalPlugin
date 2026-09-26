import { defineConfig } from 'prisma/config';

// DATABASE_URL n'est nécessaire que pour les migrations : `prisma generate`
// (lancé avant le build, le lint et les tests) fonctionne sans base.
// En local, Prisma ne lit pas .env : utiliser `node --env-file=.env` ou exporter la variable.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
