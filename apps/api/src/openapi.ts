import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { CSRF_SCHEME, SESSION_SCHEME } from './common/api-docs.js';

const DESCRIPTION = `API de la boutique Fondamental Plugin, servie sous \`/api\` sur le même domaine que le site.

**À respecter dans tous les appels**
- Appels faits depuis le navigateur, sur le même domaine, avec les cookies (\`credentials: 'same-origin'\`).
- Toute requête qui modifie des données (POST, PUT, PATCH, DELETE) doit venir de l'origine du site (en-tête \`Origin\`, posé par le navigateur).
- Si la route exige une session, ces requêtes doivent aussi porter l'en-tête \`X-CSRF-Token\` (valeur \`csrfToken\` reçue à la connexion ou par \`GET /auth/me\`).
- Les champs inconnus dans un corps JSON sont refusés (400).
- Les erreurs ont toutes la forme \`ApiErrorResponse\` ; lire \`message\` et, s'il existe, \`code\`.

Guide complet : \`docs/api-front.md\`.`;

/**
 * Description OpenAPI de l'API. Sert la documentation interactive (`/api/docs`, hors
 * production) et le fichier `apps/api/openapi.json`, vérifié par un test e2e.
 * Le préfixe `/api` doit déjà être posé sur l'application.
 */
export function buildOpenApiDocument(app: INestApplication, version: string): OpenAPIObject {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('API Fondamental Plugin')
      .setDescription(DESCRIPTION)
      .setVersion(version)
      .addCookieAuth(
        '__Host-session',
        { type: 'apiKey', in: 'cookie', name: '__Host-session', description: 'Cookie de session (`session` en local), posé par `POST /auth/login`. `HttpOnly` : le JavaScript ne le lit pas.' },
        SESSION_SCHEME,
      )
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'X-CSRF-Token', description: 'Valeur de `csrfToken`, exigée sur les requêtes qui modifient des données quand la route demande une session.' },
        CSRF_SCHEME,
      )
      .build(),
  );
}
