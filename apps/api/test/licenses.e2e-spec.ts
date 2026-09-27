import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { FakeLicenseServer } from './support/fake-license-server.js';
import { createTestApp, InMemoryMailer, newBrowser, STRONG_PASSWORD } from './support/app.js';

const EMAIL = 'ada@example.com';
const OTHER_EMAIL = 'grace@example.com';

describe('Licences : rattacher une clé existante (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let licenseServer: FakeLicenseServer;
  const mailer = new InMemoryMailer();

  beforeAll(async () => {
    licenseServer = new FakeLicenseServer();
    app = await createTestApp(mailer, licenseServer);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mailer.clear();
    await prisma.user.deleteMany();
    await prisma.license.deleteMany();
    licenseServer.isConfigured = true;
  });

  async function loggedInUser(email = EMAIL, password = STRONG_PASSWORD) {
    const b = newBrowser(app);
    await b.post('/api/auth/register', { email, password }).expect(202);
    await b.post('/api/auth/verify-email', { token: mailer.lastToken(email) }).expect(200);
    const res = await b.post('/api/auth/login', { email, password }).expect(200);
    return { b, csrf: res.body.csrfToken as string };
  }

  describe('GET /api/me/licenses', () => {
    it('exige une session', async () => {
      await newBrowser(app).get('/api/me/licenses').expect(401);
    });

    it('liste les licences du compte, les plus récentes en premier, sans montrer celles des autres', async () => {
      const ada = await loggedInUser();
      const grace = await loggedInUser(OTHER_EMAIL, STRONG_PASSWORD);
      licenseServer.set('ADA-1');
      licenseServer.set('ADA-2');
      licenseServer.set('GRACE-1');
      await ada.b.post('/api/me/licenses/claim', { key: 'ADA-1' }, { csrf: ada.csrf }).expect(204);
      await ada.b.post('/api/me/licenses/claim', { key: 'ADA-2' }, { csrf: ada.csrf }).expect(204);
      await grace.b.post('/api/me/licenses/claim', { key: 'GRACE-1' }, { csrf: grace.csrf }).expect(204);

      const res = await ada.b.get('/api/me/licenses').expect(200);
      expect(res.body.map((l: { key: string }) => l.key)).toEqual(['ADA-2', 'ADA-1']);
    });
  });

  describe('POST /api/me/licenses/claim', () => {
    it('exige une session et le jeton anti-CSRF', async () => {
      await newBrowser(app).post('/api/me/licenses/claim', { key: 'KEY-1' }).expect(401);
      const { b, csrf } = await loggedInUser();
      licenseServer.set('KEY-1');
      await b.post('/api/me/licenses/claim', { key: 'KEY-1' }).expect(403); // sans jeton
      await b.post('/api/me/licenses/claim', { key: 'KEY-1' }, { csrf: 'jeton-invente' }).expect(403);
      await b.post('/api/me/licenses/claim', { key: 'KEY-1' }, { csrf }).expect(204);
    });

    it('rattache une clé valide et libre', async () => {
      const { b, csrf } = await loggedInUser();
      licenseServer.set('VALID-1', { product: 'crate', edition: 'PREMIUM' });
      await b.post('/api/me/licenses/claim', { key: 'VALID-1' }, { csrf }).expect(204);
      expect((await b.get('/api/me/licenses').expect(200)).body).toHaveLength(1);
    });

    it.each([
      ['inconnue', 'INCONNUE-1', undefined],
      ['révoquée', 'REVOKED-1', { revoked: true }],
    ])('refuse une clé %s, avec le même code que les autres refus', async (_nom, key, status) => {
      const { b, csrf } = await loggedInUser();
      if (status) licenseServer.set(key, status);
      const res = await b.post('/api/me/licenses/claim', { key }, { csrf }).expect(400);
      expect(res.body.code).toBe('LICENSE_CLAIM_INVALID');
      expect(await prisma.license.count()).toBe(0);
    });

    it('refuse une clé déjà rattachée à un autre compte, avec le même code qu’une clé inconnue', async () => {
      const grace = await loggedInUser(OTHER_EMAIL, STRONG_PASSWORD);
      const ada = await loggedInUser();
      licenseServer.set('SHARED-1');
      await grace.b.post('/api/me/licenses/claim', { key: 'SHARED-1' }, { csrf: grace.csrf }).expect(204);

      const res = await ada.b.post('/api/me/licenses/claim', { key: 'SHARED-1' }, { csrf: ada.csrf }).expect(400);
      expect(res.body.code).toBe('LICENSE_CLAIM_INVALID');
      expect(await prisma.license.count({ where: { userId: (await ada.b.get('/api/auth/me')).body.user.id } })).toBe(0);
    });

    it('deux rattachements simultanés de la même clé : un seul réussit', async () => {
      const { b, csrf } = await loggedInUser();
      licenseServer.set('RACE-1');
      const results = await Promise.all([
        b.post('/api/me/licenses/claim', { key: 'RACE-1' }, { csrf }),
        b.post('/api/me/licenses/claim', { key: 'RACE-1' }, { csrf }),
      ]);
      const statuses = results.map((r) => r.status);
      expect(statuses).toContain(204);
      expect(statuses).toContain(400);
      expect(await prisma.license.count({ where: { licenseKey: 'RACE-1' } })).toBe(1);
    });

    it('sans serveur de licences configuré, refuse (503) sans toucher à la base', async () => {
      licenseServer.isConfigured = false;
      const { b, csrf } = await loggedInUser();
      const res = await b.post('/api/me/licenses/claim', { key: 'PEU-IMPORTE' }, { csrf }).expect(503);
      expect(res.body.code).toBe('LICENSE_SERVER_UNAVAILABLE');
      expect(await prisma.license.count()).toBe(0);
    });

    it.each([
      ['sans clé', {}],
      ['clé trop courte', { key: 'abc' }],
      ['caractères interdits', { key: 'clé avec espace' }],
      ['champ inconnu', { key: 'VALID-2', force: true }],
    ])('refuse un corps invalide : %s', async (_nom, body) => {
      const { b, csrf } = await loggedInUser();
      await b.post('/api/me/licenses/claim', body, { csrf }).expect(400);
    });
  });
});
