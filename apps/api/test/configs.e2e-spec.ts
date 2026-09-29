import type { INestApplication } from '@nestjs/common';
import { parseDocument } from 'yaml';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { FakeLicenseServer } from './support/fake-license-server.js';
import { createTestApp, InMemoryMailer, newBrowser, STRONG_PASSWORD } from './support/app.js';

const EMAIL = 'ada@example.com';
const OTHER_EMAIL = 'grace@example.com';
const RENDER = '/api/me/configs/render';
const PASS_CONFIG = { slug: 'pass', version: '1.3.0', file: 'config.yml' };
const CRATES = { slug: 'crate', version: '1.2.1', file: 'crates.yml' };

describe('Générateur de configuration (e2e)', () => {
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
    await prisma.savedConfig.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    mailer.clear();
    await prisma.savedConfig.deleteMany();
    await prisma.license.deleteMany();
    await prisma.user.deleteMany();
    licenseServer.reset();
  });

  async function loggedInUser(email = EMAIL) {
    const b = newBrowser(app);
    await b.post('/api/auth/register', { email, password: STRONG_PASSWORD }).expect(202);
    await b.post('/api/auth/verify-email', { token: mailer.lastToken(email) }).expect(200);
    const res = await b.post('/api/auth/login', { email, password: STRONG_PASSWORD }).expect(200);
    return { b, csrf: res.body.csrfToken as string };
  }

  /** Acheteur : une clé du plugin `licenseProduct` rattachée au compte. */
  async function buyer(licenseProduct: string, key: string, email = EMAIL) {
    const user = await loggedInUser(email);
    licenseServer.set(key, { product: licenseProduct });
    await user.b.post('/api/me/licenses/claim', { key }, { csrf: user.csrf }).expect(204);
    return user;
  }

  describe('schémas (publics)', () => {
    it('liste les fichiers d’un plugin', async () => {
      const res = await newBrowser(app).get('/api/configs/crate').expect(200);
      expect(res.body.versions[0].version).toBe('1.2.1');
      expect(res.body.versions[0].files.map((f: { file: string }) => f.file)).toEqual(['config.yml', 'crates.yml']);
    });

    it('donne le schéma et les valeurs livrées avec le plugin', async () => {
      const res = await newBrowser(app).get('/api/configs/crate/1.2.1/crates.yml').expect(200);
      expect(res.body.fields.map((f: { key: string }) => f.key)).toEqual(['rarities', 'crates']);
      expect(Object.keys(res.body.defaults.crates)).toContain('vote');
    });

    it.each(['/api/configs/inconnu', '/api/configs/crate/9.9.9/crates.yml', '/api/configs/crate/1.2.1/secret.yml'])(
      '%s : 404',
      async (url) => {
        const res = await newBrowser(app).get(url).expect(404);
        expect(res.body.code).toBe('CONFIG_NOT_FOUND');
      },
    );
  });

  describe('POST /api/me/configs/render', () => {
    it('exige une session et le jeton anti-CSRF', async () => {
      await newBrowser(app).post(RENDER, { ...PASS_CONFIG, values: {} }).expect(401);
      const { b } = await buyer('pass', 'PASS-CSRF');
      await b.post(RENDER, { ...PASS_CONFIG, values: {} }).expect(403);
    });

    it('refuse (403) un compte sans licence de ce plugin', async () => {
      const { b, csrf } = await buyer('crate', 'CRATE-SEULEMENT');
      const res = await b.post(RENDER, { ...PASS_CONFIG, values: {} }, { csrf }).expect(403);
      expect(res.body.code).toBe('CONFIG_NOT_BUYER');
    });

    it('rend le fichier complet avec la clé de l’acheteur pré-remplie', async () => {
      const { b, csrf } = await buyer('pass', 'PASS-ACHETEUR-1');
      const res = await b
        .post(RENDER, { ...PASS_CONFIG, values: { server: { name: 'lobby' }, storage: { type: 'mysql' } } }, { csrf })
        .expect(200);
      expect(res.body.file).toBe('config.yml');
      const yaml = parseDocument(res.body.yaml).toJS();
      expect(yaml.license.key).toBe('PASS-ACHETEUR-1');
      expect(yaml.server.name).toBe('lobby');
      expect(yaml.storage.type).toBe('mysql');
      // Le reste du fichier livré est là, commentaires compris.
      expect(yaml.currencies.default).toBe('vault');
      expect(res.body.yaml).toContain('# Nom de CE serveur, unique sur le réseau');
    });

    it('ignore une clé de licence envoyée dans les valeurs', async () => {
      const { b, csrf } = await buyer('pass', 'PASS-VRAIE-CLE');
      const res = await b.post(RENDER, { ...PASS_CONFIG, values: { license: { key: 'AUTRE' } } }, { csrf }).expect(200);
      expect(parseDocument(res.body.yaml).toJS().license.key).toBe('PASS-VRAIE-CLE');
    });

    it('refuse (400) des valeurs hors schéma, avec un message par champ', async () => {
      const { b, csrf } = await buyer('crate', 'CRATE-INVALIDE');
      const values = { crates: { vote: { rewards: { lot: { weight: 0 } } } }, pirate: true };
      const res = await b.post(RENDER, { ...CRATES, values }, { csrf }).expect(400);
      expect(res.body.code).toBe('CONFIG_INVALID');
      expect(res.body.message).toEqual(expect.arrayContaining(['pirate : champ inconnu', 'crates.vote.rewards.lot.weight : au moins 1']));
    });

    it('une licence rattachée avant l’enregistrement de son plugin est complétée à la volée', async () => {
      const { b, csrf } = await loggedInUser();
      const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
      licenseServer.set('TAG-ANCIENNE', { product: 'tagcustom' });
      await prisma.license.create({ data: { userId: user.id, licenseKey: 'TAG-ANCIENNE' } });

      const res = await b.post(RENDER, { slug: 'tag', version: '2.1.0', file: 'config.yml', values: {} }, { csrf }).expect(200);
      expect(parseDocument(res.body.yaml).toJS().license.key).toBe('TAG-ANCIENNE');
      const license = await prisma.license.findUniqueOrThrow({ where: { licenseKey: 'TAG-ANCIENNE' }, include: { product: true } });
      expect(license.product?.slug).toBe('tag');
    });
  });

  describe('configurations enregistrées', () => {
    it('enregistre, liste, relit, modifie et supprime', async () => {
      const { b, csrf } = await buyer('crate', 'CRATE-CRUD');
      const created = await b
        .post('/api/me/configs', { ...CRATES, name: 'Lobby', values: { crates: {} } }, { csrf })
        .expect(201);
      expect(created.body).toMatchObject({ name: 'Lobby', slug: 'crate', version: '1.2.1', file: 'crates.yml', values: { crates: {} } });

      const list = await b.get('/api/me/configs').expect(200);
      expect(list.body.map((c: { id: string }) => c.id)).toEqual([created.body.id]);

      const updated = await b
        .patch(`/api/me/configs/${created.body.id}`, { name: 'Lobby 2', values: { rarities: {} } }, { csrf })
        .expect(200);
      expect(updated.body).toMatchObject({ name: 'Lobby 2', values: { rarities: {} } });

      await b.delete(`/api/me/configs/${created.body.id}`, {}, { csrf }).expect(204);
      await b.get(`/api/me/configs/${created.body.id}`).expect(404);
    });

    it('la configuration d’un autre compte répond 404', async () => {
      const ada = await buyer('crate', 'CRATE-ADA');
      const created = await ada.b.post('/api/me/configs', { ...CRATES, name: 'A', values: {} }, { csrf: ada.csrf }).expect(201);
      const grace = await buyer('crate', 'CRATE-GRACE', OTHER_EMAIL);
      await grace.b.get(`/api/me/configs/${created.body.id}`).expect(404);
      await grace.b.delete(`/api/me/configs/${created.body.id}`, {}, { csrf: grace.csrf }).expect(404);
      await grace.b.get('/api/me/configs/pas-un-uuid').expect(404);
    });

    it('refuse (403) d’enregistrer sans licence du plugin', async () => {
      const { b, csrf } = await buyer('crate', 'CRATE-SANS-PASS');
      const res = await b.post('/api/me/configs', { ...PASS_CONFIG, name: 'X', values: {} }, { csrf }).expect(403);
      expect(res.body.code).toBe('CONFIG_NOT_BUYER');
    });

    it('passer à une version inconnue répond 404', async () => {
      const { b, csrf } = await buyer('crate', 'CRATE-UPGRADE');
      const created = await b.post('/api/me/configs', { ...CRATES, name: 'A', values: {} }, { csrf }).expect(201);
      await b.post(`/api/me/configs/${created.body.id}/upgrade`, { version: '9.9.9' }, { csrf }).expect(404);
      const same = await b.post(`/api/me/configs/${created.body.id}/upgrade`, { version: '1.2.1' }, { csrf }).expect(200);
      expect(same.body.version).toBe('1.2.1');
    });
  });
});
