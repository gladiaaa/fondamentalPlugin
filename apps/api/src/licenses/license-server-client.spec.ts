import { ConfigService } from '@nestjs/config';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import type { Env } from '../config/env.js';
import { LicenseNotFoundError, LicenseServerClient, LicenseServerError } from './license-server-client.js';

const BASE_URL = 'https://licences.test';
const TOKEN = 'jeton-de-test';

function client(overrides: Partial<{ LICENSE_SERVER_URL: string; LICENSE_ADMIN_TOKEN: string }> = {}) {
  const values = { LICENSE_SERVER_URL: BASE_URL, LICENSE_ADMIN_TOKEN: TOKEN, ...overrides };
  const config = { get: (key: keyof typeof values) => values[key] } as unknown as ConfigService<Env, true>;
  return new LicenseServerClient(config);
}

const server = setupServer();

describe('LicenseServerClient', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('isConfigured : faux sans URL ou sans jeton', () => {
    expect(client({ LICENSE_SERVER_URL: undefined }).isConfigured).toBe(false);
    expect(client({ LICENSE_ADMIN_TOKEN: undefined }).isConfigured).toBe(false);
    expect(client().isConfigured).toBe(true);
  });

  it('get : renvoie le statut, avec le bon jeton et la bonne adresse', async () => {
    let seenAuth: string | null = null;
    server.use(
      http.get(`${BASE_URL}/api/v1/admin/licenses/ABC-123`, ({ request }) => {
        seenAuth = request.headers.get('authorization');
        return HttpResponse.json({ product: 'tag', edition: 'PREMIUM', revoked: false, activations: [] });
      }),
    );
    const status = await client().get('ABC-123');
    expect(status).toEqual({ product: 'tag', edition: 'PREMIUM', revoked: false, activations: [] });
    expect(seenAuth).toBe(`Bearer ${TOKEN}`);
  });

  it('get : une clé inconnue (404) lève LicenseNotFoundError', async () => {
    server.use(http.get(`${BASE_URL}/api/v1/admin/licenses/:key`, () => new HttpResponse(null, { status: 404 })));
    await expect(client().get('inconnue')).rejects.toThrow(LicenseNotFoundError);
  });

  it('get : toute autre erreur HTTP lève LicenseServerError (pas LicenseNotFoundError)', async () => {
    server.use(http.get(`${BASE_URL}/api/v1/admin/licenses/:key`, () => new HttpResponse(null, { status: 500 })));
    await expect(client().get('x')).rejects.toThrow(LicenseServerError);
    await expect(client().get('x')).rejects.not.toThrow(LicenseNotFoundError);
  });

  it('get : serveur injoignable lève LicenseServerError', async () => {
    server.use(http.get(`${BASE_URL}/api/v1/admin/licenses/:key`, () => HttpResponse.error()));
    await expect(client().get('x')).rejects.toThrow(LicenseServerError);
  });

  it('get : sans configuration, refuse sans appeler le réseau', async () => {
    server.use(
      http.get(`${BASE_URL}/api/v1/admin/licenses/:key`, () => {
        throw new Error('ne doit jamais être appelé');
      }),
    );
    await expect(client({ LICENSE_ADMIN_TOKEN: undefined }).get('x')).rejects.toThrow(LicenseServerError);
  });
});
