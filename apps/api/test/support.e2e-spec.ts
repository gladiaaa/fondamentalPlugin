import type { INestApplication } from '@nestjs/common';
import { createTestApp, InMemoryMailer, newBrowser } from './support/app.js';

const SUPPORT_EMAIL = 'support@fondamentalplugin.fr'; // valeur par défaut de SUPPORT_EMAIL, non fixée dans .env de test

describe('Support : formulaire de contact (e2e)', () => {
  let app: INestApplication;
  const mailer = new InMemoryMailer();

  beforeAll(async () => {
    app = await createTestApp(mailer);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mailer.clear();
  });

  const validBody = { subject: 'Souci avec ma licence', email: 'client@example.com', message: 'Bonjour, ...' };

  it('exige une origine (comme les autres routes publiques qui écrivent)', async () => {
    await newBrowser(app).post('/api/support', validBody, { origin: null }).expect(403);
  });

  it('accepte un message valide (202) et le transmet à l’équipe', async () => {
    const res = await newBrowser(app).post('/api/support', validBody).expect(202);
    expect(res.body).toEqual({ message: expect.any(String) });

    const mails = mailer.to(SUPPORT_EMAIL);
    expect(mails).toHaveLength(1);
    expect(mails[0]?.subject).toBe('[Support] Souci avec ma licence');
    expect(mails[0]?.text).toContain('De : client@example.com');
    expect(mails[0]?.text).toContain('Bonjour, ...');
    expect(mails[0]?.text).not.toContain('Licence concernée');
  });

  it('inclut la clé de licence dans le message quand elle est fournie', async () => {
    await newBrowser(app).post('/api/support', { ...validBody, licenseKey: 'ABC-123' }).expect(202);
    const mails = mailer.to(SUPPORT_EMAIL);
    expect(mails[0]?.text).toContain('Licence concernée : ABC-123');
  });

  it("n'exige pas de session : fonctionne sans compte", async () => {
    await newBrowser(app).post('/api/support', validBody).expect(202);
  });

  it.each([
    ['sans sujet', { ...validBody, subject: undefined }],
    ['sujet trop long', { ...validBody, subject: 'x'.repeat(201) }],
    ['e-mail invalide', { ...validBody, email: 'pas-une-adresse' }],
    ['sans message', { ...validBody, message: undefined }],
    ['message trop long', { ...validBody, message: 'x'.repeat(5001) }],
    ['clé de licence trop courte', { ...validBody, licenseKey: 'abc' }],
    ['clé de licence invalide', { ...validBody, licenseKey: 'clé avec espace' }],
    ['champ inconnu', { ...validBody, force: true }],
  ])('refuse un corps invalide : %s', async (_nom, body) => {
    await newBrowser(app).post('/api/support', body).expect(400);
    expect(mailer.outbox).toHaveLength(0);
  });
});

describe("Support : envoi d'e-mails indisponible (e2e)", () => {
  class UnavailableMailer extends InMemoryMailer {
    override readonly isConfigured = false;
  }

  it("sans moyen d'envoi, refuse (503) sans faire semblant d'accepter", async () => {
    const app = await createTestApp(new UnavailableMailer());
    try {
      await newBrowser(app)
        .post('/api/support', { subject: 'Test', email: 'client@example.com', message: 'Bonjour' })
        .expect(503);
    } finally {
      await app.close();
    }
  });
});
