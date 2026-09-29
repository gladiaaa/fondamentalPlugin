import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { currentTotpCode } from '../src/admin/totp.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { FakeLicenseServer, activation } from './support/fake-license-server.js';
import { FakeStripeClient } from './support/fake-stripe-client.js';
import { createTestApp, InMemoryMailer, newBrowser, STRONG_PASSWORD } from './support/app.js';

const ADMIN_EMAIL = 'admin@example.com';
const CUSTOMER_EMAIL = 'ada@example.com';
const TEST_SLUG = 'e2e-admin-plugin';

describe('Back-office admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let licenseServer: FakeLicenseServer;
  let stripe: FakeStripeClient;
  const mailer = new InMemoryMailer();

  beforeAll(async () => {
    licenseServer = new FakeLicenseServer();
    stripe = new FakeStripeClient();
    app = await createTestApp(mailer, licenseServer, stripe);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Le journal (`admin_actions`) empêcherait les autres fichiers de tests de supprimer les comptes admin.
    await prisma.adminAction.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    mailer.clear();
    await prisma.adminAction.deleteMany();
    await prisma.order.deleteMany();
    await prisma.license.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'e2e-' } } });
    licenseServer.reset();
    stripe.isConfigured = true;
    stripe.refunded.length = 0;
  });

  async function loggedInUser(email: string, password = STRONG_PASSWORD) {
    const b = newBrowser(app);
    await b.post('/api/auth/register', { email, password }).expect(202);
    await b.post('/api/auth/verify-email', { token: mailer.lastToken(email) }).expect(200);
    const res = await b.post('/api/auth/login', { email, password }).expect(200);
    return { b, csrf: res.body.csrfToken as string, userId: res.body.user.id as string };
  }

  /** Compte admin, avec la 2FA déjà mise en place et validée pour la session courante. */
  async function loggedInAdmin(email = ADMIN_EMAIL) {
    const { b, csrf, userId } = await loggedInUser(email);
    await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
    const setup = await b.post('/api/admin/2fa/setup', {}, { csrf }).expect(201);
    const secret = setup.body.secret as string;
    await b.post('/api/admin/2fa/verify', { code: currentTotpCode(secret) }, { csrf }).expect(204);
    return { b, csrf, userId, secret };
  }

  function createProduct(overrides: Record<string, unknown> = {}) {
    return prisma.product.create({
      data: {
        slug: TEST_SLUG,
        name: 'Plugin de test',
        description: 'Pour les tests.',
        licenseProduct: 'e2e-admin-license',
        distribution: 'SINGLE_JAR',
        requirements: { platform: 'Paper 1.21.4', java: 21, dependencies: [] },
        priceCents: 1999,
        stripePriceId: 'price_e2e_admin',
        sortOrder: 999,
        ...overrides,
      },
    });
  }

  function seedOrder(userId: string, productId: string, overrides: Record<string, unknown> = {}) {
    return prisma.order.create({
      data: {
        userId,
        productId,
        stripeCheckoutSessionId: `cs_e2e_${randomUUID()}`,
        stripePaymentIntentId: `pi_e2e_${randomUUID()}`,
        amountCents: 1999,
        currency: 'eur',
        status: 'LICENSED',
        ...overrides,
      },
    });
  }

  // ─── 2FA et garde admin ─────────────────────────────────────────

  describe('2FA (fondations)', () => {
    it('POST /admin/2fa/setup : exige une session', async () => {
      await newBrowser(app).post('/api/admin/2fa/setup').expect(401);
    });

    it('POST /admin/2fa/setup : refuse un compte non admin', async () => {
      const { b, csrf } = await loggedInUser(CUSTOMER_EMAIL);
      await b.post('/api/admin/2fa/setup', {}, { csrf }).expect(403);
    });

    it('setup renvoie un secret et une adresse otpauth://, verify accepte le bon code', async () => {
      const { userId } = await loggedInUser(ADMIN_EMAIL);
      await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
      const b2 = newBrowser(app);
      const login = await b2.post('/api/auth/login', { email: ADMIN_EMAIL, password: STRONG_PASSWORD }).expect(200);
      const csrf = login.body.csrfToken as string;

      const setup = await b2.post('/api/admin/2fa/setup', {}, { csrf }).expect(201);
      expect(setup.body.secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(setup.body.otpauthUrl).toContain('otpauth://totp/');

      await b2.post('/api/admin/2fa/verify', { code: '000000' }, { csrf }).expect(400); // presque sûrement faux
      const code = currentTotpCode(setup.body.secret as string);
      await b2.post('/api/admin/2fa/verify', { code }, { csrf }).expect(204);

      expect((await prisma.user.findUnique({ where: { id: userId } }))?.totpEnabledAt).not.toBeNull();
    });

    it('verify sans setup préalable refuse (400)', async () => {
      const { userId } = await loggedInUser(ADMIN_EMAIL);
      await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
      const b2 = newBrowser(app);
      const login = await b2.post('/api/auth/login', { email: ADMIN_EMAIL, password: STRONG_PASSWORD }).expect(200);
      await b2.post('/api/admin/2fa/verify', { code: '123456' }, { csrf: login.body.csrfToken }).expect(400);
    });

    it('une route admin refuse (403) un admin dont la 2FA n’est pas validée pour cette session', async () => {
      const { userId } = await loggedInUser(ADMIN_EMAIL);
      await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
      const b2 = newBrowser(app);
      await b2.post('/api/auth/login', { email: ADMIN_EMAIL, password: STRONG_PASSWORD }).expect(200);
      const res = await b2.get('/api/admin/orders').expect(403);
      expect(res.body.code).toBe('TWO_FACTOR_REQUIRED');
    });

    it('la 2FA se revalide à chaque nouvelle session (obligatoire même pour un admin déjà configuré)', async () => {
      const admin = await loggedInAdmin();
      await admin.b.get('/api/admin/orders').expect(200); // session courante : déjà validée

      // Nouvelle connexion = nouvelle session, sans 2FA validée, même si le compte l'a déjà activée.
      const b2 = newBrowser(app);
      await b2.post('/api/auth/login', { email: ADMIN_EMAIL, password: STRONG_PASSWORD }).expect(200);
      await b2.get('/api/admin/orders').expect(403);
    });
  });

  describe('2FA : état et reconfiguration (#106)', () => {
    it('GET /admin/2fa : à mettre en place, puis activée et validée pour la session', async () => {
      const { b, csrf, userId } = await loggedInUser(ADMIN_EMAIL);
      await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
      expect((await b.get('/api/admin/2fa').expect(200)).body).toEqual({ enabled: false, verifiedForSession: false });

      const setup = await b.post('/api/admin/2fa/setup', {}, { csrf }).expect(201);
      await b.post('/api/admin/2fa/verify', { code: currentTotpCode(setup.body.secret as string) }, { csrf }).expect(204);
      expect((await b.get('/api/admin/2fa').expect(200)).body).toEqual({ enabled: true, verifiedForSession: true });

      // Nouvelle session : activée, mais pas encore validée.
      const b2 = newBrowser(app);
      await b2.post('/api/auth/login', { email: ADMIN_EMAIL, password: STRONG_PASSWORD }).expect(200);
      expect((await b2.get('/api/admin/2fa').expect(200)).body).toEqual({ enabled: true, verifiedForSession: false });
    });

    it('GET /admin/2fa : refusé à un client', async () => {
      const { b } = await loggedInUser(CUSTOMER_EMAIL);
      await b.get('/api/admin/2fa').expect(403);
    });

    it('2FA activée : setup refusé sans code validé dans la session (un mot de passe volé ne remplace pas le secret)', async () => {
      const admin = await loggedInAdmin();
      const secretBefore = (await prisma.user.findUniqueOrThrow({ where: { id: admin.userId } })).totpSecret;

      const b2 = newBrowser(app);
      const login = await b2.post('/api/auth/login', { email: ADMIN_EMAIL, password: STRONG_PASSWORD }).expect(200);
      const res = await b2.post('/api/admin/2fa/setup', {}, { csrf: login.body.csrfToken }).expect(403);
      expect(res.body.code).toBe('TWO_FACTOR_ALREADY_ENABLED');
      expect((await prisma.user.findUniqueOrThrow({ where: { id: admin.userId } })).totpSecret).toBe(secretBefore);
      await b2.get('/api/admin/orders').expect(403);
    });

    it('2FA activée et validée dans la session : reconfiguration possible (nouveau secret)', async () => {
      const admin = await loggedInAdmin();
      const setup = await admin.b.post('/api/admin/2fa/setup', {}, { csrf: admin.csrf }).expect(201);
      expect(setup.body.secret).not.toBe(admin.secret);
    });
  });

  describe('AdminGuard : refusé sans rôle admin ni 2FA (critère de fin de #32)', () => {
    it.each([
      ['sans session', () => newBrowser(app), 401],
      ['session client (pas admin)', async () => (await loggedInUser(CUSTOMER_EMAIL)).b, 403],
    ])('GET /api/admin/orders : %s', async (_nom, getBrowser, status) => {
      const b = await getBrowser();
      await b.get('/api/admin/orders').expect(status);
    });
  });

  // ─── Produits ───────────────────────────────────────────────────

  describe('Produits', () => {
    it('GET /admin/products/:slug : renvoie tous les champs, y compris ceux masqués côté public', async () => {
      await createProduct({ active: false });
      const { b } = await loggedInAdmin();
      const res = await b.get(`/api/admin/products/${TEST_SLUG}`).expect(200);
      expect(res.body).toMatchObject({ slug: TEST_SLUG, priceCents: 1999, active: false, stripePriceId: 'price_e2e_admin' });
    });

    it('PATCH : le nouveau prix se reflète immédiatement sur GET /api/products (public)', async () => {
      await createProduct({ active: true });
      const admin = await loggedInAdmin();

      const res = await admin.b.patch(`/api/admin/products/${TEST_SLUG}`, { priceCents: 2999 }, { csrf: admin.csrf }).expect(200);
      expect(res.body.priceCents).toBe(2999);

      const products = await newBrowser(app).get('/api/products').expect(200);
      const bySlug = Object.fromEntries(
        (products.body as { slug: string; price: { amountCents: number } | null }[]).map((p) => [p.slug, p]),
      );
      expect(bySlug[TEST_SLUG]?.price?.amountCents).toBe(2999);

      const actions = await prisma.adminAction.findMany({ where: { targetType: 'product', targetId: TEST_SLUG } });
      expect(actions).toHaveLength(1);
      expect(actions[0]?.action).toBe('product.update');
    });

    it('PATCH active:false retire le produit du catalogue public', async () => {
      await createProduct({ active: true });
      const admin = await loggedInAdmin();
      await admin.b.patch(`/api/admin/products/${TEST_SLUG}`, { active: false }, { csrf: admin.csrf }).expect(200);
      const products = await newBrowser(app).get('/api/products').expect(200);
      expect((products.body as { slug: string }[]).some((p) => p.slug === TEST_SLUG)).toBe(false);
    });

    it('slug inconnu : 404', async () => {
      const { b } = await loggedInAdmin();
      await b.get('/api/admin/products/e2e-inconnu').expect(404);
    });
  });

  // ─── Commandes ──────────────────────────────────────────────────

  describe('Commandes', () => {
    it('GET /admin/orders : filtre par statut et par e-mail', async () => {
      const product = await createProduct();
      const ada = await loggedInUser(CUSTOMER_EMAIL);
      const grace = await loggedInUser('grace@example.com');
      await seedOrder(ada.userId, product.id, { status: 'LICENSED' });
      await seedOrder(grace.userId, product.id, { status: 'REFUNDED' });

      const admin = await loggedInAdmin();
      const byStatus = await admin.b.get('/api/admin/orders?status=REFUNDED').expect(200);
      expect(byStatus.body).toHaveLength(1);
      expect(byStatus.body[0].userEmail).toBe('grace@example.com');

      const byEmail = await admin.b.get(`/api/admin/orders?email=${CUSTOMER_EMAIL}`).expect(200);
      expect(byEmail.body).toHaveLength(1);
      expect(byEmail.body[0].userEmail).toBe(CUSTOMER_EMAIL);
    });

    it('GET /admin/orders/:id : détail avec la clé de licence', async () => {
      const product = await createProduct();
      const ada = await loggedInUser(CUSTOMER_EMAIL);
      const order = await seedOrder(ada.userId, product.id);
      await prisma.license.create({ data: { userId: ada.userId, licenseKey: 'ADMIN-DETAIL-1', orderId: order.id } });

      const { b } = await loggedInAdmin();
      const res = await b.get(`/api/admin/orders/${order.id}`).expect(200);
      expect(res.body.licenseKey).toBe('ADMIN-DETAIL-1');
      expect(res.body.userId).toBe(ada.userId);
    });

    it('id inconnu : 404', async () => {
      const { b } = await loggedInAdmin();
      await b.get('/api/admin/orders/00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('refund : rembourse chez Stripe, révoque la licence, commande → refunded, journalisé', async () => {
      const product = await createProduct();
      const ada = await loggedInUser(CUSTOMER_EMAIL);
      const order = await seedOrder(ada.userId, product.id);
      licenseServer.set('ADMIN-REFUND-1');
      await prisma.license.create({ data: { userId: ada.userId, licenseKey: 'ADMIN-REFUND-1', orderId: order.id } });

      const admin = await loggedInAdmin();
      await admin.b.post(`/api/admin/orders/${order.id}/refund`, {}, { csrf: admin.csrf }).expect(204);

      expect(stripe.refunded).toContain(order.stripePaymentIntentId);
      expect(licenseServer.revoked).toContain('ADMIN-REFUND-1');
      expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('REFUNDED');
      expect(await prisma.license.findUnique({ where: { licenseKey: 'ADMIN-REFUND-1' } })).toBeNull();

      const actions = await prisma.adminAction.findMany({ where: { targetType: 'order', targetId: order.id } });
      expect(actions.map((a) => a.action)).toContain('order.refund');
    });

    it('refund : commande pas encore payée, refuse (400)', async () => {
      const product = await createProduct();
      const ada = await loggedInUser(CUSTOMER_EMAIL);
      const order = await seedOrder(ada.userId, product.id, { status: 'PENDING', stripePaymentIntentId: null });
      const admin = await loggedInAdmin();
      const res = await admin.b.post(`/api/admin/orders/${order.id}/refund`, {}, { csrf: admin.csrf }).expect(400);
      expect(res.body.code).toBe('ORDER_NOT_PAID');
    });

    it('resend-email : envoie la clé, journalise', async () => {
      const product = await createProduct();
      const ada = await loggedInUser(CUSTOMER_EMAIL);
      const order = await seedOrder(ada.userId, product.id);
      await prisma.license.create({ data: { userId: ada.userId, licenseKey: 'ADMIN-RESEND-1', orderId: order.id } });

      const admin = await loggedInAdmin();
      await admin.b.post(`/api/admin/orders/${order.id}/resend-email`, {}, { csrf: admin.csrf }).expect(202);

      const mails = mailer.to(CUSTOMER_EMAIL);
      expect(mails.some((m) => m.text.includes('ADMIN-RESEND-1'))).toBe(true);
      const actions = await prisma.adminAction.findMany({ where: { targetType: 'order', targetId: order.id } });
      expect(actions.map((a) => a.action)).toContain('order.resend_email');
    });

    it('resend-email : pas encore de licence, refuse (400)', async () => {
      const product = await createProduct();
      const ada = await loggedInUser(CUSTOMER_EMAIL);
      const order = await seedOrder(ada.userId, product.id, { status: 'PAID' });
      const admin = await loggedInAdmin();
      await admin.b.post(`/api/admin/orders/${order.id}/resend-email`, {}, { csrf: admin.csrf }).expect(400);
    });
  });

  // ─── Licences ───────────────────────────────────────────────────

  describe('Licences', () => {
    it('GET /admin/licenses/:key : statut global, avec le propriétaire', async () => {
      const ada = await loggedInUser(CUSTOMER_EMAIL);
      licenseServer.set('ADMIN-STATUS-1', { activations: [activation('srv-1')] });
      await prisma.license.create({ data: { userId: ada.userId, licenseKey: 'ADMIN-STATUS-1' } });

      const { b } = await loggedInAdmin();
      const res = await b.get('/api/admin/licenses/ADMIN-STATUS-1').expect(200);
      expect(res.body.ownerUserId).toBe(ada.userId);
      expect(res.body.activations).toEqual([activation('srv-1')]);
    });

    it('clé inconnue : 404', async () => {
      const { b } = await loggedInAdmin();
      await b.get('/api/admin/licenses/INCONNUE').expect(404);
    });

    it('revoke : révoque côté serveur de licences et retire la ligne du compte, journalise', async () => {
      const ada = await loggedInUser(CUSTOMER_EMAIL);
      licenseServer.set('ADMIN-REVOKE-1');
      await prisma.license.create({ data: { userId: ada.userId, licenseKey: 'ADMIN-REVOKE-1' } });

      const admin = await loggedInAdmin();
      await admin.b.post('/api/admin/licenses/ADMIN-REVOKE-1/revoke', {}, { csrf: admin.csrf }).expect(204);

      expect(licenseServer.revoked).toContain('ADMIN-REVOKE-1');
      expect(await prisma.license.findUnique({ where: { licenseKey: 'ADMIN-REVOKE-1' } })).toBeNull();
      const actions = await prisma.adminAction.findMany({ where: { targetType: 'license', targetId: 'ADMIN-REVOKE-1' } });
      expect(actions.map((a) => a.action)).toContain('license.revoke');
    });

    it('recreate : révoque l’ancienne, crée une nouvelle clé pour la même commande', async () => {
      const product = await createProduct();
      const ada = await loggedInUser(CUSTOMER_EMAIL);
      const order = await seedOrder(ada.userId, product.id);
      licenseServer.set('ADMIN-RECREATE-1', { product: 'e2e-admin-license', edition: 'PREMIUM' });
      await prisma.license.create({ data: { userId: ada.userId, licenseKey: 'ADMIN-RECREATE-1', orderId: order.id } });

      const admin = await loggedInAdmin();
      const res = await admin.b
        .post('/api/admin/licenses/ADMIN-RECREATE-1/recreate', {}, { csrf: admin.csrf })
        .expect(201);
      const newKey = res.body.key as string;

      expect(newKey).not.toBe('ADMIN-RECREATE-1');
      expect(licenseServer.revoked).toContain('ADMIN-RECREATE-1');
      const updated = await prisma.license.findUnique({ where: { orderId: order.id } });
      expect(updated?.licenseKey).toBe(newKey);
    });

    it('recreate : licence sans commande (rattachée à la main), refuse (400)', async () => {
      const ada = await loggedInUser(CUSTOMER_EMAIL);
      licenseServer.set('ADMIN-NO-ORDER-1');
      await prisma.license.create({ data: { userId: ada.userId, licenseKey: 'ADMIN-NO-ORDER-1' } });

      const admin = await loggedInAdmin();
      await admin.b.post('/api/admin/licenses/ADMIN-NO-ORDER-1/recreate', {}, { csrf: admin.csrf }).expect(400);
    });
  });
});
