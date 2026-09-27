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

  it('create : envoie le corps et le jeton, renvoie la clé créée', async () => {
    let seenAuth: string | null = null;
    let seenBody: unknown;
    server.use(
      http.post(`${BASE_URL}/api/v1/admin/licenses`, async ({ request }) => {
        seenAuth = request.headers.get('authorization');
        seenBody = await request.json();
        return HttpResponse.json({ key: 'NOUVELLE-CLE' });
      }),
    );
    const created = await client().create({
      product: 'tagcustom',
      edition: 'PREMIUM',
      customer: 'client@exemple.fr (user-1)',
      maxActivations: 5,
    });
    expect(created).toEqual({ key: 'NOUVELLE-CLE' });
    expect(seenAuth).toBe(`Bearer ${TOKEN}`);
    expect(seenBody).toEqual({
      product: 'tagcustom',
      edition: 'PREMIUM',
      customer: 'client@exemple.fr (user-1)',
      maxActivations: 5,
    });
  });

  it('create : toute erreur HTTP lève LicenseServerError', async () => {
    server.use(http.post(`${BASE_URL}/api/v1/admin/licenses`, () => new HttpResponse(null, { status: 500 })));
    await expect(
      client().create({ product: 'tagcustom', edition: 'PREMIUM', customer: 'x', maxActivations: 5 }),
    ).rejects.toThrow(LicenseServerError);
  });

  it('revoke : appelle la bonne route sans exiger de corps JSON en réponse', async () => {
    let called = false;
    server.use(
      http.post(`${BASE_URL}/api/v1/admin/licenses/ABC-123/revoke`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await expect(client().revoke('ABC-123')).resolves.toBeUndefined();
    expect(called).toBe(true);
  });

  it('revoke : une clé inconnue (404) lève LicenseNotFoundError', async () => {
    server.use(
      http.post(`${BASE_URL}/api/v1/admin/licenses/:key/revoke`, () => new HttpResponse(null, { status: 404 })),
    );
    await expect(client().revoke('inconnue')).rejects.toThrow(LicenseNotFoundError);
  });

  it('releaseActivation : appelle la bonne route', async () => {
    let called = false;
    server.use(
      http.delete(`${BASE_URL}/api/v1/admin/licenses/ABC-123/activations/install-1`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await expect(client().releaseActivation('ABC-123', 'install-1')).resolves.toBeUndefined();
    expect(called).toBe(true);
  });

  it('releaseActivation : installation inconnue (404) lève LicenseNotFoundError', async () => {
    server.use(
      http.delete(
        `${BASE_URL}/api/v1/admin/licenses/:key/activations/:installationId`,
        () => new HttpResponse(null, { status: 404 }),
      ),
    );
    await expect(client().releaseActivation('ABC-123', 'inconnue')).rejects.toThrow(LicenseNotFoundError);
  });
});
