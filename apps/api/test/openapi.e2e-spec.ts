import { readFileSync, writeFileSync } from 'node:fs';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { buildOpenApiDocument } from '../src/openapi.js';

// `openapi.json` est le contrat de l'API pour le site. Ce test échoue s'il n'est
// plus à jour : le régénérer avec `npm run openapi -w @fondamental/api` et le versionner.
const FILE = new URL('../openapi.json', import.meta.url);

async function currentDocument(): Promise<string> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  app.setGlobalPrefix('api');
  // Version fixe : le fichier ne doit pas changer à chaque commit.
  const document = buildOpenApiDocument(app, '1.0.0');
  await app.close();
  return `${JSON.stringify(document, null, 2)}\n`;
}

describe('openapi.json', () => {
  it('est à jour', async () => {
    const expected = await currentDocument();
    if (process.env['UPDATE_OPENAPI']) {
      writeFileSync(FILE, expected);
      return;
    }
    expect(
      readFileSync(FILE, 'utf8'),
      'openapi.json est périmé : lancer `npm run openapi -w @fondamental/api` et le versionner',
    ).toBe(expected);
  });

  it('décrit les routes de comptes avec leurs corps et leurs erreurs', async () => {
    const document = JSON.parse(await currentDocument()) as {
      paths: Record<string, Record<string, { requestBody?: unknown; responses: Record<string, unknown> }>>;
    };
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/api/health',
        '/api/auth/register',
        '/api/auth/verify-email',
        '/api/auth/resend-verification',
        '/api/auth/login',
        '/api/auth/logout',
        '/api/auth/logout-all',
        '/api/auth/me',
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
        '/api/auth/change-password',
      ]),
    );
    const login = document.paths['/api/auth/login']?.['post'];
    expect(login?.requestBody).toBeDefined();
    expect(Object.keys(login?.responses ?? {})).toEqual(expect.arrayContaining(['200', '401', '403', '429']));
  });
});
