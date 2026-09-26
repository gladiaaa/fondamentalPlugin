import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    // Seuls les avertissements et erreurs de l'API s'affichent (pas une ligne par requête).
    // Dossier des jars publiés : temporaire, jamais le vrai. Doit être fixé ici : la configuration de l'API est lue à l'import.
    env: { LOG_LEVEL: 'warn', RELEASES_DIR: join(tmpdir(), 'fondamental-e2e-releases') },
  },
});
