import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, InMemoryMailer, newBrowser, ORIGIN, STRONG_PASSWORD } from './support/app.js';

const EMAIL = 'ada@example.com';
const OTHER_EMAIL = 'grace@example.com';
const OTHER_PASSWORD = 'another-long-passphrase-2026';
const MINUTES = 60_000;
// Généré à chaque appel : évite tout mot de passe en dur dans les tests d'échec.
const wrongPassword = (): string => `x-${randomUUID()}`;

describe('Mes données : export et suppression du compte (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const mailer = new InMemoryMailer();

  beforeAll(async () => {
    app = await createTestApp(mailer);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mailer.clear();
    await prisma.user.deleteMany(); // supprime aussi sessions et jetons (cascade)
  });

  // ─── Aides ─────────────────────────────────────────────────────

  async function createVerifiedUser(email = EMAIL, password = STRONG_PASSWORD) {
    const b = newBrowser(app);
    await b.post('/api/auth/register', { email, password }).expect(202);
    await b.post('/api/auth/verify-email', { token: mailer.lastToken(email) }).expect(200);
  }

  async function loginBrowser(email = EMAIL, password = STRONG_PASSWORD) {
    const b = newBrowser(app);
    const res = await b.post('/api/auth/login', { email, password }).expect(200);
    return { b, csrf: res.body.csrfToken as string };
  }

  const userCount = (email: string) => prisma.user.count({ where: { email } });

  // ─── Export ────────────────────────────────────────────────────

  describe('GET /api/me/export', () => {
    it('exige une session', async () => {
      await newBrowser(app).get('/api/me/export').expect(401);
    });

    it('renvoie les données du compte en téléchargement, sans mise en cache', async () => {
      await createVerifiedUser();
      const { b } = await loginBrowser();
      const res = await b.get('/api/me/export').expect(200);

      expect(res.headers['content-disposition']).toBe('attachment; filename="mes-donnees-fondamental.json"');
      expect(res.headers['cache-control']).toBe('no-store');
      const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
      expect(res.body).toEqual({
        exportedAt: expect.any(String),
        account: {
          id: user.id,
          email: EMAIL,
          createdAt: user.createdAt.toISOString(),
          emailVerifiedAt: user.emailVerifiedAt!.toISOString(),
          hasPassword: true,
        },
        sessions: [{ createdAt: expect.any(String), expiresAt: expect.any(String), current: true }],
        orders: [],
        licenses: [],
        savedConfigs: [],
      });
    });

    it('contient les commandes payées, les clés de licence et les configurations enregistrées', async () => {
      await createVerifiedUser();
      const { b } = await loginBrowser();
      const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
      const product = await prisma.product.findFirstOrThrow();
      const order = (status: 'LICENSED' | 'PENDING') =>
        prisma.order.create({
          data: {
            userId: user.id,
            productId: product.id,
            stripeCheckoutSessionId: `cs_e2e_${randomUUID()}`,
            amountCents: 999,
            currency: 'eur',
            status,
          },
        });
      const paid = await order('LICENSED');
      const abandoned = await order('PENDING');
      const key = `E2E-${randomUUID()}`;
      await prisma.license.create({ data: { userId: user.id, licenseKey: key, orderId: paid.id, productId: product.id } });
      await prisma.savedConfig.create({
        data: { userId: user.id, name: 'Ma config', productSlug: product.slug, version: '1.0.0', file: 'config.yml', values: { a: 1 } },
      });

      try {
        const body = (await b.get('/api/me/export').expect(200)).body;
        expect(body.orders).toEqual([
          { id: paid.id, createdAt: expect.any(String), productSlug: product.slug, amountCents: 999, currency: 'eur', status: 'LICENSED' },
        ]);
        expect(JSON.stringify(body)).not.toContain(abandoned.id);
        expect(body.licenses).toEqual([{ key, productSlug: product.slug, claimedAt: expect.any(String), orderId: paid.id }]);
        expect(body.savedConfigs).toEqual([
          expect.objectContaining({ name: 'Ma config', productSlug: product.slug, file: 'config.yml', values: { a: 1 } }),
        ]);
      } finally {
        await prisma.license.deleteMany({ where: { licenseKey: key } });
        await prisma.order.deleteMany({ where: { id: { in: [paid.id, abandoned.id] } } });
      }
    });

    it('ne contient jamais de secret', async () => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();
      const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
      const session = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });

      const text = (await b.get('/api/me/export').expect(200)).text;
      for (const secret of [user.passwordHash!, STRONG_PASSWORD, csrf, session.id]) {
        expect(text).not.toContain(secret);
      }
      expect(text).not.toMatch(/argon2|passwordHash|tokenHash|csrf|failedLogins|lockedUntil/i);
    });

    it('distingue la session courante des autres et ignore les sessions expirées', async () => {
      await createVerifiedUser();
      await loginBrowser(); // une autre session ouverte
      const { b } = await loginBrowser();
      const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
      await loginBrowser();
      const [oldest] = await prisma.session.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
      await prisma.session.update({ where: { id: oldest!.id }, data: { expiresAt: new Date(Date.now() - MINUTES) } });

      const { sessions } = (await b.get('/api/me/export').expect(200)).body as {
        sessions: { current: boolean }[];
      };
      expect(sessions).toHaveLength(2);
      expect(sessions.filter((s) => s.current)).toHaveLength(1);
    });

    it("n'expose que les données du titulaire", async () => {
      await createVerifiedUser();
      await createVerifiedUser(OTHER_EMAIL, OTHER_PASSWORD);
      const ada = await loginBrowser();
      await loginBrowser(OTHER_EMAIL, OTHER_PASSWORD);

      const { text, body } = await ada.b.get('/api/me/export').expect(200);
      expect(body.account.email).toBe(EMAIL);
      expect(body.sessions).toHaveLength(1);
      expect(text).not.toContain(OTHER_EMAIL);
    });
  });

  // ─── Suppression ───────────────────────────────────────────────

  describe('DELETE /api/me', () => {
    it('exige une session', async () => {
      await createVerifiedUser();
      await newBrowser(app).delete('/api/me', { password: STRONG_PASSWORD }).expect(401);
      expect(await userCount(EMAIL)).toBe(1);
    });

    it("exige l'origine du site et le jeton anti-CSRF", async () => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();
      const body = { password: STRONG_PASSWORD };

      await b.delete('/api/me', body).expect(403); // sans jeton
      await b.delete('/api/me', body, { csrf: 'jeton-invente' }).expect(403);
      await b.delete('/api/me', body, { csrf, origin: 'https://evil.example' }).expect(403);
      await b.delete('/api/me', body, { csrf, origin: null }).expect(403);
      expect(await userCount(EMAIL)).toBe(1);

      await b.delete('/api/me', body, { csrf, origin: ORIGIN }).expect(204);
    });

    it('supprime le compte, ses sessions et ses liens, efface le cookie et prévient par e-mail', async () => {
      await createVerifiedUser();
      const other = await loginBrowser();
      const { b, csrf } = await loginBrowser();
      const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
      mailer.clear();

      const res = await b.delete('/api/me', { password: STRONG_PASSWORD }, { csrf }).expect(204);

      expect(String(res.headers['set-cookie'])).toMatch(/session=;/);
      expect(await userCount(EMAIL)).toBe(0);
      expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
      expect(await prisma.emailToken.count({ where: { userId: user.id } })).toBe(0);
      await b.get('/api/auth/me').expect(401);
      await other.b.get('/api/auth/me').expect(401);
      await newBrowser(app).post('/api/auth/login', { email: EMAIL, password: STRONG_PASSWORD }).expect(401);

      const mails = mailer.to(EMAIL);
      expect(mails).toHaveLength(1);
      expect(mails[0]!.subject).toContain('supprimé');
    });

    it('garde les commandes et licences d’un acheteur, détachées du compte', async () => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();
      const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
      const product = await prisma.product.findFirstOrThrow();
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          productId: product.id,
          stripeCheckoutSessionId: `cs_e2e_${randomUUID()}`,
          stripePaymentIntentId: `pi_e2e_${randomUUID()}`,
          amountCents: 999,
          currency: 'eur',
          status: 'LICENSED',
        },
      });
      const license = await prisma.license.create({
        data: { userId: user.id, licenseKey: `E2E-${randomUUID()}`, orderId: order.id, productId: product.id },
      });

      try {
        await b.delete('/api/me', { password: STRONG_PASSWORD }, { csrf }).expect(204);

        expect(await userCount(EMAIL)).toBe(0);
        // Obligation comptable et révocation possible en cas de remboursement : rien n'est effacé.
        expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).userId).toBeNull();
        expect((await prisma.license.findUniqueOrThrow({ where: { id: license.id } })).userId).toBeNull();
      } finally {
        await prisma.license.deleteMany({ where: { id: license.id } });
        await prisma.order.deleteMany({ where: { id: order.id } });
      }
    });

    it('ne touche pas aux autres comptes', async () => {
      await createVerifiedUser();
      await createVerifiedUser(OTHER_EMAIL, OTHER_PASSWORD);
      const grace = await loginBrowser(OTHER_EMAIL, OTHER_PASSWORD);
      const ada = await loginBrowser();

      await ada.b.delete('/api/me', { password: STRONG_PASSWORD }, { csrf: ada.csrf }).expect(204);

      expect(await userCount(OTHER_EMAIL)).toBe(1);
      expect((await grace.b.get('/api/auth/me').expect(200)).body.user.email).toBe(OTHER_EMAIL);
    });

    it('permet de se réinscrire ensuite avec la même adresse', async () => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();
      await b.delete('/api/me', { password: STRONG_PASSWORD }, { csrf }).expect(204);

      await createVerifiedUser();
      await loginBrowser();
    });

    it('refuse un mauvais mot de passe, garde le compte et compte l’échec', async () => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();

      const res = await b.delete('/api/me', { password: wrongPassword() }, { csrf }).expect(400);
      expect(res.body.code).toBe('CURRENT_PASSWORD_INVALID');
      expect(await userCount(EMAIL)).toBe(1);
      expect((await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } })).failedLogins).toBe(1);
      await b.get('/api/auth/me').expect(200);
      expect(mailer.to(EMAIL).some((m) => m.subject.includes('supprimé'))).toBe(false);
    });

    it('bloque le compte au 5e échec, même avec le bon mot de passe ensuite', async () => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();
      // La limite de requêtes de la route (5 par minute) coupe avant 5 essais : on part de 4 échecs déjà comptés.
      await prisma.user.update({ where: { email: EMAIL }, data: { failedLogins: 4, lastFailedLoginAt: new Date() } });

      await b.delete('/api/me', { password: wrongPassword() }, { csrf }).expect(400);
      const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
      expect(user.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

      const res = await b.delete('/api/me', { password: STRONG_PASSWORD }, { csrf }).expect(400);
      expect(res.body.code).toBe('CURRENT_PASSWORD_INVALID');
      expect(await userCount(EMAIL)).toBe(1);
    });

    it('refuse un compte sans mot de passe', async () => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();
      await prisma.user.update({ where: { email: EMAIL }, data: { passwordHash: null } });

      const res = await b.delete('/api/me', { password: STRONG_PASSWORD }, { csrf }).expect(400);
      expect(res.body.code).toBe('NO_PASSWORD');
      expect(await userCount(EMAIL)).toBe(1);
    });

    it.each([
      ['sans mot de passe', {}],
      ['mot de passe vide', { password: '' }],
      ['mot de passe qui n’est pas du texte', { password: 12345 }],
      ['champ inconnu', { password: STRONG_PASSWORD, force: true }],
    ])('refuse un corps invalide : %s', async (_nom, body) => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();
      await b.delete('/api/me', body, { csrf }).expect(400);
      expect(await userCount(EMAIL)).toBe(1);
    });

    it('deux suppressions simultanées : une seule réussit et un seul e-mail part', async () => {
      await createVerifiedUser();
      const first = await loginBrowser();
      const second = await loginBrowser();
      mailer.clear();

      const results = await Promise.all([
        first.b.delete('/api/me', { password: STRONG_PASSWORD }, { csrf: first.csrf }),
        second.b.delete('/api/me', { password: STRONG_PASSWORD }, { csrf: second.csrf }),
      ]);

      const statuses = results.map((r) => r.status);
      expect(statuses).toContain(204);
      statuses.forEach((status) => expect([204, 401]).toContain(status));
      expect(await userCount(EMAIL)).toBe(0);
      expect(mailer.to(EMAIL).filter((m) => m.subject.includes('supprimé'))).toHaveLength(1);
    });
  });
});
