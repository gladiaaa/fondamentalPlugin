import { defineConfig } from 'vitest/config';

// Tests e2e : l'API complète contre une vraie base PostgreSQL (DATABASE_URL).
// En local : `docker compose -f compose.dev.yml up -d` à la racine du dépôt.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    // Une seule base partagée : pas de fichiers en parallèle.
    fileParallelism: false,
  },
});
